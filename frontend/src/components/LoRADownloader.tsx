import { useState, useEffect } from 'react';
import { Check, Loader2, AlertTriangle, Users, Sparkles, Eye, X } from 'lucide-react';
import { FREE_LORAS, TOTAL_LORA_SIZE_MB } from '../config/loras';
import { BACKEND_API } from '../config/api';

interface LoRAStatus {
    filename: string;
    installed: boolean;
    downloading: boolean;
    progress: number;
    error?: string;
}

type LoRAFamily =
    | 'z-image'
    | 'qwen'
    | 'flux2klein'
    | 'flux1dev'
    | 'sd15'
    | 'sd15_lycoris'
    | 'sdxl'
    | 'ltx'
    | 'wan'
    | 'ace-step';

interface LoRADownloaderProps {
    family?: LoRAFamily;
}

interface PackConfig {
    key: string;
    title: string;
    subtitle: string;
}

interface CatalogItem {
    name: string;
    file: string;
    installed: boolean;
    size_mb?: number | null;
    preview_url?: string | null;
}

const FAMILY_PACKS: Record<LoRAFamily, PackConfig[]> = {
    'z-image': [{ key: 'zimage_turbo', title: 'Z-Image Turbo Celeb Mega Pack', subtitle: 'pmczip/Z-Image-Turbo_Models' }],
    qwen: [],
    flux2klein: [
        { key: 'flux2klein', title: 'FLUX2KLEIN Celeb Pack', subtitle: 'pmczip/FLUX.2-klein-9B_Models' },
        { key: 'flux1dev', title: 'FLUX.1-dev Celeb Pack', subtitle: 'pmczip/FLUX.1-dev_Models' },
    ],
    flux1dev: [{ key: 'flux1dev', title: 'FLUX.1-dev Celeb Pack', subtitle: 'pmczip/FLUX.1-dev_Models' }],
    sd15: [{ key: 'sd15', title: 'SD1.5 LoRA Pack', subtitle: 'pmczip/SD1.5_LoRa_Models' }],
    sd15_lycoris: [{ key: 'sd15_lycoris', title: 'SD1.5 LyCORIS Pack', subtitle: 'pmczip/SD1.5_LyCORIS_Models' }],
    sdxl: [{ key: 'sdxl', title: 'SDXL LoRA Pack', subtitle: 'pmczip/SDXL_Models' }],
    ltx: [],
    wan: [],
    'ace-step': [],
};

const FAMILY_LABELS: Record<LoRAFamily, string> = {
    'z-image': 'Z-Image',
    qwen: 'QWEN',
    flux2klein: 'FLUX2KLEIN',
    flux1dev: 'FLUX.1-dev',
    sd15: 'SD1.5',
    sd15_lycoris: 'SD1.5 LyCORIS',
    sdxl: 'SDXL',
    ltx: 'LTX',
    wan: 'WAN',
    'ace-step': 'ACE-Step',
};

