# AGENT_PROTOCOL (Codex <-> Claude)

Purpose: keep collaboration stable, persistent, and easy to hand off.

## 1) Scope and Repos
- Primary working repo: `H:\Final\060326\comfyuifeddafrontclean`
- Active user install: `H:\Final\060326\comfyuifeddafront`
- Preview mirror: `H:\Final\060326\comfyuifeddafront-preview`

## 2) Push Policy
- Never push unless user explicitly says: `push`.
- Default mode: implement + verify locally, then sync to active install if needed.
- If pushed: log commit hash and purpose in handoff.

## 3) Required Logs (persistent)
- `docs/AGENT_COLLAB_LOG.md` (detailed technical session log)
- `docs/ADMIN_CHANGELOG.md` (user-facing short changes)
- `docs/HANDOFF_PACKET.md` (latest transfer snapshot)

Each entry must include:
- Timestamp (Europe/Oslo): `[YYYY-MM-DD HH:mm]`
- Agent name (`Codex` or `Claude`)
- Goal/scope
- Files changed (absolute paths)
- Verification run and outcome
- Open issues/blockers
- Exact next step

## 4) Handoff Contract
- Incoming agent reads:
  1. `docs/HANDOFF_PACKET.md`
  2. `docs/AGENT_COLLAB_LOG.md` (latest section)
  3. `git status --short`
- Outgoing agent updates all 3 log files before stopping.

## 5) Validation Standard
- Backend changes: syntax/compile check.
- Frontend changes: `npm run build` in `frontend`.
- If runtime-dependent checks are not possible, log as `Pending validation`.

## 6) Safety Rules
- Do not revert unrelated user changes.
- Do not use destructive git commands (`reset --hard`, forced cleanup) unless user asks.
- Keep changes small and testable when possible.

## 7) Communication Style
- Be explicit about `Verified` vs `Assumption`.
- Prefer concrete file references over generic descriptions.
- Keep user update short, but keep logs detailed.

## 8) Collaboration Intent
Codex and Claude are both active collaborators for the same admin/user.
Both agents follow this protocol so work can continue immediately if one agent
hits limits or disconnects.

