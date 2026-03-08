import { useState, useRef, useEffect } from 'react';
import { Download, User, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BACKEND_API } from '../../config/api';

const COOKIE_OPTIONS = [
    { value: 'none', label: 'No Cookies' },
    { value: 'chrome', label: 'Chrome' },
    { value: 'edge', label: 'Edge' },
    { value: 'firefox', label: 'Firefox' },
];

interface DownloadJob {
    jobId: string;
    type: 'profile' | 'video';
    url: string;
    status: 'downloading' | 'done' | 'error';
    progress?: string;
    downloaded?: number;
    total?: number;
}

export const DownloadTab = ({ onDownloadComplete }: { onDownloadComplete?: () => void }) => {
    const [profileUrl, setProfileUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [cookieSource, setCookieSource] = useState('none');
    const [limit, setLimit] = useState('');
    const [jobs, setJobs] = useState<DownloadJob[]>([]);
    const pollRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

    // Poll job status
    const pollJob = (jobId: string) => {
        if (pollRef.current[jobId]) return;
        pollRef.current[jobId] = setInterval(async () => {
            try {
                const res = await fetch(`${BACKEND_API.BASE_URL}/api/tiktok/download-status/${jobId}`);
                const data = await res.json();
                setJobs(prev => prev.map(j => {
                    if (j.jobId !== jobId) return j;
                    if (data.status === 'done' || data.status === 'error') {
                        clearInterval(pollRef.current[jobId]);
                        delete pollRef.current[jobId];
                        if (data.status === 'done') onDownloadComplete?.();
                    }
                    return {
                        ...j,
                        status: data.status,
                        progress: data.message,
                        downloaded: data.downloaded,
                        total: data.total,
                    };
                }));
            } catch {
                // keep polling
            }
        }, 1500);
    };

    useEffect(() => {
        return () => {
            Object.values(pollRef.current).forEach(clearInterval);
        };
    }, []);

    const handleDownloadProfile = async () => {
        if (!profileUrl.trim()) return;
        try {
            const res = await fetch(`${BACKEND_API.BASE_URL}/api/tiktok/download-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: profileUrl.trim(),
                    cookie_source: cookieSource === 'none' ? null : cookieSource,
                    limit: limit ? parseInt(limit) : null,
                }),
            });
            const data = await res.json();
            if (data.job_id) {
                const job: DownloadJob = {
                    jobId: data.job_id,
                    type: 'profile',
                    url: profileUrl,
                    status: 'downloading',
                };
                setJobs(prev => [job, ...prev]);
                pollJob(data.job_id);
                setProfileUrl('');
            }
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const handleDownloadVideo = async () => {
        if (!videoUrl.trim()) return;
        try {
            const res = await fetch(`${BACKEND_API.BASE_URL}/api/tiktok/download-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: videoUrl.trim(),
                    cookie_source: cookieSource === 'none' ? null : cookieSource,
                }),
            });
            const data = await res.json();
            if (data.job_id) {
                const job: DownloadJob = {
                    jobId: data.job_id,
                    type: 'video',
                    url: videoUrl,
                    status: 'downloading',
                };
                setJobs(prev => [job, ...prev]);
                pollJob(data.job_id);
                setVideoUrl('');
            }
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Profile Download */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    Download Profile
                </div>
                <input
                    value={profileUrl}
                    onChange={e => setProfileUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@username"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleDownloadProfile()}
                />
                <div className="flex gap-3">
                    <input
                        value={limit}
                        onChange={e => setLimit(e.target.value.replace(/\D/g, ''))}
                        placeholder="Limit (blank = all)"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/20"
                    />
                    <select
                        value={cookieSource}
                        onChange={e => setCookieSource(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
                    >
                        {COOKIE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleDownloadProfile}
                    disabled={!profileUrl.trim()}
                    className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all bg-white text-black hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4 inline mr-2" />
                    Download Profile
                </button>
            </div>

            {/* Single Video Download */}
            <div className="bg-[#121218] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <Video className="w-4 h-4 text-slate-400" />
                    Download Single Video
                </div>
                <input
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@user/video/1234567890"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleDownloadVideo()}
                />
                <button
                    onClick={handleDownloadVideo}
                    disabled={!videoUrl.trim()}
                    className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4 inline mr-2" />
                    Download Video
                </button>
            </div>

            {/* Active Jobs */}
            {jobs.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Downloads</div>
                    {jobs.map(job => (
                        <div key={job.jobId} className="bg-[#121218] border border-white/5 rounded-xl p-4 flex items-center gap-3">
                            {job.status === 'downloading' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />}
                            {job.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                            {job.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-white truncate">{job.url}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                    {job.progress || (job.status === 'downloading' ? 'Starting...' : job.status)}
                                    {job.downloaded !== undefined && job.total ? ` (${job.downloaded}/${job.total})` : ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
