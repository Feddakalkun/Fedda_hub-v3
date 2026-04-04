import { useState, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { ModelDownloader } from '../ModelDownloader';
import { WorkbenchShell } from '../layout/WorkbenchShell';
import { NsfwBJTab } from './NsfwBJTab';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { comfyService } from '../../services/comfyService';

interface NsfwStudioPageProps {
    modelId?: string;
}

const isVideoFile = (name?: string) => /\.(mp4|webm|mov|mkv)$/i.test(String(name || ''));

export const NsfwStudioPage = ({ modelId }: NsfwStudioPageProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [activeVideoIndex, setActiveVideoIndex] = useState(0);
    const [hasNewVideo, setHasNewVideo] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { state, error, lastCompletedPromptId, lastOutputVideos, outputReadyCount } = useComfyExecution();

    useEffect(() => {
        if (!lastCompletedPromptId) return;

        const fetchVideos = async () => {
            try {
                // Try fast path from context first
                if (lastOutputVideos.length > 0) {
                    const urls = lastOutputVideos
                        .filter(v => isVideoFile(v.filename))
                        .map(v => comfyService.getImageUrl(v.filename, v.subfolder, v.type));
                    if (urls.length > 0) {
                        setVideoUrls(urls);
                        setActiveVideoIndex(urls.length - 1);
                        setHasNewVideo(true);
                        return;
                    }
                }

                // Fall back to history
                const history = await comfyService.getHistory(lastCompletedPromptId);
                const results = history[lastCompletedPromptId];
                if (results?.outputs) {
                    const urls: string[] = [];
                    Object.values(results.outputs).forEach((nodeOutput: any) => {
                        const collect = (arr: any[]) => arr?.forEach((v: any) => {
                            if (isVideoFile(v?.filename)) {
                                urls.push(comfyService.getImageUrl(v.filename, v.subfolder, v.type));
                            }
                        });
                        collect(nodeOutput.images);
                        collect(nodeOutput.gifs);
                        collect(nodeOutput.videos);
                    });
                    if (urls.length > 0) {
                        setVideoUrls(urls);
                        setActiveVideoIndex(urls.length - 1);
                        setHasNewVideo(true);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch NSFW video results:', err);
            }
        };

        fetchVideos();
    }, [lastCompletedPromptId, outputReadyCount, lastOutputVideos]);

    useEffect(() => {
        if (hasNewVideo) {
            const t = setTimeout(() => setHasNewVideo(false), 500);
            return () => clearTimeout(t);
        }
    }, [hasNewVideo]);

    return (
        <WorkbenchShell
            leftWidthClassName="w-[520px]"
            leftPaneClassName="p-4"
            collapsible
            collapseKey="nsfw_studio_collapsed"
            forceExpand={hasNewVideo}
            leftPane={
                <>
                    <ModelDownloader modelGroup="nsfw-generate" />
                    <div className="px-4 mt-4">
                        <div style={{ display: (modelId === 'nsfw-generate' || !modelId) ? undefined : 'none' }}>
                            <NsfwBJTab
                                isGenerating={isGenerating}
                                setIsGenerating={setIsGenerating}
                            />
                        </div>
                    </div>
                </>
            }
            rightPane={
                <div className="flex-1 flex items-center justify-center p-8">
                    {videoUrls.length > 0 ? (
                        <div className="relative max-w-full max-h-full flex flex-col items-center gap-4">
                            <video
                                ref={videoRef}
                                key={videoUrls[activeVideoIndex]}
                                src={videoUrls[activeVideoIndex]}
                                className="max-w-full max-h-[70vh] rounded-xl shadow-[0_0_60px_rgba(217,70,239,0.15)]"
                                controls
                                loop
                                autoPlay
                            />

                            {videoUrls.length > 1 && (
                                <div className="flex gap-2 flex-wrap justify-center">
                                    {videoUrls.map((_url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveVideoIndex(idx)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                                                idx === activeVideoIndex
                                                    ? 'bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            Clip {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <p className="text-[10px] text-slate-600 font-mono">
                                {videoUrls.length} clip{videoUrls.length > 1 ? 's' : ''} generated
                                · saved to <span className="text-slate-500">output/VIDEO/XXX/</span>
                            </p>
                        </div>
                    ) : (
                        <>
                            {state === 'error' && error ? (
                                <div className="max-w-xl w-full rounded-xl border border-rose-500/30 bg-rose-950/20 p-5">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300 mb-2">Execution Error</p>
                                    <p className="text-sm text-rose-100 break-words whitespace-pre-wrap">
                                        {error.nodeType ? `${error.nodeType}: ` : ''}{error.message}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/5 border border-fuchsia-500/15 flex items-center justify-center mb-2">
                                        <Flame className="w-10 h-10 text-fuchsia-500/30" />
                                    </div>
                                    <p className="tracking-[0.2em] font-light uppercase text-sm text-slate-500">Video Preview</p>
                                    <p className="text-xs text-slate-600 max-w-xs">
                                        Upload an image and click Generate to start the 4-scene sequence
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            }
        />
    );
};
