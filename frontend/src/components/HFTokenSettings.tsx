import { useState, useEffect } from 'react';
import { Key, X, CheckCircle2, AlertCircle } from 'lucide-react';

const HF_TOKEN_KEY = 'fedda_hf_token';

export const HFTokenSettings = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [token, setToken] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load token from localStorage on mount
        const stored = localStorage.getItem(HF_TOKEN_KEY);
        if (stored) {
            setToken(stored);
        }
    }, []);

    const handleSave = () => {
        if (token.trim()) {
            localStorage.setItem(HF_TOKEN_KEY, token.trim());
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } else {
            localStorage.removeItem(HF_TOKEN_KEY);
        }
    };

    const handleClear = () => {
        setToken('');
        localStorage.removeItem(HF_TOKEN_KEY);
    };

    const hasToken = !!localStorage.getItem(HF_TOKEN_KEY);

    return (
        <>
            {/* Settings Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    hasToken
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title="HuggingFace Token Settings"
            >
                <Key className="w-3.5 h-3.5 inline" />
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setIsOpen(false)}>
                    <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-[500px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Key className="w-5 h-5 text-white" />
                                <h3 className="text-lg font-bold text-white">HuggingFace Token</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Description */}
                        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs text-blue-200 leading-relaxed">
                                <AlertCircle className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                                Required for downloading gated models like <strong>WAN (Lipsync)</strong>.
                                Get your token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">HuggingFace Settings</a>.
                            </p>
                        </div>

                        {/* Input */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                Access Token (starts with hf_...)
                            </label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="hf_..."
                                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-white/30 font-mono"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-200 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {saved ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Saved!
                                    </>
                                ) : (
                                    'Save Token'
                                )}
                            </button>
                            {token && (
                                <button
                                    onClick={handleClear}
                                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Help Text */}
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                <strong>Setup steps:</strong><br />
                                1. Visit <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">huggingface.co/settings/tokens</a><br />
                                2. Create a new token with <strong>Read</strong> access<br />
                                3. Accept model license at <a href="https://huggingface.co/Comfy-Org/WAN-22-repackaged" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400">WAN-22-repackaged</a><br />
                                4. Paste token here and save
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Utility function to get the stored token
export const getStoredHFToken = (): string | null => {
    return localStorage.getItem(HF_TOKEN_KEY);
};
