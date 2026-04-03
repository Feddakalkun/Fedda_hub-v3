import { useState, useEffect } from 'react';
import { Loader2, Play, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
    onEnter: () => void;
}

export const LandingPage = ({ onEnter }: LandingPageProps) => {
    const [activeVideo, setActiveVideo] = useState<'bg' | 'grok'>('bg');
    const [backendOnline, setBackendOnline] = useState(false);
    const [comfyOnline, setComfyOnline] = useState(false);
    const [comfyFullyReady, setComfyFullyReady] = useState(false);
    const [startupDetail, setStartupDetail] = useState('Initializing services...');
    const [checks, setChecks] = useState(0);
    const [lastCheckedAt, setLastCheckedAt] = useState<number>(Date.now());

    const showDoneVideo = comfyOnline;
    const readyPercent = comfyOnline ? 100 : backendOnline ? 45 : 10;
    const statusLabel = showDoneVideo
        ? 'System Ready'
        : 'Starting ComfyUI — Please Wait';

    // 1. Poll for ComfyUI status
    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            try {
                let backendAlive = false;
                let detail = 'Initializing services...';

                let comfyAlive = false;
                let comfyReady = false;
                try {
                    const comfyRes = await fetch('/comfy/system_stats', { cache: 'no-store' });
                    comfyReady = comfyRes.ok;
                    comfyAlive = comfyRes.ok;
                } catch {
                    comfyReady = false;
                    comfyAlive = false;
                }

                // Fallback: allow entering as soon as ComfyUI port is up,
                // even if /system_stats is not ready yet (node registry still loading).
                if (!comfyAlive) {
                    try {
                        const comfyRoot = await fetch('/comfy/', { cache: 'no-store' });
                        comfyAlive = comfyRoot.status < 500;
                    } catch {
                        comfyAlive = false;
                    }
                }

                try {
                    const backendRes = await fetch('/api/system/node-install-status', { cache: 'no-store' });
                    backendAlive = backendRes.ok;
                } catch {
                    backendAlive = false;
                }

                if (!backendAlive) {
                    detail = 'Starting backend API service...';
                } else if (!comfyAlive) {
                    detail = 'ComfyUI startup in progress...';
                } else if (!comfyReady) {
                    detail = 'ComfyUI port is online. Loading nodes and registry...';
                } else {
                    detail = 'ComfyUI is online. System is ready.';
                }

                if (!isMounted) return;
                setBackendOnline(backendAlive);
                setComfyOnline(comfyAlive);
                setComfyFullyReady(comfyReady);
                setStartupDetail(detail);
                setChecks((prev) => prev + 1);
                setLastCheckedAt(Date.now());
            } catch {
                if (!isMounted) return;
                setBackendOnline(false);
                setComfyOnline(false);
                setComfyFullyReady(false);
                setStartupDetail('Starting backend API service...');
                setChecks((prev) => prev + 1);
                setLastCheckedAt(Date.now());
            }
        };

        const interval = setInterval(checkStatus, 2000);
        checkStatus();

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // 2. Cross-fade logic for loading videos (Using high-quality ping-pong loops)
    useEffect(() => {
        if (showDoneVideo) return;

        const fadeInterval = setInterval(() => {
            setActiveVideo(prev => prev === 'bg' ? 'grok' : 'bg');
        }, 8000);

        return () => clearInterval(fadeInterval);
    }, [showDoneVideo]);

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center font-sans">

            {/* --- LOADING VIDEOS (PING-PONG LOOPS) --- */}
            {!showDoneVideo && (
                <>
                    {/* Video A: bg.mp4 (Ping-Ponged) */}
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[3000ms] ${activeVideo === 'bg' ? 'opacity-60' : 'opacity-0'
                            }`}
                    >
                        <source src="/loading/pingpong/bg.mp4" type="video/mp4" />
                    </video>

                    {/* Video B: grok.mp4 (Ping-Ponged) */}
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[3000ms] ${activeVideo === 'grok' ? 'opacity-60' : 'opacity-0'
                            }`}
                    >
                        <source src="/loading/pingpong/grok.mp4" type="video/mp4" />
                    </video>
                </>
            )}

            {/* --- READY VIDEO (Ping-Ponged) --- */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${showDoneVideo ? 'opacity-80' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <source src="/loading/pingpong/done.mp4" type="video/mp4" />
            </video>


            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
                <div className="mb-8 animate-in fade-in zoom-in duration-1000">
                    <h1 className="text-7xl font-black text-white tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        FEDDA
                    </h1>
                    <div className="h-1 w-24 bg-white mx-auto rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                </div>

                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                    {/* Status Indicator */}
                    <div className={`w-[320px] mx-auto flex items-center justify-center gap-3 px-4 py-2 rounded-full border transition-all duration-500 ${showDoneVideo
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-500'
                        }`}>
                        {showDoneVideo ? (
                            <CheckCircle2 className="w-4 h-4 animate-pulse" />
                        ) : (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        <span className="text-xs font-bold tracking-widest uppercase text-center">
                            {statusLabel}
                        </span>
                    </div>
                    <div className="w-[320px] mx-auto -mt-3 text-[11px] text-slate-400 text-center">
                        {startupDetail}
                    </div>

                    <div className="w-[320px] bg-black/40 border border-white/10 rounded-xl p-3 text-left space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
                            <span>Startup Readiness</span>
                            <span>{readyPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-500"
                                style={{ width: `${readyPercent}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className={`rounded-md px-2 py-1.5 border ${backendOnline ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                                API: {backendOnline ? 'Online' : 'Starting'}
                            </div>
                            <div className={`rounded-md px-2 py-1.5 border ${comfyOnline ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                                ComfyUI: {comfyOnline ? (comfyFullyReady ? 'Online' : 'Port Online') : 'Starting'}
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Checks: {checks}  ·  Last ping: {new Date(lastCheckedAt).toLocaleTimeString()}
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => {
                            if (!showDoneVideo) return;
                            onEnter();
                        }}
                        disabled={!showDoneVideo}
                        className={`group relative px-12 py-5 font-black text-xl uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-lg ${
                            showDoneVideo
                                ? 'bg-white text-black hover:scale-[1.02] active:scale-95'
                                : 'bg-white/25 text-white/70 cursor-not-allowed'
                        }`}
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            Enter System <Play className="w-5 h-5 fill-current" />
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
