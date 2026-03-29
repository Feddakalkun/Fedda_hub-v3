import { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';

export interface NodeInstallStatus {
    success: boolean;
    phase: 'pending' | 'core_ready_full_installing' | 'completed';
    core_installed: boolean;
    full_installed: boolean;
    bg_log_tail: string[];
}

export const useRunPodSettings = () => {
    const { toast } = useToast();
    const [computeMode, setComputeMode] = useState<'local' | 'runpod_pod' | 'runpod_serverless_batch'>('local');
    const [runpodUrl, setRunpodUrl] = useState('');
    const [runpodToken, setRunpodToken] = useState('');
    const [runpodExplorerUrl, setRunpodExplorerUrl] = useState('');
    const [idleStopMinutes, setIdleStopMinutes] = useState(15);
    const [nodeInstallStatus, setNodeInstallStatus] = useState<NodeInstallStatus | null>(null);
    const [isLoadingNodeStatus, setIsLoadingNodeStatus] = useState(false);

    useEffect(() => {
        const rawMode = (localStorage.getItem('fedda_compute_mode') || 'local').trim();
        if (rawMode === 'runpod_pod' || rawMode === 'runpod_serverless_batch') {
            setComputeMode(rawMode);
        } else {
            setComputeMode('local');
        }
        setRunpodUrl(localStorage.getItem('runpodUrl') || '');
        setRunpodToken(localStorage.getItem('runpodToken') || '');
        setRunpodExplorerUrl(localStorage.getItem('runpodExplorerUrl') || '');
        const idleRaw = Number(localStorage.getItem('fedda_idle_stop_minutes') || '15');
        if (Number.isFinite(idleRaw) && idleRaw > 0) {
            setIdleStopMinutes(Math.round(idleRaw));
        }
    }, []);

    const saveRunpodSettings = () => {
        localStorage.setItem('fedda_compute_mode', computeMode);
        localStorage.setItem('runpodUrl', runpodUrl);
        localStorage.setItem('runpodToken', runpodToken);
        localStorage.setItem('runpodExplorerUrl', runpodExplorerUrl);
        localStorage.setItem('fedda_idle_stop_minutes', String(idleStopMinutes));
        toast('RunPod settings saved!', 'success');
    };

    const deriveRunpodBase = (url: string) => {
        const trimmed = url.trim();
        if (!trimmed) return '';
        return trimmed.replace(/\/prompt\/?$/i, '');
    };

    const runpodBaseUrl = deriveRunpodBase(runpodUrl);

    const deriveComfyUiUrl = () => {
        const source = runpodBaseUrl || runpodUrl.trim();

        if (!source) {
            const host = window.location.host;
            if (/\.proxy\.runpod\.net$/i.test(host)) {
                const comfyHost = host.replace(/-\d+(\.proxy\.runpod\.net)$/i, '-8199$1');
                return `${window.location.protocol}//${comfyHost}/`;
            }
            return '/comfy/';
        }

        try {
            const parsed = new URL(source);
            if (/\.proxy\.runpod\.net$/i.test(parsed.host)) {
                parsed.host = parsed.host.replace(/-\d+(\.proxy\.runpod\.net)$/i, '-8199$1');
            } else if (parsed.port) {
                parsed.port = '8199';
            }
            parsed.pathname = '/';
            parsed.search = '';
            parsed.hash = '';
            return parsed.toString();
        } catch {
            return `${source.replace(/\/+$/i, '').replace(/\/prompt\/?$/i, '')}/`;
        }
    };

    const openExternal = (url: string, label: string) => {
        if (!url) {
            toast(`No ${label} URL configured yet.`, 'error');
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const explorerCandidates = () => {
        const override = runpodExplorerUrl.trim();
        if (override) return [override];
        if (!runpodBaseUrl) return [];
        return [
            `${runpodBaseUrl}/lab/tree`,
            `${runpodBaseUrl}/tree`,
            `${runpodBaseUrl}/files`,
            `${runpodBaseUrl}/`
        ];
    };

    const probeReachable = async (url: string) => {
        try {
            await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
            return true;
        } catch {
            return false;
        }
    };

    const refreshNodeInstallStatus = async () => {
        setIsLoadingNodeStatus(true);
        try {
            const res = await fetch('/api/system/node-install-status');
            if (!res.ok) return;
            const data = await res.json();
            if (data?.success) {
                setNodeInstallStatus(data);
            }
        } catch {
            // likely not running in RunPod/docker backend
        } finally {
            setIsLoadingNodeStatus(false);
        }
    };

    const openRunpodExplorer = async () => {
        const candidates = explorerCandidates();
        if (candidates.length === 0) {
            toast('No RunPod base URL configured yet.', 'error');
            return;
        }

        for (const candidate of candidates) {
            if (await probeReachable(candidate)) {
                window.open(candidate, '_blank', 'noopener,noreferrer');
                toast(`Opening explorer: ${candidate}`, 'info');
                return;
            }
        }

        toast('Could not reach RunPod file explorer. Set full Explorer URL (e.g. /lab/tree).', 'error');
    };

    useEffect(() => {
        refreshNodeInstallStatus();
        const timer = setInterval(refreshNodeInstallStatus, 6000);
        return () => clearInterval(timer);
    }, []);

    return {
        computeMode,
        setComputeMode,
        runpodUrl,
        setRunpodUrl,
        runpodToken,
        setRunpodToken,
        runpodExplorerUrl,
        setRunpodExplorerUrl,
        idleStopMinutes,
        setIdleStopMinutes,
        nodeInstallStatus,
        isLoadingNodeStatus,
        saveRunpodSettings,
        deriveComfyUiUrl,
        openExternal,
        openRunpodExplorer,
        refreshNodeInstallStatus
    };
};
