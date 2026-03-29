"""
Social downloader service (Instagram + VSCO)
"""
import json
import time
import re
import subprocess
import threading
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests

DOWNLOADS_DIR = Path(__file__).parent.parent / "social_downloads"
LOGS_DIR = Path(__file__).parent.parent / "logs" / "social"
jobs = {}

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.chrome.service import Service as ChromeService
    from webdriver_manager.chrome import ChromeDriverManager
    HAS_SELENIUM = True
except Exception:
    HAS_SELENIUM = False


def _new_job(platform: str, url: str) -> str:
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status": "downloading",
        "platform": platform,
        "url": url,
        "progress": 0,
        "log": [],
        "files": [],
    }
    return job_id


def _append_log(job_id: str, line: str) -> None:
    if job_id not in jobs:
        return
    msg = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {line}"
    jobs[job_id]["log"].append(msg)
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        with open(LOGS_DIR / f"{job_id}.log", "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass


def _dump_debug(job_id: str, name: str, content: str) -> None:
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        (LOGS_DIR / f"{job_id}_{name}").write_text(content, encoding="utf-8", errors="ignore")
    except Exception:
        pass


def _get_ytdlp_cmd() -> str:
    base = Path(__file__).parent.parent
    embedded = base / "python_embeded" / "Scripts" / "yt-dlp.exe"
    if embedded.exists():
        return str(embedded)
    venv = base / "venv" / "Scripts" / "yt-dlp.exe"
    if venv.exists():
        return str(venv)
    return "yt-dlp"


def _cookie_args(cookie_source: str) -> list[str]:
    mapping = {
        "chrome": ["--cookies-from-browser", "chrome"],
        "edge": ["--cookies-from-browser", "edge"],
        "firefox": ["--cookies-from-browser", "firefox"],
        "cookies.txt": ["--cookies", "cookies.txt"],
    }
    return mapping.get(cookie_source, [])


def start_instagram_download(
    url: str,
    cookie_source: str = "none",
    limit: Optional[int] = None,
    pause_seconds: float = 1.5,
) -> str:
    job_id = _new_job("instagram", url)
    thread = threading.Thread(
        target=_instagram_download_thread,
        args=(job_id, url, cookie_source, limit, pause_seconds),
        daemon=True,
    )
    thread.start()
    return job_id


def _instagram_download_thread(
    job_id: str,
    url: str,
    cookie_source: str,
    limit: Optional[int],
    pause_seconds: float = 1.5,
) -> None:
    try:
        out_root = DOWNLOADS_DIR / "instagram"
        out_root.mkdir(parents=True, exist_ok=True)

        cmd = [_get_ytdlp_cmd()]
        cmd.extend(_cookie_args(cookie_source))
        cmd.extend(["--no-warnings", "--newline"])
        if limit:
            cmd.extend(["--playlist-items", f"1:{limit}"])

        # Keep best quality possible from source
        cmd.extend(["-f", "bestvideo*+bestaudio/best"])
        cmd.extend(["-P", str(out_root)])
        cmd.extend(["-o", "%(uploader|unknown)s/%(upload_date>%Y-%m-%d)s - %(id)s - %(title).100B.%(ext)s"])
        cmd.append(url)

        _append_log(job_id, f"Running: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )

        for line in iter(process.stdout.readline, ""):
            line = line.strip()
            if not line:
                continue
            _append_log(job_id, line)
            m = re.search(r"(\d+\.?\d*)%", line)
            if m:
                jobs[job_id]["progress"] = float(m.group(1))
            if "[download] Destination:" in line:
                fp = line.split("Destination:", 1)[-1].strip()
                if fp:
                    jobs[job_id]["files"].append(fp)
            elif "has already been downloaded" in line:
                fp = line.split("has already been downloaded")[0].replace("[download]", "").strip()
                if fp:
                    jobs[job_id]["files"].append(fp)

        process.wait()
        if pause_seconds > 0:
            time.sleep(min(max(pause_seconds, 0.0), 10.0))
        if process.returncode == 0:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            _append_log(job_id, "Instagram download complete.")
        else:
            jobs[job_id]["status"] = "error"
            _append_log(job_id, f"yt-dlp exited with code {process.returncode}")
    except Exception as e:
        jobs[job_id]["status"] = "error"
        _append_log(job_id, f"Error: {e}")


def start_vsco_download(url: str, visible_browser: bool = False, pause_seconds: float = 1.5) -> str:
    job_id = _new_job("vsco", url)
    thread = threading.Thread(
        target=_vsco_download_thread,
        args=(job_id, url, visible_browser, pause_seconds),
        daemon=True,
    )
    thread.start()
    return job_id


def _extract_vsco_state(html: str) -> dict:
    m = re.search(r"window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});", html, re.S)
    if not m:
        raise ValueError("VSCO state not found on page")
    return json.loads(m.group(1))


def _extract_vsco_site_id(html: str) -> Optional[str]:
    patterns = [
        r'"siteCollectionId":"([^"]+)"',
        r'"siteId":"([^"]+)"',
    ]
    for pat in patterns:
        m = re.search(pat, html)
        if m:
            return m.group(1)
    return None


def _open_browser(url: str, headless: bool = True):
    opts = ChromeOptions()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,2200")
    opts.add_argument("--lang=en-US")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    driver = webdriver.Chrome(
        service=ChromeService(ChromeDriverManager().install()),
        options=opts,
    )
    driver.get("https://vsco.co/")
    import time
    time.sleep(1.5)
    driver.get(url)
    import time
    time.sleep(6)
    return driver


def _browser_fetch_json(driver, path: str) -> dict:
    script = """
const done = arguments[0];
const path = arguments[1];
fetch(path, { credentials: 'include' })
  .then(r => r.text().then(t => ({ ok: r.ok, status: r.status, text: t })))
  .then(x => done(x))
  .catch(e => done({ ok: false, status: 0, text: String(e) }));
"""
    result = driver.execute_async_script(script, path)
    if not result.get("ok"):
        raise ValueError(f"VSCO browser fetch failed ({result.get('status')}): {result.get('text','')[:200]}")
    return json.loads(result.get("text") or "{}")


def _guess_vsco_profile(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if host.endswith("vsco.co"):
        sub = host.split(".")[0]
        if sub and sub != "www":
            return sub
    path = parsed.path.strip("/").split("/")
    return path[0] if path and path[0] else f"vsco_{uuid.uuid4().hex[:6]}"


def _vsco_download_thread(
    job_id: str,
    url: str,
    visible_browser: bool = False,
    pause_seconds: float = 1.5,
) -> None:
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,no;q=0.8",
            "Referer": "https://vsco.co/",
        }
        html = ""
        driver = None
        browser_mode = False
        try:
            resp = requests.get(url, headers=headers, timeout=20)
            if resp.status_code == 403:
                raise requests.HTTPError("403")
            resp.raise_for_status()
            html = resp.text
        except Exception:
            if not HAS_SELENIUM:
                raise ValueError(
                    "VSCO blocked direct access (403). Install selenium + webdriver-manager for browser fallback."
                )
            mode = "visible browser" if visible_browser else "headless browser"
            _append_log(job_id, f"VSCO returned 403. Trying {mode} fallback (selenium)...")
            driver = _open_browser(url, headless=not visible_browser)
            browser_mode = True
            html = driver.page_source
            _dump_debug(job_id, "vsco_browser_page.html", html[:2_000_000])

        profile_name = _guess_vsco_profile(url)
        site_id = _extract_vsco_site_id(html)
        if not site_id:
            _dump_debug(job_id, "vsco_no_site_id.html", html[:2_000_000])
            raise ValueError("Could not resolve VSCO site id")

        out_dir = DOWNLOADS_DIR / "vsco" / profile_name
        out_dir.mkdir(parents=True, exist_ok=True)

        medias = []
        cursor = ""
        if browser_mode and driver is not None:
            while True:
                api_path = f"/api/2.0/sites/{site_id}/medias?size=100&page=1&cursor={cursor}"
                data = _browser_fetch_json(driver, api_path)
                chunk = data.get("medias") or []
                medias.extend(chunk)
                cursor = data.get("next_cursor") or ""
                if not cursor:
                    break
        else:
            with requests.Session() as s:
                while True:
                    api = f"https://vsco.co/api/2.0/sites/{site_id}/medias?size=100&page=1&cursor={cursor}"
                    api_headers = dict(headers)
                    api_headers["Accept"] = "application/json, text/plain, */*"
                    api_headers["x-requested-with"] = "XMLHttpRequest"
                    r = s.get(api, headers=api_headers, timeout=20)
                    r.raise_for_status()
                    data = r.json()
                    chunk = data.get("medias") or []
                    medias.extend(chunk)
                    cursor = data.get("next_cursor") or ""
                    if not cursor:
                        break

        total = len(medias)
        if total == 0:
            raise ValueError("No VSCO media found")

        with requests.Session() as s:
            for idx, media in enumerate(medias, start=1):
                media_url = (
                    media.get("image_url")
                    or media.get("video_url")
                    or media.get("responsive_url")
                    or ""
                )
                if not media_url:
                    continue
                if media_url.startswith("//"):
                    media_url = "https:" + media_url
                elif media_url.startswith("/"):
                    media_url = "https://vsco.co" + media_url

                filename = media_url.split("?")[0].split("/")[-1] or f"media_{idx}.jpg"
                dest = out_dir / filename
                if dest.exists() and dest.stat().st_size > 0:
                    jobs[job_id]["files"].append(str(dest))
                    jobs[job_id]["progress"] = int((idx / total) * 100)
                    continue

                rr = s.get(media_url, headers=headers, timeout=30, stream=True)
                rr.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in rr.iter_content(chunk_size=1024 * 128):
                        if chunk:
                            f.write(chunk)
                jobs[job_id]["files"].append(str(dest))
                jobs[job_id]["progress"] = int((idx / total) * 100)
                _append_log(job_id, f"Downloaded {idx}/{total}: {filename}")
                if pause_seconds > 0:
                    time.sleep(min(max(pause_seconds, 0.0), 10.0))

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        _append_log(job_id, "VSCO download complete.")
    except Exception as e:
        jobs[job_id]["status"] = "error"
        _append_log(job_id, f"Error: {e}")
        try:
            _dump_debug(job_id, "vsco_error.json", json.dumps({"error": str(e)}, ensure_ascii=False, indent=2))
        except Exception:
            pass
    finally:
        try:
            if "driver" in locals() and driver is not None:
                driver.quit()
        except Exception:
            pass


def get_download_status(job_id: str) -> dict:
    return jobs.get(job_id, {"status": "not_found"})
