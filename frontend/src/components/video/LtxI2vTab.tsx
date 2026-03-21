import { useState } from 'react';
import { X, ChevronRight, ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { comfyService } from '../../services/comfyService';
import { GalleryModal } from '../GalleryModal';
import { useToast } from '../ui/Toast';
import { usePersistentState } from '../../hooks/usePersistentState';

type PresetTier = 'fast' | 'balanced' | 'quality';

const PRESETS: Record<PresetTier, { label: string; description: string; steps: number; cfg: number; denoise: number }> = {
    fast: { label: 'Fast', description: 'Quick iterations, lower res', steps: 16, cfg: 4.0, denoise: 0.65 },
    balanced: { label: 'Balanced', description: 'Social-ready quality', steps: 24, cfg: 4.5, denoise: 0.6 },
    quality: { label: 'Quality', description: 'Hero shots, best detail', steps: 36, cfg: 4.2, denoise: 0.55 },
};

export const LtxI2vTab = () => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    // Image
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceImageName, setSourceImageName] = useState<string | null>(null);
    const [showGalleryModal, setShowGalleryModal] = useState(false);

    // Parameters
    const [prompt, setPrompt] = usePersistentState('ltx_i2v_prompt', 'A woman slowly turns her head toward the camera with a soft smile, her hair gently swaying in the breeze. The background is a warm golden-hour setting with bokeh lights.');
    const [negativePrompt, setNegativePrompt] = usePersistentState('ltx_i2v_negative_prompt', 'blurry, low quality, still frame, watermark, overlay, titles, subtitles');
    const [preset, setPreset] = usePersistentState<PresetTier>('ltx_i2v_preset', 'balanced');
    const [duration, setDuration] = usePersistentState('ltx_i2v_duration', 8);
    const [steps, setSteps] = usePersistentState('ltx_i2v_steps', PRESETS.balanced.steps);
    const [cfg, setCfg] = usePersistentState('ltx_i2v_cfg', PRESETS.balanced.cfg);
    const [denoise, setDenoise] = usePersistentState('ltx_i2v_denoise', PRESETS.balanced.denoise);
    const [seed, setSeed] = usePersistentState('ltx_i2v_seed', -1);
    const [showAdvanced, setShowAdvanced] = usePersistentState('ltx_i2v_show_advanced', false);
    const [isGenerating, setIsGenerating] = useState(false);

    const applyPreset = (tier: PresetTier) => {
        setPreset(tier);
        setSteps(PRESETS[tier].steps);
        setCfg(PRESETS[tier].cfg);
        setDenoise(PRESETS[tier].denoise);
    };

    const handleImageDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSourceImage(URL.createObjectURL(file));
            setSourceImageName(file.name);
        }
    };

    const handleGenerate = async () => {
        if (!sourceImage) {
            toast('Please upload a source image', 'error');
            return;
        }

        setIsGenerating(true);

        try {
            // Clear VRAM
            try { await comfyService.freeMemory(true, true); } catch {}

            // Upload source image
            let imageFilename = sourceImageName || 'source.png';
            if (sourceImage.startsWith('http') || sourceImage.startsWith('blob:')) {
                const imgRes = await fetch(sourceImage);
                const blob = await imgRes.blob();
                const file = new File([blob], imageFilename, { type: blob.type });
                const uploadRes = await comfyService.uploadImage(file);
                imageFilename = uploadRes.name;
            }

            // Load official LTX-2.3 single-stage workflow
            const response = await fetch(`/workflows/ltx23-single-stage-api.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load LTX 2.3 I2V workflow');
            const workflow = await response.json();

            const activeSeed = seed === -1 ? Math.floor(Math.random() * 1000000000000000) : seed;

            // --- Inject parameters into LTX-2.3 workflow ---

            // Node 2004: LoadImage (source image)
            if (workflow['2004']) workflow['2004'].inputs.image = imageFilename;

            // Node 4977: bypass_i2v = false (enable image conditioning for I2V)
            if (workflow['4977']) workflow['4977'].inputs.value = false;

            // Node 2483: CLIPTextEncode (positive prompt)
            if (workflow['2483']) workflow['2483'].inputs.text = prompt;

            // Node 2612: CLIPTextEncode (negative prompt)
            if (workflow['2612']) workflow['2612'].inputs.text = negativePrompt;

            // Node 4979: Number of frames (duration * fps)
            if (workflow['4979']) workflow['4979'].inputs.value = duration * 24 + 1;

            // Node 4814: RandomNoise (seed - distilled pass)
            if (workflow['4814']) workflow['4814'].inputs.noise_seed = activeSeed;

            // Node 4832: RandomNoise (seed - full pass)
            if (workflow['4832']) workflow['4832'].inputs.noise_seed = activeSeed + 1;

            // Node 4964: GuiderParameters VIDEO (cfg)
            if (workflow['4964']) workflow['4964'].inputs.cfg = cfg;

            // Node 4966: LTXVScheduler (steps)
            if (workflow['4966']) workflow['4966'].inputs.steps = steps;

            // Node 3159: LTXVImgToVideoConditionOnly (denoise strength)
            if (workflow['3159']) workflow['3159'].inputs.strength = denoise;

            // Node 4852: SaveVideo output prefix
            if (workflow['4852']) workflow['4852'].inputs.filename_prefix = 'VIDEO/LTX23';

            await queueWorkflow(workflow);
            toast('LTX Image-to-Video queued!', 'success');

        } catch (error: any) {
            console.error('LTX I2V generation failed:', error);
            toast(error?.message || 'Generation failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <GalleryModal
                isOpen={showGalleryModal}
                onClose={() => setShowGalleryModal(false)}
                onSelect={(url, filename) => {
                    setSourceImage(url);
                    setSourceImageName(filename);
                    setShowGalleryModal(false);
                }}
            />

            <div className="space-y-5">
                {/* Source Image Upload */}
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Source Image</label>
                    <div
                        onDrop={handleImageDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className={`relative border-2 border-dashed rounded-xl h-52 transition-all overflow-hidden ${
                            sourceImage ? 'border-white/20 bg-black' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                    >
                        {sourceImage ? (
                            <>
                                <img src={sourceImage} alt="Source" className="w-full h-full object-contain" />
                                <button
                                    onClick={() => { setSourceImage(null); setSourceImageName(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500/80 rounded-lg text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="p-3 rounded-full bg-white/5">
                                    <ImageIcon className="w-6 h-6 text-white/30" />
                                </div>
                                <p className="text-xs text-slate-500">Drag & drop source image</p>
                                <Button size="sm" variant="ghost" onClick={() => setShowGalleryModal(true)}>
                                    Browse Gallery
                                </Button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setSourceImage(URL.createObjectURL(file));
                                    setSourceImageName(file.name);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Prompt */}
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Motion Prompt</label>
                    <p className="text-[10px] text-slate-600 mb-1.5">Describe the motion and what happens next. Long, detailed prompts work best.</p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the motion, camera movement, and scene dynamics in detail..."
                        className="w-full h-24 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                    />
                </div>

                {/* Preset Picker */}
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Quality Preset</label>
                    <div className="flex gap-1 bg-black/40 rounded-lg p-1 border border-white/5">
                        {(Object.keys(PRESETS) as PresetTier[]).map((tier) => (
                            <button
                                key={tier}
                                onClick={() => applyPreset(tier)}
                                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                                    preset === tier ? 'bg-white text-black' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <div>{PRESETS[tier].label}</div>
                                <div className={`text-[9px] mt-0.5 ${preset === tier ? 'text-black/60' : 'text-slate-600'}`}>
                                    {PRESETS[tier].description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Duration</span>
                        <span className="text-white font-mono">{duration}s</span>
                    </div>
                    <input
                        type="range" min="2" max="20" value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                </div>

                {/* Advanced Settings */}
                <div className="border border-white/5 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between p-3 bg-black/20 hover:bg-black/40 transition-colors text-xs font-medium text-slate-400 hover:text-white"
                    >
                        <span>Advanced Settings</span>
                        <ChevronRight className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                    </button>
                    {showAdvanced && (
                        <div className="p-4 bg-[#0a0a0f] space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Steps</span>
                                    <span className="text-white font-mono">{steps}</span>
                                </div>
                                <input
                                    type="range" min="8" max="50" value={steps}
                                    onChange={(e) => setSteps(parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>CFG</span>
                                    <span className="text-white font-mono">{cfg.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="0.1" value={cfg}
                                    onChange={(e) => setCfg(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Denoise Strength</span>
                                    <span className="text-white font-mono">{denoise.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range" min="0.1" max="1.0" step="0.05" value={denoise}
                                    onChange={(e) => setDenoise(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Seed (-1 = random)</label>
                                <input
                                    type="number" value={seed}
                                    onChange={(e) => setSeed(parseInt(e.target.value))}
                                    className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-white/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Negative Prompt</label>
                                <textarea
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    className="w-full h-16 bg-black border border-white/5 rounded-lg p-2 text-[10px] text-slate-400 focus:outline-none focus:border-white/20 resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Generate */}
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full h-12"
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Rendering...' : 'Generate Video'}
                </Button>
            </div>
        </>
    );
};
