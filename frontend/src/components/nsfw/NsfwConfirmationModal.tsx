import { useState } from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';

interface NsfwConfirmationModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export const NsfwConfirmationModal = ({ onConfirm, onCancel }: NsfwConfirmationModalProps) => {
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Subtle glow behind the modal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[600px] bg-fuchsia-900/20 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f]/80 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                {/* Header glow */}
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-50"></div>

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-white">Unlocked Access</h2>
                            <p className="text-sm font-medium text-fuchsia-400/80 uppercase tracking-widest mt-1">Age Restricted Content</p>
                        </div>
                        <button 
                            onClick={onCancel}
                            className="ml-auto p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4 mb-8 text-sm text-slate-300 leading-relaxed bg-white/5 p-5 rounded-xl border border-white/5">
                        <p>
                            You are about to enable <strong>Unlocked Mode</strong>, which disables safety filters and exposes features designed for unrestricted narrative generation.
                        </p>
                        <ul className="space-y-3 font-medium">
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500/70 mt-0.5 shrink-0" />
                                <span>I am at least <strong>18 years of age</strong> (or the age of majority in my jurisdiction).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500/70 mt-0.5 shrink-0" />
                                <span>I accept that all generated content is my <strong>sole responsibility</strong>.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500/70 mt-0.5 shrink-0" />
                                <span>I agree to use these tools ethically and in accordance with local laws. Non-consensual depictions referrencing real people are strictly prohibited.</span>
                            </li>
                        </ul>
                    </div>

                    <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors mb-8 group">
                        <input 
                            type="checkbox" 
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-black/50 text-fuchsia-500 focus:ring-fuchsia-500/50 focus:ring-offset-0 transition-all cursor-pointer"
                        />
                        <span className="text-sm font-medium text-slate-200 select-none group-hover:text-white">
                            I confirm my age and agree to the terms above.
                        </span>
                    </label>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                        <button 
                            onClick={onCancel}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={!acceptedTerms}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center ${
                                acceptedTerms 
                                    ? 'bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white shadow-fuchsia-500/25 active:scale-95' 
                                    : 'bg-white/10 text-slate-500 border border-white/5 cursor-not-allowed'
                            }`}
                        >
                            Unlock Studio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
