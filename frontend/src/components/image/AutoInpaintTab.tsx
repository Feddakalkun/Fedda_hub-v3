import { useState } from 'react';
import { Wand2, ImageIcon, X, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { comfyService } from '../../services/comfyService';
import { GalleryModal } from '../GalleryModal';
import { useToast } from '../ui/Toast';
import { usePersistentState } from '../../hooks/usePersistentState';

// PersonMaskUltra toggle config
const MASK_PARTS = [
    { key: 'face',        label: 'Face',        emoji: '😶' },
    { key: 'hair',        label: 'Hair',        emoji: '💇' },
    { key: 'body',        label: 'Body',        emoji: '🧍' },
    { key: 'clothes',     label: 'Clothes',     emoji: '👗' },
    { key: 'accessories', label: 'Accessories', emoji: '💍' },
    { key: 'background',  label: 'Background',  emoji: '🌄' },
] as const;

type MaskPartKey = typeof MASK_PARTS[number]['key'];
type MaskState = Record<MaskPartKey, boolean>;

const DEFAULT_MASK: MaskState = {
    face: true,
    hair: true,
    body: false,
    clothes: false,
    accessories: false,
    background: false,
};

export const AutoInpaintTab = () => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    const [image, setImage] = useState<string | null>(null);
    const [imageName, setImageName] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);

    const [prompt, setPrompt] = usePersistentState('autoinpaint_prompt', '');
    const [negPrompt, setNegPrompt] = usePersistentState('autoinpaint_neg', '');
    const [maskParts, setMaskParts] = usePersistentState<MaskState>('autoinpaint_mask', DEFAULT_MASK);
    const [confidence, setConfidence] = usePersistentState('autoinpaint_confidence', 0.4);
    const [detailRange, setDetailRange] = usePersistentState('autoinpaint_detail_range', 16);
    const [denoise, setDenoise] = usePersistentState('autoinpaint_denoise', 0.77);
    const [steps, setSteps] = usePersistentState('autoinpaint_steps', 6);
    const [seed, setSeed] = usePersistentState('autoinpaint_seed', -1);
    const [showAdvanced, setShowAdvanced] = usePersistentState('autoinpaint_advanced', false);
    const [isGenerating, setIsGenerating] = useState(false);

    const toggleMask = (key: MaskPartKey) => {
        setMaskParts(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleGenerate = async () => {
        if (!image) { toast('Please upload an image', 'error'); return; }

        setIsGenerating(true);
        try {
            // Upload image
            let filename = imageName || 'input.png';
            if (image.startsWith('blob:') || image.startsWith('http')) {
                const res = await fetch(image);
                const blob = await res.blob();
                const file = new File([blob], filename, { type: blob.type });
                const up = await comfyService.uploadImage(file);
                filename = up.name;
            }

            const response = await fetch(`/workflows/z-image-autoinpaintv2.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load autoinpaint workflow');
            const wf = await response.json();

            const activeSeed = seed === -1 ? Math.floor(Math.random() * 1_000_000_000_000_000) : seed;
            const runTag = Date.now().toString(36);

            // Node 164: LoadImage
            if (wf['164']) wf['164'].inputs.image = filename;

            // Node 165: Prompt
            if (wf['165']) wf['165'].inputs.string = prompt;

            // Node 161: Negative (CLIPTextEncode) — inject negative text via the upstream String Literal
            // The workflow has no separate negative string literal node, but CLIPTextEncode 161 takes from styles.
            // We patch the styles node text if present.
            if (wf['34']) wf['34'].inputs.string = negPrompt;

            // Node 169: KSampler
            if (wf['169']) {
                wf['169'].inputs.seed = activeSeed;
                wf['169'].inputs.steps = steps;
                wf['169'].inputs.denoise = denoise;
            }

            // Node 173: LayerMask PersonMaskUltra
            if (wf['173']) {
                wf['173'].inputs.face = maskParts.face;
                wf['173'].inputs.hair = maskParts.hair;
                wf['173'].inputs.body = maskParts.body;
                wf['173'].inputs.clothes = maskParts.clothes;
                wf['173'].inputs.accessories = maskParts.accessories;
                wf['173'].inputs.background = maskParts.background;
                wf['173'].inputs.confidence = confidence;
                wf['173'].inputs.detail_range = detailRange;
            }

            // Node 162: SaveImage — output prefix
            if (wf['162']) wf['162'].inputs.filename_prefix = `IMAGE/ZIMAGE/INPAINT_${runTag}`;

            await queueWorkflow(wf);
            toast('AutoInpaint queued!', 'success');
        } catch (err: any) {
            toast(err?.message || 'Generation failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <GalleryModal
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                onSelect={(url, name) => { setImage(url); setImageName(name); setShowGallery(false); }}
            />

            <div className="space-y-5">
                {/* Image Upload */}
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Input Image</label>
                    <div
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setImage(URL.createObjectURL(f)); setImageName(f.name); } }}
                        onDragOver={e => e.preventDefault()}
                        className={`relative border-2 border-dashed rounded-xl h-44 transition-all overflow-hidden ${image ? 'border-white/20 bg-black' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}
                    >
                        {image ? (
                            <>
                                <img src={image} alt="Input" className="w-full h-full object-contain" />
                                <button onClick={() => { setImage(null); setImageName(null); }} className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500/80 rounded-lg text-white/70 hover:text-white transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <ImageIcon className="w-8 h-8 text-slate-600" />
                                <p className="text-[10px] text-slate-600">Drop image or click to upload</p>
                                <button onClick={() => setShowGallery(true)} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors">
                                    Browse Gallery
                                </button>
                            </div>
                        )}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={e => { const f = e.target.files?.[0]; if (f) { setImage(URL.createObjectURL(f)); setImageName(f.name); } }} />
                    </div>
                </div>

                {/* Mask Targets — PersonMaskUltra */}
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                        Mask Target <span className="text-slate-600 normal-case font-normal">· what to inpaint over</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {MASK_PARTS.map(({ key, label, emoji }) => (
                            <button
                                key={key}
                                onClick={() => toggleMask(key)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                                    maskParts[key]
                                        ? 'bg-violet-600/20 border-violet-500/50 text-violet-200'
                                        : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
                                }`}
                            >
                                <span className="text-base leading-none">{emoji}</span>
                                {label}
                                {maskParts[key] && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-600 mt-1.5">
                        Selected parts are auto-masked by AI — no manual painting needed.
                    </p>
                </div>

                {/* Prompt */}
                <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Inpaint Prompt</label>
                    <p className="text-[10px] text-slate-600 mb-1.5">Describe what to replace the masked area with.</p>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. remove person, clean background · or · red dress, silk fabric"
                        className="w-full h-20 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/40 resize-none"
                    />
                </div>

                {/* Denoise + Steps row */}
                <div className="grid grid-cols-2 gap-3 bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                    <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Denoise Strength</span>
                            <span className="font-mono text-white">{denoise.toFixed(2)}</span>
                        </div>
                        <input type="range" min="0.3" max="1.0" step="0.01" value={denoise}
                            onChange={e => setDenoise(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                        <p className="text-[9px] text-slate-600 mt-1">Low = subtle, High = complete replace</p>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Steps</span>
                            <span className="font-mono text-white">{steps}</span>
                        </div>
                        <input type="range" min="4" max="20" step="1" value={steps}
                            onChange={e => setSteps(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                        <p className="text-[9px] text-slate-600 mt-1">6–9 = fast, 12+ = detailed</p>
                    </div>
                </div>

                {/* Advanced */}
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
                            {/* Mask Confidence */}
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Mask Confidence</span>
                                    <span className="font-mono text-white">{confidence.toFixed(2)}</span>
                                </div>
                                <input type="range" min="0.1" max="0.9" step="0.01" value={confidence}
                                    onChange={e => setConfidence(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                <p className="text-[9px] text-slate-600 mt-1">Higher = stricter detection. Default 0.4</p>
                            </div>

                            {/* Detail Range */}
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Detail Range</span>
                                    <span className="font-mono text-white">{detailRange}</span>
                                </div>
                                <input type="range" min="4" max="64" step="1" value={detailRange}
                                    onChange={e => setDetailRange(parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                <p className="text-[9px] text-slate-600 mt-1">Edge feathering detail. Default 16</p>
                            </div>

                            {/* Negative Prompt */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Negative Prompt</label>
                                <textarea
                                    value={negPrompt}
                                    onChange={e => setNegPrompt(e.target.value)}
                                    className="w-full h-14 bg-black border border-white/5 rounded-lg p-2 text-[10px] text-slate-400 focus:outline-none focus:border-white/20 resize-none"
                                    placeholder="blurry, artifacts, low quality..."
                                />
                            </div>

                            {/* Seed */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Seed (-1 = random)</label>
                                <input type="number" value={seed} onChange={e => setSeed(parseInt(e.target.value))}
                                    className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-white/20" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Generate */}
                <Button variant="primary" size="lg" className="w-full h-12 bg-violet-600 hover:bg-violet-500"
                    onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Inpainting…' : 'Auto Inpaint'}
                </Button>
            </div>
        </>
    );
};
