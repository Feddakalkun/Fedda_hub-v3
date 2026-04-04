import { Flame, Lock } from 'lucide-react';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export const NsfwToggle = ({ className = '' }: { className?: string }) => {
    const { nsfwEnabled, toggleNsfw } = useUserPreferences();

    return (
        <button
            onClick={toggleNsfw}
            title={nsfwEnabled ? "Lock Studio (Safe Mode)" : "Unlock Studio (NSFW Mode)"}
            className={`relative flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                nsfwEnabled 
                    ? 'bg-gradient-to-r from-fuchsia-900/30 to-rose-900/10 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]' 
                    : 'bg-white/5 border border-white/5 hover:bg-white/10'
            } ${className}`}
        >
            {/* Active background animation */}
            {nsfwEnabled && (
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-transparent opacity-50 animate-pulse pointer-events-none"></div>
            )}

            <div className="relative flex items-center gap-3 z-10">
                {nsfwEnabled ? (
                    <Flame className="w-5 h-5 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                ) : (
                    <Lock className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
                )}
                <span className={`font-medium text-sm tracking-tight transition-colors ${
                    nsfwEnabled ? 'text-fuchsia-100 drop-shadow-md' : 'text-slate-400 group-hover:text-slate-300'
                }`}>
                    {nsfwEnabled ? 'Unlocked Mode' : 'Safe Mode'}
                </span>
            </div>

            {/* Toggle Switch Visual */}
            <div className={`relative w-8 h-4 rounded-full transition-colors z-10 ${
                nsfwEnabled ? 'bg-fuchsia-500/30 border border-fuchsia-500/50' : 'bg-black/50 border border-white/10'
            }`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    nsfwEnabled ? 'left-4 bg-fuchsia-400 shadow-[0_0_5px_#d946ef]' : 'left-1 bg-slate-500'
                }`}></div>
            </div>
        </button>
    );
};
