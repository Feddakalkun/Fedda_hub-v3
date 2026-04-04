import { useState } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { comfyService } from '../../services/comfyService';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { useToast } from '../ui/Toast';
import { ImageUpload } from '../image/ImageUpload';
import { usePersistentState } from '../../hooks/usePersistentState';

interface NsfwBJTabProps {
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
}

export const NsfwBJTab = ({ isGenerating, setIsGenerating }: NsfwBJTabProps) => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    // Scene prompts – editable by user, but pre-filled from workflow defaults
    const [prompt1, setPrompt1] = usePersistentState(
        'nsfw_bj_prompt1',
        'A seductive woman effortlessly tears apart her dress, then pulls it down to fall away, exposing her naked breasts and vagina.'
    );
    const [prompt2, setPrompt2] = usePersistentState(
        'nsfw_bj_prompt2',
        'A man appears and she sucks his penis. Static camera, fixed viewpoint, still shot.'
    );
    const [prompt3, setPrompt3] = usePersistentState(
        'nsfw_bj_prompt3',
        'She sucks his penis very quickly, all the way down to his testicles. A lot of white saliva drips from her mouth. The camera is still.'
    );
    const [prompt4, setPrompt4] = usePersistentState(
        'nsfw_bj_prompt4',
        'The man pulls his penis out and ejaculates. A huge amount of semen lands on the girl\'s face and hair. She is completely covered in semen.'
    );

    const [frameLength, setFrameLength] = usePersistentState('nsfw_bj_frames', 81);
    const [showAdvanced, setShowAdvanced] = usePersistentState('nsfw_bj_show_advanced', false);

    const [inputImage, setInputImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleImageSelected = (file: File) => {
        setInputImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleClearImage = () => {
        setInputImage(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleGenerate = async () => {
        if (!inputImage) {
            toast('Please upload a starting image first', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const uploaded = await comfyService.uploadImage(inputImage);
            const response = await fetch('/workflows/BJimg2videoapi.json');
            if (!response.ok) throw new Error('Failed to load BJ workflow');
            const workflow = await response.json();

            const seed = Math.floor(Math.random() * 1_000_000_000);

            // Inject seed (node 138)
            workflow['138'].inputs.value = seed;

            // Inject frame length (node 29)
            workflow['29'].inputs.value = frameLength;

            // Inject starting image
            workflow['25'].inputs.image = uploaded.name;

            // Inject scene prompts
            workflow['70'].inputs.text = prompt1;  // Scene 1: dress removal
            workflow['71'].inputs.text = prompt2;  // Scene 2: BJ start
            workflow['98'].inputs.text = prompt3;  // Scene 3: BJ deep
            workflow['124'].inputs.text = prompt4; // Scene 4: cumshot

            await queueWorkflow(workflow);
            toast('BJ workflow queued! This will take a while...', 'success');
        } catch (error: any) {
            console.error('BJ generation failed:', error);
            toast(error?.message || 'Generation failed!', 'error');
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Input image upload */}
            <div className="bg-[#121218] border border-fuchsia-500/10 rounded-2xl p-5 shadow-xl">
                <ImageUpload
                    onImageSelected={handleImageSelected}
                    previewUrl={previewUrl}
                    onClear={handleClearImage}
                    label="Starting Image"
                />
                <p className="text-xs text-slate-600 mt-2">Upload a character image. The workflow will animate 4 sequential scenes from this starting frame.</p>
            </div>

            {/* Scene Prompts */}
            <div className="bg-[#121218] border border-fuchsia-500/10 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5" /> Scene Prompts
                </h3>
                {[
                    { label: 'Scene 1 — Undress', value: prompt1, set: setPrompt1 },
                    { label: 'Scene 2 — BJ Start', value: prompt2, set: setPrompt2 },
                    { label: 'Scene 3 — BJ Deep', value: prompt3, set: setPrompt3 },
                    { label: 'Scene 4 — Finish', value: prompt4, set: setPrompt4 },
                ].map(({ label, value, set }) => (
                    <div key={label}>
                        <label className="block text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                        <textarea
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            rows={3}
                            className="w-full bg-[#0a0a0f] border border-white/8 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 resize-none transition-all"
                        />
                    </div>
                ))}
            </div>

            {/* Advanced */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-5 shadow-xl">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                    <span>Advanced Settings</span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div>
                            <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">
                                Frame Length: {frameLength} frames ({(frameLength / 24).toFixed(1)}s @ 24fps)
                            </label>
                            <input
                                type="range" min={25} max={161} step={4}
                                value={frameLength}
                                onChange={(e) => setFrameLength(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                            />
                            <p className="text-[10px] text-slate-600 mt-1">More frames = longer generation time. 81 ≈ 3.4s of video per scene.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !inputImage}
                className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                    isGenerating || !inputImage
                        ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white shadow-lg shadow-fuchsia-500/25 active:scale-[0.98]'
                }`}
            >
                <Flame className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate Sequence'}
            </button>

            <p className="text-center text-xs text-slate-600">
                Requires: <span className="text-slate-400">wan2.2_i2v_low/high_noise_14B</span> + <span className="text-slate-400">wan_2.1_vae</span> + <span className="text-slate-400">nsfw_wan_umt5-xxl</span>
            </p>
        </div>
    );
};