export const LoRADownloader = ({ family = 'z-image' }: LoRADownloaderProps) => {
    const [loraStatus, setLoraStatus] = useState<Record<string, LoRAStatus>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [importUrl, setImportUrl] = useState('');
    const [importJobId, setImportJobId] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<string>('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState('');
    const [previewItems, setPreviewItems] = useState<CatalogItem[]>([]);
    const [activePreviewPack, setActivePreviewPack] = useState<string | null>(null);
    const [singleDownloadBusy, setSingleDownloadBusy] = useState<string | null>(null);

    const [packStatus, setPackStatus] = useState<Record<string, any>>({});
    const [packCatalog, setPackCatalog] = useState<Record<string, any>>({});

    const isZImage = family === 'z-image';
    const packs = FAMILY_PACKS[family] || [];

    const checkStatus = async () => {
        try {
            if (isZImage) {
                const resp = await fetch(`${BACKEND_API.BASE_URL}/api/lora/installed`);
                const data = await resp.json();
                if (data.success) {
                    const installed = data.installed || {};
                    const status: Record<string, LoRAStatus> = {};
                    for (const lora of FREE_LORAS) {
                        const isInstalled = lora.filename in installed;
                        let downloadProgress = 0;
                        let isDownloading = false;
                        let error = undefined;

                        if (!isInstalled) {
                            try {
                                const progressResp = await fetch(`${BACKEND_API.BASE_URL}/api/lora/download-status/${lora.filename}`);
                                const progressData = await progressResp.json();
                                if (progressData.status === 'downloading') {
                                    isDownloading = true;
                                    downloadProgress = progressData.progress || 0;
                                } else if (progressData.status === 'error') {
                                    error = progressData.message;
                                }
                            } catch {
                                // Ignore progress polling errors.
                            }
                        }

                        status[lora.id] = {
                            filename: lora.filename,
                            installed: isInstalled,
                            downloading: isDownloading,
                            progress: downloadProgress,
                            error,
                        };
                    }
                    setLoraStatus(status);
                }
            } else {
                setLoraStatus({});
            }

            const statusEntries: Array<[string, any]> = [];
            const catalogEntries: Array<[string, any]> = [];
            for (const pack of packs) {
                try {
                    const [statusResp, catalogResp] = await Promise.all([
                        fetch(`${BACKEND_API.BASE_URL}/api/lora/pack/${pack.key}/status`),
                        fetch(`${BACKEND_API.BASE_URL}/api/lora/pack/${pack.key}/catalog?limit=1000`),
                    ]);
                    const [statusData, catalogData] = await Promise.all([statusResp.json(), catalogResp.json()]);
                    if (statusData?.success) statusEntries.push([pack.key, statusData]);
                    if (catalogData?.success) catalogEntries.push([pack.key, catalogData]);
                } catch (e) {
                    console.error(`Failed pack refresh for ${pack.key}:`, e);
                }
            }
            setPackStatus(Object.fromEntries(statusEntries));
            setPackCatalog(Object.fromEntries(catalogEntries));
        } catch (e) {
            console.error('Failed to check LoRA status:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [family]);

    useEffect(() => {
        if (!importJobId) return;
        const interval = setInterval(async () => {
            try {
                const resp = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.LORA_IMPORT_STATUS}/${importJobId}`);
                const data = await resp.json();
                if (!data?.success) return;
                if (data.status === 'completed') {
                    setImportStatus(`Imported ${data.filename}`);
                    setImportJobId(null);
                    checkStatus();
                    return;
                }
                if (data.status === 'error') {
                    setImportStatus(`Import failed: ${data.message || 'unknown error'}`);
                    setImportJobId(null);
                    return;
                }
                const pct = Number(data.progress || 0);
                setImportStatus(`Importing ${data.filename}... ${pct}%`);
            } catch {
                // Ignore transient polling errors.
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [importJobId]);

    const handleImportUrl = async () => {
        const trimmed = importUrl.trim();
        if (!trimmed) return;
        setImportStatus('Starting import...');
        try {
            const resp = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.LORA_IMPORT_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trimmed, provider: 'auto' }),
            });
            const data = await resp.json();
            if (!resp.ok || !data?.success) throw new Error(data?.detail || data?.error || 'Import failed');
            setImportJobId(data.job_id);
        } catch (e: any) {
            setImportStatus(e?.message || 'Import failed');
            setImportJobId(null);
        }
    };

    const handleDownloadAllStarter = async () => {
        for (const lora of FREE_LORAS) {
            const status = loraStatus[lora.id];
            if (!status?.installed && !status?.downloading) {
                try {
                    await fetch(`${BACKEND_API.BASE_URL}/api/lora/install`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: lora.url, filename: lora.filename }),
                    });
                } catch (e) {
                    console.error(`Failed to start download for ${lora.name}:`, e);
                }
            }
        }
        setTimeout(checkStatus, 500);
    };

    const handleSyncPack = async (packKey: string, title: string) => {
        try {
            setImportStatus(`Starting ${title} sync...`);
            const resp = await fetch(`${BACKEND_API.BASE_URL}/api/lora/pack/${packKey}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await resp.json();
            if (!resp.ok || !data?.success) {
                throw new Error(data?.detail || data?.message || 'Failed to start pack sync');
            }
            setImportStatus(`${title} sync started.`);
            setTimeout(checkStatus, 800);
        } catch (e: any) {
            setImportStatus(e?.message || 'Failed to start pack sync');
        }
    };

    const handleDownloadSingleFromPack = async (packKey: string, file: string) => {
        try {
            setSingleDownloadBusy(`${packKey}:${file}`);
            const resp = await fetch(`${BACKEND_API.BASE_URL}/api/lora/pack/${packKey}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file }),
            });
            const data = await resp.json();
            if (!resp.ok || !data?.success) {
                throw new Error(data?.detail || data?.message || 'Failed to start single download');
            }
            setImportStatus(`Started download: ${file}`);
            setTimeout(checkStatus, 800);
        } catch (e: any) {
            setImportStatus(e?.message || 'Failed to start single download');
        } finally {
            setSingleDownloadBusy(null);
        }
    };

    const openStarterPreview = () => {
        const items: CatalogItem[] = FREE_LORAS.map((lora) => ({
            name: lora.name,
            file: lora.filename,
            installed: Boolean(loraStatus[lora.id]?.installed),
            size_mb: lora.size_mb,
            preview_url: null,
        }));
        setPreviewTitle('Z-Image Character Starter Pack • Made personally by FEDDAKALKUN');
        setPreviewItems(items);
        setActivePreviewPack(null);
        setPreviewOpen(true);
    };

    const openPackPreview = (pack: PackConfig) => {
        const catalog = packCatalog[pack.key];
        const items = Array.isArray(catalog?.items) ? catalog.items : [];
        setPreviewTitle(pack.title);
        setPreviewItems(items);
        setActivePreviewPack(pack.key);
        setPreviewOpen(true);
    };

    if (isLoading) return null;

    const allStarterInstalled = isZImage && FREE_LORAS.every((lora) => loraStatus[lora.id]?.installed);
    const starterDownloading = isZImage && Object.values(loraStatus).some((s) => s.downloading);
    const starterErrors = isZImage && Object.values(loraStatus).some((s) => s.error);
    const starterInstalledCount = isZImage ? FREE_LORAS.filter((lora) => loraStatus[lora.id]?.installed).length : 0;
    const allPacksInstalled = packs.length > 0 && packs.every((p) => {
        const cat = packCatalog[p.key];
        const total = Number(cat?.total || 0);
        const installed = Number(cat?.installed || 0);
        return total > 0 && installed >= total;
    });

    return (
        <div className="space-y-5">
            {isZImage && (
                <div className="bg-[#121218] border border-white/10 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                {starterDownloading ? (
                                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                ) : starterErrors ? (
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-violet-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Z-Image Character Starter Pack</h3>
                                <p className="text-xs text-slate-400">
                                    Made personally by FEDDAKALKUN • {starterInstalledCount}/{FREE_LORAS.length} installed (~{TOTAL_LORA_SIZE_MB} MB)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={openStarterPreview}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-all border border-white/10"
                            >
                                <span className="inline-flex items-center gap-2"><Eye className="w-4 h-4" /> Preview</span>
                            </button>
                            {!allStarterInstalled && !starterDownloading && (
                                <button
                                    onClick={handleDownloadAllStarter}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-all"
                                >
                                    Download Full Pack
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-3 text-xs text-slate-400">
                        Workflow-required LoRAs are installed with model groups. Character packs are optional and managed here.
                    </div>
                </div>
            )}

            {packs.map((pack) => {
                const status = packStatus[pack.key] || {};
                const catalog = packCatalog[pack.key] || {};
                const total = Number(catalog.total || 0);
                const installed = Number(catalog.installed || 0);
                const running = status.status === 'running';
                const percent = total > 0 ? Math.round((installed / total) * 100) : 0;
                let statusLabel = 'Idle';
                if (status.status === 'running') statusLabel = status.message || 'Syncing...';
                else if (status.status === 'completed') statusLabel = `Completed (${installed}/${total})`;
                else if (status.status === 'error') statusLabel = status.message || 'Sync error';

                return (
                    <div key={pack.key} className="bg-[#121218] border border-white/10 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    {running ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin" /> : <Users className="w-5 h-5 text-blue-400" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{pack.title}</h3>
                                    <p className="text-xs text-slate-400">
                                        {total > 0 ? `${installed}/${total} installed` : `Loading index...`} • {pack.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openPackPreview(pack)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-all border border-white/10"
                                >
                                    <span className="inline-flex items-center gap-2"><Eye className="w-4 h-4" /> Preview Celebs</span>
                                </button>
                                <button
                                    onClick={() => handleSyncPack(pack.key, pack.title)}
                                    disabled={running}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60"
                                >
                                    {running ? 'Syncing...' : 'Download Full Pack'}
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>{statusLabel}</span>
                                <span>{total > 0 ? `${percent}%` : ''}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${total > 0 ? percent : 0}%` }} />
                            </div>
                            {status.status === 'error' && <p className="text-xs text-red-400">{status.message || 'Pack sync failed'}</p>}
                        </div>
                    </div>
                );
            })}

            {packs.length === 0 && (
                <div className="bg-[#121218] border border-white/10 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-white mb-2">{FAMILY_LABELS[family]} Character LoRAs</h3>
                    <p className="text-xs text-slate-400">No full celeb pack configured yet for this model family.</p>
                </div>
            )}

            <div className="bg-[#121218] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-black/20">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white">Import Character LoRA from URL</h4>
                        <span className="text-[10px] text-slate-500">HuggingFace / Civitai / direct</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="Paste model URL..."
                            className="flex-1 bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <button
                            onClick={handleImportUrl}
                            disabled={Boolean(importJobId)}
                            className="px-3 py-2 bg-white text-black text-xs font-semibold rounded-lg disabled:opacity-60"
                        >
                            {importJobId ? 'Importing...' : 'Import'}
                        </button>
                    </div>
                    {importStatus && <p className="text-xs text-slate-400 mt-2">{importStatus}</p>}
                    <p className="text-[11px] text-slate-500 mt-3">
                        Character LoRAs belong here. Workflow-required LoRAs stay in model groups and download with base models.
                    </p>
                </div>
            </div>

            {allPacksInstalled && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-green-300">All configured {FAMILY_LABELS[family]} character packs are installed.</span>
                </div>
            )}

            {previewOpen && (
                <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="w-full max-w-6xl max-h-[88vh] bg-[#0f1017] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">{previewTitle}</h3>
                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[calc(88vh-72px)]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {previewItems.map((item) => (
                                    <div key={item.file} className="bg-[#141622] border border-white/10 rounded-xl overflow-hidden">
                                        <div className="aspect-[3/4] bg-black/40 flex items-center justify-center">
                                            {item.preview_url ? (
                                                <img src={item.preview_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center px-3">
                                                    <div className="text-3xl mb-2">✨</div>
                                                    <div className="text-xs text-slate-400">Preview will appear after sample render</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                                            <div className="text-[11px] text-slate-400 truncate">{item.file}</div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[11px] ${item.installed ? 'text-green-400' : 'text-slate-400'}`}>
                                                    {item.installed ? 'Installed' : 'Not installed'}
                                                </span>
                                                {activePreviewPack && !item.installed && (
                                                    <button
                                                        onClick={() => handleDownloadSingleFromPack(activePreviewPack, item.file)}
                                                        disabled={singleDownloadBusy === `${activePreviewPack}:${item.file}`}
                                                        className="px-2.5 py-1 text-[11px] rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                                                    >
                                                        {singleDownloadBusy === `${activePreviewPack}:${item.file}` ? '...' : 'Download'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
