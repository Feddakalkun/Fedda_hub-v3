import { useState, useEffect, useRef } from 'react';
import { Flame, Image as ImageIcon, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { ModelDownloader } from '../ModelDownloader';
import { WorkbenchShell } from '../layout/WorkbenchShell';
import { NsfwBJTab } from './NsfwBJTab';
import { NsfwSDXLTab } from './NsfwSDXLTab';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { comfyService } from '../../services/comfyService';

interface NsfwStudioPageProps {
    modelId?: string;
}

type OutputItem = { url: string; type: 'video' | 'image' };

const isVideoFile = (name?: string) => /\.(mp4|webm|mov|mkv)$/i.test(String(name || ''));
const isImageFile = (name?: string) => /\.(png|jpg|jpeg|webp|gif)$/i.test(String(name || ''));

export const NsfwStudioPage = ({ modelId }: NsfwStudioPageProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputs, setOutputs] = useState<OutputItem[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [hasNew, setHasNew] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { state, error, lastCompletedPromptId, lastOutputVideos, outputReadyCount } = useComfyExecution();

    // Active tab: use modelId from sidebar, default to nsfw-generate
    const activeTab = modelId === 'nsfw-sdxl' ? 'nsfw-sdxl' : 'nsfw-generate';

    useEffect(() => {
        if (!lastCompletedPromptId) return;

        const fetchOutputs = async () => {
            try {
                const collected: OutputItem[] = [];

                // Try fast path from context first (for videos)
                if (lastOutputVideos.length > 0) {
                    lastOutputVideos.forEach(v => {
                        const url = comfyService.getImageUrl(v.filename, v.subfolder, v.type);
                        if (isVideoFile(v.filename)) collected.push({ url, type: 'video' });
                        else if (isImageFile(v.filename)) collected.push({ url, type: 'image' });
                    });
                }

                // Also check history for images (not in lastOutputVideos)
                const history = await comfyService.getHistory(lastCompletedPromptId);
                const results = history[lastCompletedPromptId];
                if (results?.outputs) {
                    Object.values(results.outputs).forEach((nodeOutput: any) => {
                        const collect = (arr: any[]) => arr?.forEach((v: any) => {
                            if (!v?.filename) return;
                            const url = comfyService.getImageUrl(v.filename, v.subfolder, v.type);
                            const alreadyHave = collected.some(o => o.url === url);
                            if (alreadyHave) return;
                            if (isVideoFile(v.filename)) collected.push({ url, type: 'video' });
                            else if (isImageFile(v.filename)) collected.push({ url, type: 'image' });
                        });
                        collect(nodeOutput.images);
                        collect(nodeOutput.gifs);
                        collect(nodeOutput.videos);
                    });
                }

                if (collected.length > 0) {
                    setOutputs(collected);
                    setActiveIdx(collected.length - 1);
                    setHasNew(true);
                }
            } catch (err) {
                console.error('Failed to fetch NSFW output results:', err);
            }
        };

        fetchOutputs();
    }, [lastCompletedPromptId, outputReadyCount, lastOutputVideos]);

    useEffect(() => {
        if (hasNew) {
            const t = setTimeout(() => setHasNew(false), 500);
            return () => clearTimeout(t);
        }
    }, [hasNew]);

    const activeOutput = outputs[activeIdx];

    const handleDownload = () => {
        if (!activeOutput) return;
        const a = document.createElement('a');
        a.href = activeOutput.url;
        a.download = activeOutput.url.split('/').pop() || 'output';
        a.click();
    };

    return (
        <WorkbenchShell
            leftWidthClassName="w-[520px]"
            leftPaneClassName="p-4"
            collapsible
            collapseKey="nsfw_studio_collapsed"
            forceExpand={hasNew}
            leftPane={
                <>
                    <ModelDownloader modelGroup={activeTab === 'nsfw-sdxl' ? 'nsfw-sdxl' : 'nsfw-generate'} />
                    <div className="px-4 mt-4">
                        <div style={{ display: activeTab === 'nsfw-generate' ? undefined : 'none' }}>
                            <NsfwBJTab
                                isGenerating={isGenerating}
                                setIsGenerating={setIsGenerating}
                            />
                        </div>
                        <div style={{ display: activeTab === 'nsfw-sdxl' ? undefined : 'none' }}>
                            <NsfwSDXLTab
                                isGenerating={isGenerating}
                                setIsGenerating={setIsGenerating}
                            />
                        </div>
                    </div>
                </>
            }
            rightPane={
                <div className="flex-1 flex items-center justify-center p-8 relative">
                    {outputs.length > 0 ? (
                        <div className="relative max-w-full max-h-full flex flex-col items-center gap-4 w-full">
                            {/* Main preview */}
                            {activeOutput?.type === 'video' ? (
                                <video
                                    ref={videoRef}
                                    key={activeOutput.url}
                                    src={activeOutput.url}
                                    className="max-w-full max-h-[70vh] rounded-xl shadow-[0_0_60px_rgba(217,70,239,0.15)]"
                                    controls
                                    loop
                                    autoPlay
                                />
                            ) : (
                                <img
                                    key={activeOutput?.url}
                                    src={activeOutput?.url}
                                    alt="Generated"
                                    className="max-w-full max-h-[70vh] rounded-xl shadow-[0_0_60px_rgba(217,70,239,0.15)] object-contain"
                                />
                            )}

                            {/* Navigation + download row */}
                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                {/* Clip/image navigation */}
                                {outputs.length > 1 && (
                                    <div className="flex items-center gap-1.5 bg-black/40 rounded-xl p-1">
                                        <button
                                            onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                                            disabled={activeIdx === 0}
                                            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
                                        </button>
                                        <span className="text-xs font-mono text-slate-400 px-1">
                                            {activeIdx + 1} / {outputs.length}
                                        </span>
                                        <button
                                            onClick={() => setActiveIdx(i => Math.min(outputs.length - 1, i + 1))}
                                            disabled={activeIdx === outputs.length - 1}
                                            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                        </button>
                                    </div>
                                )}

                                {/* Thumbnail strip for multiple */}
                                {outputs.length > 1 && outputs.length <= 8 && (
                                    <div className="flex gap-1.5">
                                        {outputs.map((out, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveIdx(idx)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                                                    idx === activeIdx
                                                        ? 'bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white shadow-lg shadow-fuchsia-500/20'
                                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                {out.type === 'image' ? <ImageIcon className="w-3 h-3" /> : null}
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Download button */}
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-400 hover:text-white transition-all"
                                    title="Download current output"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Save
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-600 font-mono">
                                {outputs.length} output{outputs.length > 1 ? 's' : ''} generated
                                · saved to <span className="text-slate-500">output/</span>
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
                                    <p className="tracking-[0.2em] font-light uppercase text-sm text-slate-500">
                                        {activeTab === 'nsfw-sdxl' ? 'Image Preview' : 'Video Preview'}
                                    </p>
                                    <p className="text-xs text-slate-600 max-w-xs">
                                        {activeTab === 'nsfw-sdxl'
                                            ? 'Enter a character name and pose, then click Generate'
                                            : 'Upload an image and click Generate to start the 4-scene sequence'
                                        }
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
