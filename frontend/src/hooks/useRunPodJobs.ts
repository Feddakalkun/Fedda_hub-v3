import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { BACKEND_API } from '../config/api';

const api = (endpoint: string) => `${BACKEND_API.BASE_URL}${endpoint}`;
const POLL_INTERVAL = 3000;

export interface RunPodOutput {
    filename: string;
    subfolder: string;
    type: string;
    preview_url: string;
    local_url?: string;
}

export interface RunPodJob {
    promptId: string;
    status: 'uploading' | 'queued' | 'processing' | 'completed' | 'error' | 'pod_loading';
    statusText: string;
    startedAt: number;
    outputs: RunPodOutput[];
}

interface MediaFileLite {
    filename: string;
    subfolder: string;
    type: string;
}

export const useRunPodJobs = (onJobComplete?: () => void) => {
    const { toast } = useToast();
    const [runpodJobs, setRunpodJobs] = useState<RunPodJob[]>([]);
    const [isAnimatingRunPod, setIsAnimatingRunPod] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const pollRunPodJobs = useCallback(async () => {
        const runpodUrl = localStorage.getItem('runpodUrl') || '';
        const runpodToken = localStorage.getItem('runpodToken') || '';
        if (!runpodUrl) return;

        setRunpodJobs(prev => {
            const activeJobs = prev.filter(j => !['completed', 'error'].includes(j.status));
            if (activeJobs.length === 0) return prev;

            activeJobs.forEach(async (job) => {
                try {
                    const res = await fetch(api(BACKEND_API.ENDPOINTS.RUNPOD_STATUS), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt_id: job.promptId, runpod_url: runpodUrl, runpod_token: runpodToken })
                    });
                    const data = await res.json();

                    setRunpodJobs(current => current.map(j => {
                        if (j.promptId !== job.promptId) return j;

                        if (data.completed) {
                            data.outputs?.forEach(async (output: RunPodOutput) => {
                                try {
                                    const dlRes = await fetch(api(BACKEND_API.ENDPOINTS.RUNPOD_DOWNLOAD), {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            runpod_url: runpodUrl, runpod_token: runpodToken,
                                            filename: output.filename, subfolder: output.subfolder, file_type: output.type
                                        })
                                    });
                                    const dlData = await dlRes.json();
                                    if (dlData.success) output.local_url = dlData.url;
                                } catch (e) {
                                    console.error('Download error:', e);
                                }
                            });

                            toast('RunPod render complete! Video downloaded.', 'success');
                            if (onJobComplete) {
                                setTimeout(onJobComplete, 2000);
                            }
                            return { ...j, status: 'completed' as const, statusText: 'Video ready!', outputs: data.outputs || [] };
                        }

                        let status: RunPodJob['status'] = 'queued';
                        if (data.status === 'processing') status = 'processing';
                        else if (data.status === 'pod_loading') status = 'pod_loading';
                        return { ...j, status, statusText: data.status };
                    }));
                } catch (e) {
                    console.error('Poll error:', e);
                }
            });

            return prev;
        });
    }, [onJobComplete, toast]);

    // Start/stop polling based on active jobs
    useEffect(() => {
        const activeJobs = runpodJobs.filter(j => !['completed', 'error'].includes(j.status));
        if (activeJobs.length > 0 && !pollRef.current) {
            pollRef.current = setInterval(() => pollRunPodJobs(), POLL_INTERVAL);
        } else if (activeJobs.length === 0 && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, [runpodJobs, pollRunPodJobs]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const startRunPodAnimation = async (selectedFiles: MediaFileLite[], onSuccess?: () => void) => {
        const runpodUrl = localStorage.getItem('runpodUrl');
        if (!runpodUrl) {
            toast('Configure your RunPod Endpoint URL in Settings first!', 'error');
            return;
        }

        if (selectedFiles.length === 0) return;

        setIsAnimatingRunPod(true);

        const tempJobId = `uploading_${Date.now()}`;
        setRunpodJobs(prev => [...prev, {
            promptId: tempJobId,
            status: 'uploading',
            statusText: `Uploading ${selectedFiles.length} images to RunPod...`,
            startedAt: Date.now(),
            outputs: []
        }]);

        try {
            const response = await fetch(api(BACKEND_API.ENDPOINTS.RUNPOD_ANIMATE), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: selectedFiles.map(f => ({ filename: f.filename, subfolder: f.subfolder, type: f.type })),
                    runpod_url: runpodUrl,
                    runpod_token: localStorage.getItem('runpodToken') || ''
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'RunPod error');

            setRunpodJobs(prev => prev.map(j =>
                j.promptId === tempJobId
                    ? { ...j, promptId: data.prompt_id, status: 'queued' as const, statusText: 'Job queued on RunPod' }
                    : j
            ));
            toast('Job sent to RunPod! Tracking progress...', 'success');

            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error('RunPod trigger error:', error);
            setRunpodJobs(prev => prev.map(j =>
                j.promptId === tempJobId
                    ? { ...j, status: 'error' as const, statusText: error.message }
                    : j
            ));
            toast(`RunPod error: ${error.message}`, 'error');
        } finally {
            setIsAnimatingRunPod(false);
        }
    };

    const dismissJob = (promptId: string) => {
        setRunpodJobs(prev => prev.filter(j => j.promptId !== promptId));
    };

    return {
        runpodJobs,
        isAnimatingRunPod,
        startRunPodAnimation,
        dismissJob
    };
};
