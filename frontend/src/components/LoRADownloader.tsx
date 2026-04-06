import { useState, useEffect } from 'react';
import { Check, Loader2, Users, Sparkles, X, DownloadCloud } from 'lucide-react';
import { FREE_LORAS } from '../config/loras';
import { BACKEND_API } from '../config/api';
import { CatalogShell, CatalogCard } from './layout/CatalogShell';

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
    'z-image': [{ key: 'zimage_turbo', title: 'Z-Image Turbo Celeb Pack', subtitle: 'pmczip/Z-Image-Turbo_Models' }],
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

const FAMILY_LABELS: Record<string, string> = {
    'z-image': 'Z-Image',
    qwen: 'QWEN',
    flux2klein: 'FLUX2KLEIN',
    flux1dev: 'FLUX.1-dev',
    sd15: 'SD1.5',
    sd15_lycoris: 'SD1.5 LyCORIS',
    sdxl: 'SDXL',
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
    const title = FAMILY_LABELS[family] || 'Discovery Library';

    const checkStatus = async () => {
        try {
            if (isZImage) {
                const resp = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.LORA_INSTALLED}`);
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
                                const progressResp = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.LORA_DOWNLOAD_STATUS}/${lora.filename}`);
                                const progressData = await progressResp.json();
                                if (progressData.status === 'downloading') {
                                    isDownloading = true;
                                    downloadProgress = progressData.progress || 0;
                                } else if (progressData.status === 'error') {
                                    error = progressData.message;
                                }
                            } catch { }
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
                    if (statusData) statusEntries.push([pack.key, statusData]);
                    if (catalogData) catalogEntries.push([pack.key, catalogData]);
                } catch { }
            }
            setPackStatus(Object.fromEntries(statusEntries));
            setPackCatalog(Object.fromEntries(catalogEntries));
        } catch { } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 8000);
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
                    setImportStatus(`Failed: ${data.message || 'Error'}`);
                    setImportJobId(null);
                    return;
                }
                setImportStatus(`Importing... ${data.progress || 0}%`);
            } catch { }
        }, 1500);
        return () => clearInterval(interval);
    }, [importJobId]);

    const handleImportUrl = async () => {
        if (!importUrl.trim()) return;
        setImportStatus('Queuing...');
        try {
            const resp = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.LORA_IMPORT_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: importUrl.trim() }),
            });
            const data = await resp.json();
            if (data.success) setImportJobId(data.job_id);
            else setImportStatus(data.error || 'Failed');
        } catch (e: any) { setImportStatus(e.message); }
    };

    const handleSyncPack = async (packKey: string, packTitle: string) => {
        try {
            setImportStatus(`Syncing ${packTitle}...`);
            await fetch(`${BACKEND_API.BASE_URL}/api/lora/pack/${packKey}/sync`, { method: 'POST' });
            setTimeout(checkStatus, 500);
        } catch (e: any) { setImportStatus(e.message); }
    };

    const handleDownloadSingleFromPack = async (packKey: string, file: string) => {
        try {
            setSingleDownloadBusy(file);
            await fetch(`${BACKEND_API.BASE_URL}/api/lora/pack/${packKey}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file }),
            });
            setTimeout(checkStatus, 500);
        } catch (e: any) { setImportStatus(e.message); } finally { setSingleDownloadBusy(null); }
    };

    const openStarterPreview = () => {
        const items = FREE_LORAS.map(l => ({ name: l.name, file: l.filename, installed: !!loraStatus[l.id]?.installed }));
        setPreviewTitle('Starter Pack');
        setPreviewItems(items);
        setActivePreviewPack(null);
        setPreviewOpen(true);
    };

    const openPackPreview = (pack: PackConfig) => {
        const catalog = packCatalog[pack.key];
        setPreviewTitle(pack.title);
        setPreviewItems(catalog?.items || []);
        setActivePreviewPack(pack.key);
        setPreviewOpen(true);
    };

    if (isLoading) return null;

    const allStarterInstalled = isZImage && FREE_LORAS.every(l => loraStatus[l.id]?.installed);
    const starterInstalledCount = isZImage ? FREE_LORAS.filter(l => loraStatus[l.id]?.installed).length : 0;
    const allPacksInstalled = packs.length > 0 && packs.every(p => {
        const cat = packCatalog[p.key];
        return cat && cat.installed >= cat.total && cat.total > 0;
    });

    return (
        <CatalogShell 
            title={title} 
            subtitle={allPacksInstalled ? 'All character assets ready.' : 'Synchronize character assets for high-fidelity control.'}
            icon={Users}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {isZImage && (
                    <CatalogCard 
                        title="Character Starter Pack"
                        subtitle={`${starterInstalledCount}/${FREE_LORAS.length} models installed`}
                        icon={Sparkles}
                        actionLabel={allStarterInstalled ? "Ready" : "Sync Pack"}
                        onAction={allStarterInstalled ? undefined : () => {}} 
                        secondaryActionLabel="Preview"
                        onSecondaryAction={openStarterPreview}
                    />
                )}

                {packs.map(pack => {
                    const status = packStatus[pack.key] || {};
                    const catalog = packCatalog[pack.key] || {};
                    const isRunning = status.status === 'running';
                    const isCompleted = catalog.total > 0 && catalog.installed >= catalog.total;
                    
                    return (
                        <CatalogCard 
                            key={pack.key}
                            title={pack.title}
                            subtitle={`${catalog.installed || 0}/${catalog.total || 0} characters installed`}
                            icon={isRunning ? Loader2 : Users}
                            iconClassName={isRunning ? "animate-spin text-emerald-500" : ""}
                            actionLabel={isCompleted ? "Ready" : (isRunning ? "Syncing..." : "Sync Pack")}
                            onAction={isCompleted || isRunning ? undefined : () => handleSyncPack(pack.key, pack.title)}
                            secondaryActionLabel="Browse"
                            onSecondaryAction={() => openPackPreview(pack)}
                            progress={catalog.total > 0 ? (catalog.installed / catalog.total) * 100 : undefined}
                        />
                    );
                })}

                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                <DownloadCloud className="w-5 h-5 text-white/40" />
                            </div>
                            <h3 className="text-sm font-bold text-white/80">Manual Import</h3>
                        </div>
                        <input 
                            value={importUrl} onChange={e => setImportUrl(e.target.value)}
                            placeholder="Link to HuggingFace or Civitai..."
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/60 focus:outline-none focus:border-emerald-500/20"
                        />
                        {importStatus && <p className="text-[10px] text-slate-500 font-bold tracking-widest">{importStatus}</p>}
                    </div>
                    <button onClick={handleImportUrl} className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/50 transition-all">
                        {importJobId ? 'Processing...' : 'Import Model'}
                    </button>
                </div>
            </div>

            {previewOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
                    <div className="w-full max-w-6xl h-full max-h-[85vh] bg-[#080808] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative">
                        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">{previewTitle}</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">{previewItems.length} Models</p>
                            </div>
                            <button onClick={() => setPreviewOpen(false)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all text-white/40 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {previewItems.map(item => (
                                    <div key={item.file} className="group relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/5 bg-black/40">
                                        {item.preview_url ? (
                                            <img src={item.preview_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-800 text-6xl">■</div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-100 transition-opacity" />
                                        <div className="absolute bottom-0 left-0 right-0 p-5">
                                            <p className="text-xs font-black text-white uppercase tracking-widest truncate">{item.name}</p>
                                            <div className="mt-3 flex items-center justify-between">
                                                {item.installed ? (
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Check className="w-3 h-3" /> Ready
                                                    </span>
                                                ) : (
                                                    <button 
                                                        disabled={singleDownloadBusy === item.file}
                                                        onClick={() => activePreviewPack && handleDownloadSingleFromPack(activePreviewPack, item.file)}
                                                        className="px-3 py-1.5 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        {singleDownloadBusy === item.file ? '...' : 'Download'}
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
        </CatalogShell>
    );
};
