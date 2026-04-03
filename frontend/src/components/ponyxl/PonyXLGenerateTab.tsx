import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { useToast } from '../ui/Toast';
import { comfyService } from '../../services/comfyService';
import { usePersistentState } from '../../hooks/usePersistentState';
import { LoraStack } from '../image/LoraStack';
import type { SelectedLora } from '../image/LoraStack';
import { PromptInput } from '../image/PromptInput';

interface PonyXLGenerateTabProps {
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
}

const CHECKPOINTS = [
    'CyberRealisticPony_V14.1_FP16.safetensors',
    'blendermix_v20.safetensors',
    'mistoonAnime_ponyAlpha.safetensors',
    'realvisxlV40_v40LightningBakedvae.safetensors',
];

const ASPECT_RATIOS = [
    { label: '2:3 Portrait', ratio: '2:3', w: 832, h: 1216 },
    { label: '1:1 Square', ratio: '1:1', w: 1024, h: 1024 },
    { label: '3:2 Landscape', ratio: '3:2', w: 1216, h: 832 },
    { label: '9:16 Mobile', ratio: '9:16', w: 768, h: 1344 },
    { label: '16:9 Wide', ratio: '16:9', w: 1344, h: 768 },
];

const DEFAULT_NEGATIVE = 'score_6, score_5, score_4, tan line, muscular, censored, furry, child, kid, teen, chibi, watermark, text, verybadimagenegative_v1.3, boring composition, boring perspective, simple background, bad_hands, bad_feet, deformed, malformed, missing_limbs, extra_limbs, missing_digits, missing_fingers, bad_fingers, white background, realistic, 2d, birthmarks, spots, moles, 2girls, multiple girls';

export const PonyXLGenerateTab = ({ isGenerating, setIsGenerating }: PonyXLGenerateTabProps) => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    const [prompt, setPrompt] = usePersistentState('ponyxl_generate_prompt', '');
    const [negativePrompt, setNegativePrompt] = usePersistentState('ponyxl_generate_negative', DEFAULT_NEGATIVE);
    const [checkpoint, setCheckpoint] = usePersistentState('ponyxl_generate_checkpoint', CHECKPOINTS[0]);
    const [aspectIdx, setAspectIdx] = usePersistentState('ponyxl_generate_aspect_idx', 0);
    const [steps, setSteps] = usePersistentState('ponyxl_generate_steps', 15);
    const [cfg, setCfg] = usePersistentState('ponyxl_generate_cfg', 5);
    const [seed, setSeed] = usePersistentState('ponyxl_generate_seed', -1);
    const [faceEnhance, setFaceEnhance] = usePersistentState('ponyxl_generate_face_enhance', true);
    const [selectedLoras, setSelectedLoras] = usePersistentState<SelectedLora[]>('ponyxl_generate_loras', []);
    const [showAdvanced, setShowAdvanced] = usePersistentState('ponyxl_generate_show_advanced', false);
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);

    useEffect(() => {
        comfyService.getLoras().then(setAvailableLoras).catch(() => {});
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const response = await fetch(`/workflows/ponyxl-generate.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load PonyXL workflow');
            const workflow = await response.json();

            const activeSeed = seed >= 0 ? seed : Math.floor(Math.random() * 1000000000000000);
            const aspect = ASPECT_RATIOS[aspectIdx] || ASPECT_RATIOS[0];

            // Node 210: CheckpointLoaderSimple
            if (workflow['210']) workflow['210'].inputs.ckpt_name = checkpoint;

            // Node 214: positive prompt
            if (workflow['214']) workflow['214'].inputs.text = prompt;

            // Node 215: negative prompt
            if (workflow['215']) workflow['215'].inputs.text = negativePrompt;

            // Node 216: KSampler (main)
            if (workflow['216']) {
                workflow['216'].inputs.seed = activeSeed;
                workflow['216'].inputs.steps = steps;
                workflow['216'].inputs.cfg = cfg;
            }

            // Node 285: AspectRatioImageSize — controls output resolution
            if (workflow['285']) {
                workflow['285'].inputs.width = aspect.w;
                workflow['285'].inputs.height = aspect.h;
                workflow['285'].inputs.aspect_ratio = aspect.ratio;
            }

            // Node 245: Power Lora Loader
            if (workflow['245'] && selectedLoras.length > 0) {
                selectedLoras.slice(0, 5).forEach((l, i) => {
                    workflow['245'].inputs[`lora_${i + 1}`] = { on: true, lora: l.name, strength: l.strength };
                });
            }

            // Node 254: FaceDetailer — disable by setting impossibly high threshold
            if (workflow['254'] && !faceEnhance) {
                workflow['254'].inputs.bbox_threshold = 1.0;
            }

            // Node 251: SaveImage prefix
            if (workflow['251']) workflow['251'].inputs.filename_prefix = 'IMAGE/PONYXL';

            await queueWorkflow(workflow);
        } catch (error: any) {
            console.error('PonyXL generation failed:', error);
            toast(error?.message || 'Generation failed', 'error');
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <PromptInput
                prompt={prompt}
                setPrompt={setPrompt}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                showNegative={false}
                loraNames={selectedLoras.map((l) => l.name)}
            />

            {/* Advanced */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-6 shadow-xl">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    <span>Advanced Settings</span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Model</label>
                            <div className="space-y-1.5">
                                {CHECKPOINTS.map(ckpt => (
                                    <button
                                        key={ckpt}
                                        onClick={() => setCheckpoint(ckpt)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                                            checkpoint === ckpt
                                                ? 'bg-white text-black font-bold'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        {ckpt.replace('.safetensors', '')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Aspect Ratio</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {ASPECT_RATIOS.map((ar, idx) => (
                                    <button
                                        key={ar.ratio}
                                        onClick={() => setAspectIdx(idx)}
                                        className={`px-2 py-2 rounded-lg text-xs transition-all ${
                                            aspectIdx === idx
                                                ? 'bg-white text-black font-medium'
                                                : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        <div className="font-mono text-[10px]">{ar.ratio}</div>
                                        <div className={`text-[8px] mt-0.5 ${aspectIdx === idx ? 'text-black/50' : 'text-slate-600'}`}>{ar.label.split(' ')[0]}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <LoraStack selectedLoras={selectedLoras} setSelectedLoras={setSelectedLoras} availableLoras={availableLoras} />

                        <div>
                            <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Negative Prompt</label>
                            <textarea
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                className="w-full h-24 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Steps: {steps}</label>
                            <input type="range" min="10" max="40" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-2">CFG Scale: {cfg}</label>
                            <input type="range" min="1" max="12" step="0.5" value={cfg} onChange={(e) => setCfg(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white" />
                            <p className="text-[10px] text-slate-600 mt-1">PonyXL works best at 4–7</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-xs text-slate-400 uppercase tracking-wider">Face Enhancement</label>
                                <p className="text-[10px] text-slate-600 mt-0.5">Skip for non-portrait images</p>
                            </div>
                            <button
                                onClick={() => setFaceEnhance(!faceEnhance)}
                                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${faceEnhance ? 'bg-white' : 'bg-white/10'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${faceEnhance ? 'translate-x-5 bg-black' : 'translate-x-0 bg-slate-400'}`} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Seed (-1 for random)</label>
                            <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value))} className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
