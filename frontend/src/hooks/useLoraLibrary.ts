import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { BACKEND_API } from '../config/api';
import { FREE_LORAS, type LoRAInfo } from '../config/loras';

const api = (endpoint: string) => `${BACKEND_API.BASE_URL}${endpoint}`;

// Legacy type alias for backwards compatibility
type LoraEntry = LoRAInfo & { installed?: boolean; isPremium?: boolean; downloadUrl?: string };

export const useLoraLibrary = () => {
    const { toast } = useToast();
    const [loras, setLoras] = useState<LoraEntry[]>(FREE_LORAS.map(l => ({ ...l, downloadUrl: l.url, isPremium: false })));
    const [downloading, setDownloading] = useState<Record<string, number>>({}); // id -> progress %
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Poll download progress for active downloads
    const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

    // Check which LoRAs are already installed on mount
    useEffect(() => {
        let mounted = true;
        const checkInstalled = async () => {
            try {
                const res = await fetch(api(BACKEND_API.ENDPOINTS.LORA_INSTALLED));
                if (!res.ok) return;
                const data = await res.json();
                if (mounted && data.installed) {
                    setLoras(prev => prev.map(l => ({
                        ...l,
                        installed: l.filename in data.installed,
                        fileSize: l.filename in data.installed ? `${data.installed[l.filename]} MB` : l.fileSize,
                    })));
                }
            } catch {
                // Backend might not be running yet
            }
        };
        checkInstalled();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        return () => {
            pollTimers.current.forEach(timer => clearInterval(timer));
        };
    }, []);

    const startProgressPoll = useCallback((lora: LoraEntry) => {
        const timer = setInterval(async () => {
            try {
                const res = await fetch(api(`${BACKEND_API.ENDPOINTS.LORA_DOWNLOAD_STATUS}/${lora.filename}`));
                const data = await res.json();

                if (data.status === 'completed') {
                    clearInterval(timer);
                    pollTimers.current.delete(lora.id);
                    setDownloading(prev => {
                        const next = { ...prev };
                        delete next[lora.id];
                        return next;
                    });
                    setLoras(ls => ls.map(l => l.id === lora.id ? { ...l, installed: true } : l));
                    toast(`${lora.name} installed successfully!`, 'success');
                } else if (data.status === 'error') {
                    clearInterval(timer);
                    pollTimers.current.delete(lora.id);
                    setDownloading(prev => {
                        const next = { ...prev };
                        delete next[lora.id];
                        return next;
                    });
                    toast(`Download failed: ${data.message || lora.name}`, 'error');
                } else {
                    setDownloading(prev => ({ ...prev, [lora.id]: data.progress ?? 0 }));
                }
            } catch {
                // Silently retry on next poll
            }
        }, 1000);

        pollTimers.current.set(lora.id, timer);
    }, [toast]);

    const handleDownload = async (lora: LoraEntry) => {
        if (!lora.downloadUrl && !lora.isPremium) {
            toast('No download URL configured for this LoRA', 'error');
            return;
        }

        setDownloading(prev => ({ ...prev, [lora.id]: 0 }));

        try {
            if (lora.isPremium) {
                // Premium LoRAs use the sync endpoint
                const res = await fetch(api(BACKEND_API.ENDPOINTS.LORA_SYNC_PREMIUM), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error('Sync failed');
                toast(`Downloading ${lora.name} from Premium vault...`, 'info');
            } else {
                const res = await fetch(api(BACKEND_API.ENDPOINTS.LORA_INSTALL), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: lora.downloadUrl, filename: lora.filename })
                });
                if (!res.ok) throw new Error('Failed to start download');
                toast(`Downloading ${lora.name}...`, 'info');
            }

            startProgressPoll(lora);
        } catch (error) {
            toast(`Failed to download ${lora.name}`, 'error');
            setDownloading(prev => {
                const next = { ...prev };
                delete next[lora.id];
                return next;
            });
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(api(BACKEND_API.ENDPOINTS.LORA_SYNC_PREMIUM), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error('Sync failed');
            const data = await res.json();

            if (data.status === 'error') {
                toast(data.message, 'error');
                return;
            }

            const downloadCount = data.downloading?.length ?? 0;
            const skipCount = data.skipped?.length ?? 0;

            if (downloadCount === 0 && skipCount > 0) {
                toast(`All ${skipCount} premium LoRAs already installed!`, 'success');
            } else {
                toast(`Downloading ${downloadCount} LoRAs (${skipCount} already installed)...`, 'info');

                // Start polling for each downloading file
                for (const filename of (data.downloading || [])) {
                    const lora = loras.find(l => l.filename === filename);
                    if (lora) {
                        setDownloading(prev => ({ ...prev, [lora.id]: 0 }));
                        startProgressPoll(lora);
                    }
                }
            }
        } catch (error) {
            toast('Failed to sync premium LoRAs. Is the backend running?', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRefreshModels = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch(api(BACKEND_API.ENDPOINTS.COMFY_REFRESH_MODELS));
            if (!res.ok) throw new Error('Refresh failed');
            toast('ComfyUI model list refreshed!', 'success');
        } catch {
            toast('Failed to refresh ComfyUI models', 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleUninstall = (lora: LoraEntry) => {
        if (!confirm(`Uninstall ${lora.name}? This will remove the file from disk.`)) return;
        setLoras(ls => ls.map(l => l.id === lora.id ? { ...l, installed: false } : l));
        toast(`${lora.name} uninstalled`, 'info');
    };

    return {
        loras,
        downloading,
        isRefreshing,
        isSyncing,
        handleDownload,
        handleSyncAll,
        handleRefreshModels,
        handleUninstall
    };
};
