import { useState } from 'react';
import { Sparkles, Shuffle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { comfyService } from '../../services/comfyService';
import { useToast } from '../ui/Toast';
import { usePersistentState } from '../../hooks/usePersistentState';

// Preset pose list for quick selection
const POSE_PRESETS = [
    'looking at viewer, confident smile, hands on hips',
    'lying on back, legs crossed, playful expression',
    'sitting on chair, legs spread, leaning back, confident',
    'on all fours, looking over shoulder, sultry gaze',
    'standing, back to viewer, glancing over shoulder coyly',
    'sitting on bed edge, legs dangling, seductive smile',
    'lying on stomach, propped on elbows, looking at viewer',
    'standing against wall, one leg bent, dominant pose',
];

interface NsfwSDXLTabProps {
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
}

export const NsfwSDXLTab = ({ isGenerating, setIsGenerating }: NsfwSDXLTabProps) => {
    const { queueWorkflow } = useComfyExecution();
    const { toast } = useToast();

    const [characterName, setCharacterName] = usePersistentState('nsfw_sdxl_char', 'moana1');
    const [poseDesc, setPoseDesc] = usePersistentState('nsfw_sdxl_pose', POSE_PRESETS[0]);
    const [extraDetails, setExtraDetails] = usePersistentState('nsfw_sdxl_details', 'nude breast, cleavage, seductive smile, outdoors, golden hour, cinematic lighting');
    const [negPrompt, setNegPrompt] = usePersistentState('nsfw_sdxl_neg', 'score_6, score_5, score_4, tan line, muscular, censored, furry, child, kid, teen, chibi, watermark, text, verybadimagenegative_v1.3, bad_hands, bad_feet, deformed, malformed, missing_limbs, extra_limbs, 2girls');
    const [qualityPrefix, setQualityPrefix] = usePersistentState('nsfw_sdxl_quality', 'score_9, score_8_up, score_7_up,');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [posePresetIdx, setPosePresetIdx] = useState(-1);

    const handleRandomPose = () => {
        const idx = Math.floor(Math.random() * POSE_PRESETS.length);
        setPosePresetIdx(idx);
        setPoseDesc(POSE_PRESETS[idx]);
    };

    const handleGenerate = async () => {
        if (!characterName.trim()) {
            toast('Enter a character name or trigger word', 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch(`/workflows/sdxl_xxx_batch_api.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to load SDXL workflow');
            const wf = await response.json();

            // Patch node 11 (BASIC PROMPT / quality prefix)
            if (wf['11']) wf['11'].inputs._widget_0 = `${qualityPrefix} ${characterName}`.trim();

            // Patch node 250 (FEMALE NAME - batch) → single name, index 0
            if (wf['250']) {
                wf['250'].inputs._widget_0 = characterName;
                wf['250'].inputs._widget_1 = 0; // start index
            }

            // Patch node 252 (POSE - batch) → single pose, render just this one
            if (wf['252']) {
                wf['252'].inputs._widget_0 = poseDesc;
                wf['252'].inputs._widget_1 = 0; // start index
                wf['252'].inputs._widget_2 = 0; // end index (0 = just first)
            }

            // Patch node 20 (DETAILS)
            if (wf['20']) wf['20'].inputs._widget_0 = extraDetails;

            // Patch node 12 (negative Text Multiline)
            if (wf['12']) wf['12'].inputs._widget_0 = negPrompt;

            await queueWorkflow(wf);
            toast('SDXL image queued!', 'success');
        } catch (err: any) {
            toast(`Error: ${err.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-5 pb-8">
            {/* Character / Trigger Word */}
            <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                    Character / Trigger Word
                    <span className="ml-2 text-slate-600 normal-case font-normal">· model name or LORA trigger</span>
                </label>
                <input
                    type="text"
                    value={characterName}
                    onChange={e => setCharacterName(e.target.value)}
                    placeholder="e.g. moana1, pocahontas, elsa princess..."
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40"
                />
            </div>

            {/* Pose / Scene */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        Pose / Scene
                    </label>
                    <button
                        onClick={handleRandomPose}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-fuchsia-500/10 border border-white/10 hover:border-fuchsia-500/30 text-[10px] text-slate-400 hover:text-fuchsia-300 transition-all"
                    >
                        <Shuffle className="w-3 h-3" />
                        Random Pose
                    </button>
                </div>
                <textarea
                    value={poseDesc}
                    onChange={e => { setPoseDesc(e.target.value); setPosePresetIdx(-1); }}
                    placeholder="Describe the pose and scene..."
                    className="w-full h-20 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40 resize-none"
                />
                {/* Preset chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {POSE_PRESETS.slice(0, 4).map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => { setPoseDesc(preset); setPosePresetIdx(idx); }}
                            className={`px-2 py-1 rounded-lg text-[10px] border transition-all truncate max-w-[140px] ${
                                posePresetIdx === idx
                                    ? 'bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-200'
                                    : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
                            }`}
                            title={preset}
                        >
                            {preset.split(',')[0].trim()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Extra Details */}
            <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                    Additional Details
                </label>
                <textarea
                    value={extraDetails}
                    onChange={e => setExtraDetails(e.target.value)}
                    placeholder="nude breast, cleavage, seductive smile, outdoors..."
                    className="w-full h-16 bg-[#0a0a0f] border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40 resize-none"
                />
            </div>

            {/* Advanced toggle */}
            <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-3 bg-black/20 hover:bg-black/40 transition-colors text-xs font-medium text-slate-400 hover:text-white"
                >
                    <span>Advanced</span>
                    <span className={`text-slate-600 text-[10px] transition-transform inline-block ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {showAdvanced && (
                    <div className="p-4 bg-[#0a0a0f] space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Quality Prefix</label>
                            <input
                                type="text"
                                value={qualityPrefix}
                                onChange={e => setQualityPrefix(e.target.value)}
                                className="w-full bg-black border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-white/20"
                            />
                            <p className="text-[9px] text-slate-600 mt-1">Quality/style tokens prepended to the prompt</p>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">Negative Prompt</label>
                            <textarea
                                value={negPrompt}
                                onChange={e => setNegPrompt(e.target.value)}
                                className="w-full h-20 bg-black border border-white/5 rounded-lg p-2 text-[10px] text-slate-400 focus:outline-none focus:border-white/20 resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Generate */}
            <Button
                variant="primary"
                size="lg"
                className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 border-0"
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={isGenerating}
            >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating…' : 'Generate Image'}
            </Button>

            <p className="text-[9px] text-slate-600 text-center">
                Uses SDXL checkpoint · blendermix_v20 / cyberillustrious_v50
            </p>
        </div>
    );
};
