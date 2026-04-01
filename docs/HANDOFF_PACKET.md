# HANDOFF PACKET — latest transfer snapshot

## [2026-04-01 19:16 Europe/Oslo] Claude → next agent

### Git state
- Repo: `H:\Final\060326\comfyuifeddafrontclean`
- Last commit: `7e82767` — Fix LoRA pack catalog 500 when remote_error is null
- Unstaged changes (Codex, not yet committed):
  - `backend/lora_service.py` (+287 lines — LoRA pack catalog rewrite)
  - `frontend/src/components/LoRADownloader.tsx` (+531 lines — major UX rewrite)
  - `frontend/src/components/ModelDownloader.tsx` (+2 lines — minor)
  - `frontend/src/components/layout/Sidebar.tsx` (-2 lines — removed LoRA Library from sidebar)
  - `frontend/src/pages/SettingsPage.tsx` (+53 lines — added LoRA Models tab, more model groups)
  - `scripts/install.ps1` (+104 lines)
- Untracked: `docs/AGENT_PROTOCOL.md`

### Install folder state (`H:\Final\060326\comfyuifeddafront`)
- AHEAD of clean repo in some files (Codex already synced there):
  - `LtxT2vTab.tsx`: has copilot prompt integration + GGUF model backend selector
  - `VideoPage.tsx`: has error display panel, VRAM free on done/error, path normalization fix
  - `ExecutionStatusBar.tsx`: minor update
  - `scripts/update_logic.ps1`: has `$CriticalNodes` force-update block (Claude, this session)
- NOTE: `scripts/update_logic.ps1` IS IDENTICAL in both repos (critical nodes fix is in both)

### Active bug fixed this session (Claude)
- **LTX T2V silent failure** — `ComfyUI-LTXVideo` node was outdated (architecture mismatch with `ltx-2.3-22b-dev.safetensors` 22B model)
- Fix: `update_logic.ps1` now force-updates `ComfyUI-LTXVideo`, `RES4LYF`, `ComfyUI-KJNodes` on every `update.bat` run (bypasses weekly throttle)
- **Status: Pending validation** — user needs to run `update.bat` from install folder, then restart via `run.bat`

### What user wants next
- Menu-by-menu UI review for consistency/bugs
- Settings + LoRA UX (Codex has major changes staged)
- Celeb pack preview/download flow
- Startup status states

### Exact next steps
1. Commit Codex's unstaged changes in clean repo
2. Sync `LtxT2vTab.tsx` + `VideoPage.tsx` improvements from install → clean repo
3. Frontend build verify after sync
4. Continue menu review starting from Settings → LoRA tab (Codex changes)
