# AGENT COLLABORATION LOG

---

## [2026-04-01 19:16 Europe/Oslo] Claude — Session start / LTX T2V fix

### Goal
Fix LTX T2V "no output, no error" bug. Establish protocol compliance and log structure.

### Root cause identified
`ComfyUI-LTXVideo` custom node was outdated — architecture definition mismatch:
- Node expected `scale_shift_table` shape `[6, 4096]`
- `ltx-2.3-22b-dev.safetensors` (22B model) has `[9, 4096]`
- RuntimeError in `comfy/model_base.py:317` during `load_state_dict`

### Files changed
- `H:\Final\060326\comfyuifeddafront\scripts\update_logic.ps1` — Added `$CriticalNodes` block that force-updates `ComfyUI-LTXVideo`, `RES4LYF`, `ComfyUI-KJNodes` on every `update.bat` run (bypasses `$NeedNodeUpdate` weekly throttle)
- `H:\Final\060326\comfyuifeddafrontclean\scripts\update_logic.ps1` — Identical content (already synced, confirmed via diff)

### Verification
- `Verified`: Both repos have identical `update_logic.ps1` with fix
- `Pending validation`: User needs to run `update.bat` then `run.bat` to apply fix

### Other changes this session (in install folder only)
- `frontend/src/components/video/LipsyncTab.tsx`: steps default 4→14 — **reverted by user/linter back to 4**
- `frontend/src/services/comfyService.ts`: onError callback added — **reverted by user/linter**
- `frontend/src/contexts/ComfyExecutionContext.tsx`: onError handler — **reverted by user/linter**

### Observation: repo state
- Install folder (`comfyuifeddafront`) is AHEAD of clean repo in LtxT2vTab.tsx (copilot + GGUF), VideoPage.tsx (error panel, VRAM free)
- Clean repo has unstaged Codex changes in LoRADownloader, SettingsPage, lora_service.py, Sidebar, install.ps1
- **Assumption**: These should be committed and synced to install

### Open issues
- LipsyncTab steps=4 (was reverted — possibly intentional, needs clarification)
- Copilot prompt and GGUF features in install's LtxT2vTab not yet ported to clean repo
- VideoPage improvements in install not yet in clean repo

### Next step for next agent
Commit Codex's unstaged changes, then sync install's LtxT2vTab/VideoPage improvements into clean repo.
