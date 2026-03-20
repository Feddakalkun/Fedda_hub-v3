# FEDDA AI Studio

**One-click AI creative studio** — Image generation, video, audio, and chat powered by ComfyUI with a modern React frontend.

No terminal. No Python setup. No workflow spaghetti. Just click and create.

[![Deploy on RunPod](https://img.shields.io/badge/Deploy%20on-RunPod-6B4FBB?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMMTIgMjJMMjAgMTdWN0wxMiAyWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://runpod.io/console/deploy?template=yvrm5pr0wb)

---

## What You Get

- **Image Generation** — Z-Image (Flux), Qwen Multi-Angle (product shots, character sheets, MLS listings)
- **Video/VFX** — WAN 2.1 video generation, lipsync, scene builder with LoRA support
- **Audio/SFX** — ACE-Step music generation, TTS with multiple engines
- **AI Chat** — Local LLM chat via Ollama (local) or IF_AI_tools (cloud)
- **Gallery** — Browse, download, and manage all generated content
- **Model Manager** — One-click model downloads with progress tracking

## Quick Start

### Cloud (RunPod) — Recommended

Click the deploy button above, pick a GPU (RTX 4090+ recommended), and you're live in ~3 minutes. Models download on-demand through the UI.

### Local (Windows)

```
git clone https://github.com/Feddakalkun/comfyuifeddafront
cd comfyuifeddafront
.\install.bat
```

Follow the prompts. Everything installs automatically — Python, Node, ComfyUI, models.
Then run `run.bat` to start.

## Screenshots

| Image Generation | Video/VFX | Settings |
|:---:|:---:|:---:|
| Multi-angle product shots | WAN 2.1 video gen | One-click model downloads |

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS |
| Backend | FastAPI (Python) |
| AI Engine | ComfyUI with custom nodes |
| Deployment | Docker + nginx + supervisord |
| GPU | CUDA 12.4, PyTorch, xformers |

## Architecture

```
Port 3000 (nginx)
  ├── /          → React frontend
  ├── /api/      → FastAPI backend
  ├── /comfy/    → ComfyUI API
  └── /jupyter/  → JupyterLab
```

## Requirements

- **Cloud**: Any RunPod GPU pod (16GB+ VRAM recommended)
- **Local**: Windows 10/11, NVIDIA GPU (8GB+ VRAM), ~20GB disk space

## License

MIT
