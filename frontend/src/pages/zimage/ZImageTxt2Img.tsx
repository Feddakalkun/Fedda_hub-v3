import { useState, useEffect } from 'react';
import { 
  Sparkles, Download, Maximize2, Loader2, Image as ImageIcon,
  Settings2, Hash, RefreshCw, X, DownloadCloud, ChevronRight, ChevronLeft, Eye, EyeOff
} from 'lucide-react';  
import { useToast } from '../../components/ui/Toast';
import { BACKEND_API } from '../../config/api';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { comfyService } from '../../services/comfyService';
import { LoraStack } from '../../components/image/LoraStack';
import type { SelectedLora } from '../../components/image/LoraStack';

interface GenerationStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  image?: string;
  error?: string;
}

export const ZImageTxt2Img = () => {
  const [prompt, setPrompt] = usePersistentState('zimage_prompt', '');
  const [negativePrompt, setNegativePrompt] = usePersistentState('zimage_negative', 'blurry, ugly, bad proportions, low quality, artifacts');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<GenerationStatus | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  // Parameters
  const [width, setWidth] = usePersistentState('zimage_width', 1024);
  const [height, setHeight] = usePersistentState('zimage_height', 1024);
  const [steps, setSteps] = usePersistentState('zimage_steps', 8);
  const [cfg, _setCfg] = usePersistentState('zimage_cfg', 1.5);
  const [seed, setSeed] = usePersistentState('zimage_seed', -1);
  const [loras, setLoras] = usePersistentState<SelectedLora[]>('zimage_loras', []);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  
  // Layout state
  const [panelWidth, setPanelWidth] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showGallery, setShowGallery] = useState(true);
  const [showCanvas, setShowCanvas] = useState(true);
  
  const { toast } = useToast();
  
  // Use global execution context
  const { state: execState, isDownloaderNode, progress: execProgress, lastOutputImages, lastCompletedPromptId, previewUrl } = useComfyExecution();
  
  // Load available LoRAs
  useEffect(() => {
    const load = async () => {
      try {
        const list = await comfyService.getLoras();
        setAvailableLoras(list);
      } catch (err) {
        console.error('Failed to load LoRAs', err);
      }
    };
    load();
  }, []);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(300, Math.min(1000, e.clientX));
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const [pendingPromptId, setPendingPromptId] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    if (execState !== 'idle') {
      console.log(`[Z-Image] State: ${execState}, Progress: ${execProgress}%, Node: ${isDownloaderNode ? 'Downloader' : 'Generator'}`);
    }
  }, [execState, execProgress, isDownloaderNode]);

  // Watch for completed images
  useEffect(() => {
    if (lastOutputImages && lastOutputImages.length > 0) {
       // Only process if it belongs to current or recent prompt, OR if we strictly have no image
       const isMostRecent = lastCompletedPromptId && (lastCompletedPromptId === pendingPromptId);
       
       if (isMostRecent || !currentJob?.image || currentJob?.status === 'pending') {
         console.log(`[Z-Image] Accepting image for ${lastCompletedPromptId}. Pending: ${pendingPromptId}`);
         
         const img = lastOutputImages[lastOutputImages.length - 1];
         const imageUrl = `/comfy/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
         
         setCurrentJob(prev => ({ 
           ...prev, 
           id: lastCompletedPromptId || prev?.id || 'result', 
           status: 'completed', 
           image: imageUrl 
         }));
         
         setHistory(prev => {
           if (prev.includes(imageUrl)) return prev;
           return [imageUrl, ...prev.slice(0, 19)];
         });

         setIsGenerating(false);
         setPendingPromptId(null);
         toast('Complete', 'success');
       }
    }
  }, [lastOutputImages, lastCompletedPromptId, pendingPromptId, currentJob?.image, currentJob?.status, toast]);

  // Sync isGenerating and handle Idle state
  useEffect(() => {
    if (execState === 'executing' || execState === 'done') setIsGenerating(true);
    else if (execState === 'idle') { 
      // If we are idle but have no image yet, give it a moment then stop generating
      const timer = setTimeout(() => {
        setIsGenerating(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (execState === 'error') {
       setIsGenerating(false);
       setCurrentJob(null);
       setPendingPromptId(null);
    }
  }, [execState]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setCurrentJob({ id: 'local-init', status: 'pending' });

    try {
      const response = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: 'z-image',
          params: {
            prompt,
            negative: negativePrompt,
            width,
            height,
            seed: seed === -1 ? Math.floor(Math.random() * 10000000000) : seed,
            steps,
            cfg,
            client_id: (comfyService as any).clientId,
            loras: loras.map(l => ({ name: l.name, strength: l.strength }))
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log(`[Z-Image] Generated prompt_id: ${data.prompt_id}`);
        setPendingPromptId(data.prompt_id);
        setCurrentJob({ id: data.prompt_id, status: 'pending' });
      } else {
        throw new Error(data.detail || 'Failed');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setCurrentJob(null);
      toast(error.message || 'Failed', 'error');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-[#050505] relative overflow-hidden">
      
      {/* ─── LEFT PARAMETERS PANEL ─── */}
      <div 
        className={`flex flex-col border-r border-white/5 bg-[#080808] z-20 shrink-0 transition-all duration-500 ease-in-out ${
          isCollapsed ? 'absolute -translate-x-full' : 'relative translate-x-0'
        }`}
        style={{ width: isCollapsed ? 0 : panelWidth }}
      >
        <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Z-Image
          </h2>
          <button onClick={() => setIsCollapsed(true)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center justify-between">
                <span>Prompt</span>
                <span className="text-white/10 font-mono">{prompt.length}</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Description..."
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm tracking-wide text-white/90 placeholder-white/10 resize-none min-h-[140px] focus:outline-none focus:bg-white/[0.04] focus:border-emerald-500/20 transition-all font-medium"
              />
            </div>
            
            {/* ─── LORA SELECTOR ─── */}
            <LoraStack selectedLoras={loras} setSelectedLoras={setLoras} availableLoras={availableLoras} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Maximize2 className="w-3 h-3" /> Dimensions
              </label>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Square', w: 1024, h: 1024, icon: '■' },
                  { label: 'Portrait', w: 1024, h: 1536, icon: '▯' },
                  { label: 'Landscape', w: 1536, h: 1024, icon: '▭' },
                  { label: 'Vertical', w: 896, h: 1152, icon: '▯' }
                ].map((res) => (
                  <button
                    key={res.label}
                    onClick={() => { setWidth(res.w); setHeight(res.h); }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                      width === res.w && height === res.h 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-white/[0.02] border-white/5 text-slate-50 text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.04] hover:border-white/10'
                    }`}
                  >
                    <span className="text-xl mb-1">{res.icon}</span>
                    <div className="text-[8px] font-bold truncate w-full text-center">{res.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                 <div className="flex-1 space-y-2">
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Width</span>
                    <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white/60 focus:border-emerald-500/20 outline-none" />
                 </div>
                 <div className="flex-1 space-y-2">
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Height</span>
                    <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white/60 focus:border-emerald-500/20 outline-none" />
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                   <span className="flex items-center gap-2"><Hash className="w-3 h-3" /> Steps</span>
                   <span className="text-emerald-500 font-mono text-xs">{steps}</span>
                </div>
                <input type="range" min="1" max="25" step="1" value={steps} onChange={e => setSteps(Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-full appearance-none outline-none accent-emerald-500 cursor-pointer" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between items-center">
                <span className="flex items-center gap-2"><Settings2 className="w-3 h-3" /> Seed</span>
              </label>
              <div className="flex gap-2">
                <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value))}
                  className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl py-3 px-4 text-xs font-mono focus:border-emerald-500/20 outline-none transition-all placeholder-white/5 text-white/50"
                  placeholder="Random" />
                <button onClick={() => setSeed(-1)}
                  className={`p-3 rounded-xl border transition-all ${seed === -1 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.02] border-white/5 text-slate-500'}`}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Negative</label>
              <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs tracking-wide text-white/40 focus:outline-none focus:border-white/10 transition-all resize-none min-h-[60px] font-mono" />
            </div>
          </div>

          <div className="pt-4 pb-12">
             <button
                disabled={!prompt.trim() || isGenerating}
                onClick={handleGenerate}
                className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] transition-all duration-700 flex items-center justify-center gap-4 relative overflow-hidden group shadow-2xl ${
                  !prompt.trim() || isGenerating 
                    ? 'bg-white/5 text-white/10 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-emerald-400 hover:shadow-[0_0_60px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:scale-125 transition-transform duration-500" />}
                <span>{isGenerating ? 'Running' : 'Run'}</span>
              </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div onMouseDown={() => setIsResizing(true)}
          className={`w-1 cursor-col-resize hover:bg-emerald-500/60 transition-colors z-30 absolute top-0 bottom-0`}
          style={{ left: panelWidth }} />
      )}

      {/* ─── MAIN CONTENT VIEW (CANVAS) ─── */}
      <div className={`flex-1 relative flex flex-col overflow-hidden bg-[#030303] transition-all duration-500 ${!showCanvas ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
           <div className="flex gap-4 pointer-events-auto">
              {isCollapsed && (
                <button onClick={() => setIsCollapsed(false)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setShowGallery(!showGallery)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border transition-all ${
                   showGallery ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {showGallery ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Gallery {history.length > 0 ? `(${history.length})` : ''}
              </button>
           </div>

           <div className="pointer-events-auto">
              <button 
                onClick={() => setShowCanvas(false)}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all"
                title="Hide Canvas"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
           </div>
        </div>

        {showGallery && history.length > 0 && (
          <div className="absolute top-20 left-6 right-6 h-24 z-20 flex gap-3 overflow-x-auto custom-scrollbar-hidden py-1">
             {history.map((url, i) => (
                <button key={url} onClick={() => setCurrentJob({ id: `hist-${i}`, status: 'completed', image: url })}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 transition-all transform hover:scale-105 active:scale-95 ${
                    currentJob?.image === url ? 'border-emerald-500 shadow-xl' : 'border-white/5'
                  }`}
                >
                  <img src={url} className="w-full h-full object-cover rounded-lg" alt="History" />
                </button>
              ))}
          </div>
        )}

        <div className="flex-1 relative flex items-center justify-center p-8 lg:p-16 overflow-auto">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none" />

          {currentJob?.image || (isGenerating && previewUrl) ? (
            <div className="relative group max-h-full max-w-full flex flex-col items-center">
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] border border-white/5 bg-black animate-in zoom-in-95 duration-1000">
                <img 
                  src={(isGenerating && previewUrl) || currentJob?.image} 
                  alt="View" 
                  className={`max-w-full max-h-[75vh] object-contain transition-all duration-300 ${isGenerating && previewUrl && !currentJob?.image ? 'opacity-40 blur-sm scale-95' : 'opacity-100 scale-100 blur-0'}`} 
                  style={{ aspectRatio: `${width}/${height}` }} 
                />
                
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-4 bg-black/60 backdrop-blur-2xl rounded-full border border-white/10 animate-pulse">
                       <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {!isGenerating && currentJob?.image && (
                <div className="mt-8 flex items-center gap-4 p-1.5 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/5 transition-all animate-in slide-in-from-bottom-4 duration-500">
                  <button onClick={() => window.open(currentJob.image, '_blank')} className="p-3 text-white/40 hover:text-white transition-all hover:scale-110">
                    <Download className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-white/10" />
                  <button className="p-3 text-white/40 hover:text-white transition-all hover:scale-110">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative w-40 h-40 mb-10">
                <div className={`absolute inset-0 rounded-[3rem] blur-[80px] transition-all duration-1000 ${isGenerating ? 'bg-emerald-500/10 scale-150' : 'bg-white/5'}`} />
                <div className={`relative w-full h-full rounded-[2.5rem] border flex items-center justify-center backdrop-blur-xl transition-all duration-700 ${
                  isGenerating ? 'border-emerald-500/30 bg-white/5 scale-105 shadow-[0_0_60px_rgba(16,185,129,0.15)]' : 'border-white/5 bg-white/[0.02]'
                }`}>
                  {isGenerating ? (
                    isDownloaderNode ? ( <DownloadCloud className="w-12 h-12 animate-bounce text-emerald-400" /> ) : (
                       <Loader2 className="w-12 h-12 animate-spin text-emerald-400/40" />
                    )
                  ) : <ImageIcon className="w-12 h-12 text-white/5" />}
                </div>
                {isGenerating && execProgress > 0 && (
                   <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-3 py-1 rounded-full shadow-2xl z-10 font-mono">
                     {execProgress}%
                   </div>
                 )}
              </div>
              <h3 className={`text-xl font-black transition-all duration-700 uppercase tracking-[0.5em] ${isGenerating ? 'text-white' : 'text-white/10'}`}>
                {isGenerating ? 'Generating' : 'Ready'}
              </h3>
              <p className="text-[10px] text-white/20 mt-6 font-black uppercase tracking-[0.4em]">
                {isGenerating ? (isDownloaderNode ? 'Loading Models...' : 'Processing...') : 'Set parameters & run'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── HIDDEN CANVAS RESTORE BUTTON ─── */}
      {!showCanvas && (
        <button 
          onClick={() => setShowCanvas(true)}
          className="absolute right-6 top-6 z-[40] w-12 h-12 bg-white text-black rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <Eye className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
