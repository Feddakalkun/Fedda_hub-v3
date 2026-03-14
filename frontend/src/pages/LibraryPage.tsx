// LoRA Library - Simplified (Manual Download)
import { Package, Download, ExternalLink, Info } from 'lucide-react';
import { CatalogShell, CatalogCard } from '../components/layout/CatalogShell';

export const LibraryPage = () => {
    return (
        <CatalogShell
            title="LoRA Library"
            subtitle="Free character LoRAs for image generation"
            icon={Package}
        >
            {/* Main Info Card */}
            <CatalogCard className="p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                            <Download className="w-6 h-6 text-violet-300" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Free Character LoRA Pack</h2>
                            <p className="text-slate-400 mt-1">
                                Download 2 free character LoRAs (~487 MB total)
                            </p>
                        </div>
                    </div>

                    {/* Available LoRAs */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                        {/* Emmy */}
                        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-4xl">👱‍♀️</span>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Emmy</h3>
                                    <p className="text-xs text-slate-500">~325 MB</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400">
                                Scandinavian blonde character LoRA
                            </p>
                            <div className="pt-2 text-xs text-slate-600 font-mono">
                                ComfyUI/models/loras/Emmy/
                            </div>
                        </div>

                        {/* Sana */}
                        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-4xl">👤</span>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Sana</h3>
                                    <p className="text-xs text-slate-500">~162 MB</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400">
                                Character LoRA for portraits
                            </p>
                            <div className="pt-2 text-xs text-slate-600 font-mono">
                                ComfyUI/models/loras/Sana/
                            </div>
                        </div>
                    </div>

                    {/* Download Instructions */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <h3 className="text-lg font-bold text-blue-200">How to Download</h3>
                        </div>

                        <div className="space-y-3 text-sm text-slate-300">
                            <p className="leading-relaxed">
                                To download the free LoRA pack, run the following file from your FEDDA installation folder:
                            </p>

                            <div className="bg-black/30 border border-white/10 rounded-lg p-4 font-mono text-emerald-300 flex items-center justify-between">
                                <code>download_loras.bat</code>
                                <ExternalLink className="w-4 h-4 text-slate-500" />
                            </div>

                            <div className="space-y-2 pt-2">
                                <p className="text-slate-400">
                                    <span className="text-white font-semibold">Step 1:</span> Navigate to your FEDDA folder
                                </p>
                                <p className="text-slate-400">
                                    <span className="text-white font-semibold">Step 2:</span> Double-click <code className="px-1.5 py-0.5 bg-white/10 rounded text-emerald-300">download_loras.bat</code>
                                </p>
                                <p className="text-slate-400">
                                    <span className="text-white font-semibold">Step 3:</span> Wait for downloads to complete (~487 MB)
                                </p>
                                <p className="text-slate-400">
                                    <span className="text-white font-semibold">Step 4:</span> LoRAs will appear in the LoRA picker when generating images
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="border-t border-white/5 pt-6">
                        <h4 className="text-sm font-semibold text-white mb-3">Where are LoRAs installed?</h4>
                        <div className="bg-white/5 rounded-lg p-4 font-mono text-xs text-slate-400 break-all">
                            {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                ? 'ComfyUI\\models\\loras\\'
                                : '/workspace/models/comfyui/loras/'}
                        </div>
                    </div>
                </div>
            </CatalogCard>
        </CatalogShell>
    );
};
