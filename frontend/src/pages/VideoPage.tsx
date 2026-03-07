// Video Page — Lipsync + Scene Builder with video preview
// Tab switching controlled by sidebar (activeSubTab), not internal tabs
import { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { LipsyncTab } from '../components/video/LipsyncTab';
import { SceneBuilderTab } from '../components/video/SceneBuilderTab';
import { useComfyExecution } from '../contexts/ComfyExecutionContext';
import { comfyService } from '../services/comfyService';

interface VideoPageProps {
    modelId: string;
    modelLabel: string;
}

export const VideoPage = ({ modelId }: VideoPageProps) => {
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [activeVideoIndex, setActiveVideoIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { lastCompletedPromptId, lastOutputVideos, outputReadyCount } = useComfyExecution();

    // When a new output is ready, try to extract video URLs
    useEffect(() => {
        if (!lastCompletedPromptId) return;

        const fetchVideos = async () => {
            try {
                // First check context-tracked videos
                if (lastOutputVideos.length > 0) {
                    const urls = lastOutputVideos.map(v =>
                        comfyService.getImageUrl(v.filename, v.subfolder, v.type)
                    );
                    setVideoUrls(urls);
                    setActiveVideoIndex(urls.length - 1);
                    return;
                }

                // Fallback: fetch from history
                const history = await comfyService.getHistory(lastCompletedPromptId);
                const results = history[lastCompletedPromptId];
                if (results?.outputs) {
                    const urls: string[] = [];
                    Object.values(results.outputs).forEach((nodeOutput: any) => {
                        if (nodeOutput.gifs) {
                            nodeOutput.gifs.forEach((v: any) =>
                                urls.push(comfyService.getImageUrl(v.filename, v.subfolder, v.type))
                            );
                        }
                        if (nodeOutput.videos) {
                            nodeOutput.videos.forEach((v: any) =>
                                urls.push(comfyService.getImageUrl(v.filename, v.subfolder, v.type))
                            );
                        }
                    });
                    if (urls.length > 0) {
                        setVideoUrls(urls);
                        setActiveVideoIndex(urls.length - 1);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch video results:', err);
            }
        };

        fetchVideos();
    }, [lastCompletedPromptId, outputReadyCount, lastOutputVideos]);

    return (
        <div className="flex h-full overflow-hidden">
            {/* LEFT: Controls — switched by sidebar sub-tab */}
            <div className="w-[380px] flex flex-col border-r border-white/5 bg-[#0d0d14]">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    <div style={{ display: modelId === 'lipsync' ? undefined : 'none' }}>
                        <LipsyncTab />
                    </div>
                    <div style={{ display: modelId === 'scene-builder' ? undefined : 'none' }}>
                        <SceneBuilderTab />
                    </div>
                </div>
            </div>

            {/* RIGHT: Video Preview */}
            <div className="flex-1 flex flex-col bg-black relative">
                <div className="flex-1 flex items-center justify-center p-8">
                    {videoUrls.length > 0 ? (
                        <div className="relative max-w-full max-h-full flex flex-col items-center gap-4">
                            <video
                                ref={videoRef}
                                key={videoUrls[activeVideoIndex]}
                                src={videoUrls[activeVideoIndex]}
                                className="max-w-full max-h-[70vh] rounded-lg shadow-[0_0_80px_rgba(255,255,255,0.08)]"
                                controls
                                loop
                                autoPlay
                            />

                            {/* Video thumbnails if multiple */}
                            {videoUrls.length > 1 && (
                                <div className="flex gap-2 flex-wrap justify-center">
                                    {videoUrls.map((_url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveVideoIndex(idx)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                                                idx === activeVideoIndex
                                                    ? 'bg-white text-black'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            Clip {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center opacity-20 flex flex-col items-center gap-4">
                            <Film className="w-16 h-16" />
                            <p className="tracking-[0.2em] font-light uppercase text-sm">Video Preview</p>
                            <p className="text-xs text-slate-500 max-w-xs">
                                Generate a lipsync video or scene to see the output here
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom info bar */}
                {videoUrls.length > 0 && (
                    <div className="h-8 border-t border-white/5 bg-[#0a0a0f] flex items-center px-4 text-[10px] text-slate-500 font-mono">
                        <span>{videoUrls.length} clip{videoUrls.length > 1 ? 's' : ''} generated</span>
                    </div>
                )}
            </div>
        </div>
    );
};
