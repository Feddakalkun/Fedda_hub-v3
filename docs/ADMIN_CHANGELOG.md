# ADMIN CHANGELOG

---

## [2026-04-01] LTX T2V — Silent failure fixed

**Problem:** LTX Text-to-Video generated nothing, showed no error.

**Root cause:** `ComfyUI-LTXVideo` node package was outdated and didn't match the 22B model architecture.

**Fix:** `update.bat` now force-updates `ComfyUI-LTXVideo` (and RES4LYF, KJNodes) every run — not just once a week.

**Action needed:** Run `update.bat` → restart via `run.bat` → LTX T2V should work.

---

## [2026-04-01] Codex changes (unstaged in clean repo, pending commit)
- **Settings → LoRA Models tab**: New dedicated tab for LoRA management per family (Z-Image, QWEN, FLUX, etc.)
- **Sidebar**: LoRA Library removed from sidebar (now in Settings)
- **LoRADownloader**: Major rewrite of LoRA pack download/preview UX
- **Backend**: LoRA pack catalog API robustness fixes
- **install.ps1**: Additional setup steps
