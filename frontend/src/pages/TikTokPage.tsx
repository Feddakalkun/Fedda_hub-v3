// TikTok Page — Download, Library, Frames, Recreate
import { useState, useCallback } from 'react';
import { Download, FolderOpen, Grid3X3, Wand2 } from 'lucide-react';
import { DownloadTab } from '../components/tiktok/DownloadTab';
import { LibraryTab } from '../components/tiktok/LibraryTab';
import { FramesTab } from '../components/tiktok/FramesTab';
import { RecreateTab } from '../components/tiktok/RecreateTab';

type TikTokMode = 'download' | 'library' | 'frames' | 'recreate';

const TABS: { id: TikTokMode; label: string; icon: React.ElementType }[] = [
    { id: 'download', label: 'DOWNLOAD', icon: Download },
    { id: 'library', label: 'LIBRARY', icon: FolderOpen },
    { id: 'frames', label: 'FRAMES', icon: Grid3X3 },
    { id: 'recreate', label: 'RECREATE', icon: Wand2 },
];

interface FrameData {
    path: string;
    url: string;
    caption: string;
}

interface TikTokPageProps {
    onSendToImg2Img?: (imageUrl: string, caption: string) => void;
    onSendToInpaint?: (imageUrl: string) => void;
}

export const TikTokPage = ({ onSendToImg2Img, onSendToInpaint }: TikTokPageProps) => {
    const [activeMode, setActiveMode] = useState<TikTokMode>('download');
    const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

    // Frames state — shared between FramesTab and RecreateTab
    const [selectedVideoPath, setSelectedVideoPath] = useState<string | null>(null);
    const [selectedVideoName, setSelectedVideoName] = useState<string | null>(null);
    const [recreateFrames, setRecreateFrames] = useState<FrameData[]>([]);

    const handleExtractFrames = useCallback((videoPath: string, videoName: string) => {
        setSelectedVideoPath(videoPath);
        setSelectedVideoName(videoName);
        setActiveMode('frames');
    }, []);

    const handleDownloadComplete = useCallback(() => {
        setLibraryRefreshKey(k => k + 1);
    }, []);

    const handleSendToRecreate = useCallback((frames: FrameData[]) => {
        setRecreateFrames(frames);
        setActiveMode('recreate');
    }, []);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tab Bar */}
            <div className="px-8 pt-4 pb-0 flex gap-2">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveMode(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border border-b-0 ${
                            activeMode === id
                                ? 'bg-[#121218] text-white border-white/10'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content — two-panel layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Controls */}
                <div className="w-[420px] flex flex-col border-r border-white/5 bg-[#0d0d14]">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                        <div style={{ display: activeMode === 'download' ? undefined : 'none' }}>
                            <DownloadTab onDownloadComplete={handleDownloadComplete} />
                        </div>
                        <div style={{ display: activeMode === 'library' ? undefined : 'none' }}>
                            <LibraryTab key={libraryRefreshKey} onExtractFrames={handleExtractFrames} />
                        </div>
                        <div style={{ display: activeMode === 'frames' ? undefined : 'none' }}>
                            <FramesTab
                                videoPath={selectedVideoPath}
                                videoName={selectedVideoName}
                                onSendToImg2Img={onSendToImg2Img}
                                onSendToInpaint={onSendToInpaint}
                                onSendToRecreate={handleSendToRecreate}
                            />
                        </div>
                        <div style={{ display: activeMode === 'recreate' ? undefined : 'none' }}>
                            <RecreateTab frames={recreateFrames} />
                        </div>
                    </div>
                </div>

                {/* Right: Preview area */}
                <div className="flex-1 flex flex-col bg-black relative">
                    <div className="flex-1 flex items-center justify-center p-8">
                        {selectedVideoPath && (activeMode === 'library' || activeMode === 'frames') ? (
                            <div className="max-w-full max-h-full flex flex-col items-center gap-4">
                                <video
                                    key={selectedVideoPath}
                                    src={`http://127.0.0.1:8000/api/tiktok/serve/${encodeURIComponent(selectedVideoPath)}`}
                                    className="max-w-full max-h-[70vh] rounded-lg shadow-[0_0_80px_rgba(255,255,255,0.08)]"
                                    controls
                                    loop
                                />
                                <div className="text-xs text-slate-500 font-mono">{selectedVideoName}</div>
                            </div>
                        ) : (
                            <div className="text-center opacity-20 flex flex-col items-center gap-4">
                                <Download className="w-16 h-16" />
                                <p className="tracking-[0.2em] font-light uppercase text-sm">TikTok Studio</p>
                                <p className="text-xs text-slate-500 max-w-xs">
                                    Download TikTok videos, extract frames, caption them, and recreate scenes with your own LoRAs
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
