import { Download, Trash2, BrainCircuit, Search, RotateCw, CheckCircle2, AlertCircle, ExternalLink, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CatalogShell, CatalogCard } from '../components/layout/CatalogShell';
import { useOllamaManager } from '../hooks/useOllamaManager';
import { useRunPodSettings } from '../hooks/useRunPodSettings';

export const SettingsPage = () => {
    const {
        installedModels,
        isLoadingModels,
        modelCategory,
        setModelCategory,
        activeList,
        selectedModel,
        setSelectedModel,
        customModel,
        setCustomModel,
        isPulling,
        pullProgress,
        pullError,
        refreshModels,
        handlePull,
        handleDelete
    } = useOllamaManager();

    const {
        runpodUrl,
        setRunpodUrl,
        runpodToken,
        setRunpodToken,
        runpodExplorerUrl,
        setRunpodExplorerUrl,
        nodeInstallStatus,
        isLoadingNodeStatus,
        saveRunpodSettings,
        deriveComfyUiUrl,
        openExternal,
        openRunpodExplorer,
        refreshNodeInstallStatus
    } = useRunPodSettings();

    const formatSize = (bytes: number) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    return (
        <CatalogShell
            title="AI Model Manager"
            subtitle="Manage your Ollama models for Text generation and Image captioning."
            icon={BrainCircuit}
            maxWidthClassName="max-w-6xl"
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Download / Manager */}
                <CatalogCard className="p-6 shadow-xl space-y-6">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-white" /> Download New Models
                    </h2>

                    {/* Category Tabs */}
                    <div className="flex bg-[#0a0a0f] p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setModelCategory('text')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${modelCategory === 'text'
                                ? 'bg-white text-black shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Text Generation
                        </button>
                        <button
                            onClick={() => setModelCategory('vision')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${modelCategory === 'vision'
                                ? 'bg-white text-black shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Vision / Caption
                            </span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Recommended {modelCategory === 'text' ? 'Chat' : 'Vision'} Models
                            </label>
                            <select
                                value={selectedModel}
                                onChange={(e) => {
                                    setSelectedModel(e.target.value);
                                    setCustomModel('');
                                }}
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                {activeList.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.label} ({m.id})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2 italic">
                                {activeList.find(m => m.id === selectedModel)?.description}
                            </p>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/5" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#121218] px-2 text-slate-500">Or search custom</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Custom Model Tag
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={customModel}
                                    onChange={(e) => setCustomModel(e.target.value)}
                                    placeholder="e.g. llama3:8b (Press Enter to search...)"
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Enter any tag from <a href="https://ollama.com/library" target="_blank" className="text-white hover:underline">ollama.com/library</a>
                            </p>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full h-12 text-md bg-white text-black hover:bg-slate-200"
                            onClick={handlePull}
                            isLoading={isPulling}
                            disabled={isPulling}
                        >
                            {isPulling ? 'Downloading...' : 'Pull Model'}
                        </Button>

                        {/* Progress Status */}
                        {(isPulling || pullProgress) && (
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 font-medium">{pullProgress?.status}</span>
                                    {pullProgress?.total && pullProgress?.completed && (
                                        <span className="text-white">
                                            {Math.round((pullProgress.completed / pullProgress.total) * 100)}%
                                        </span>
                                    )}
                                </div>
                                {pullProgress?.total && pullProgress?.completed && (
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-300"
                                            style={{ width: `${(pullProgress.completed / pullProgress.total) * 100}%` }}
                                        />
                                    </div>
                                )}
                                {pullProgress?.status === 'success' && (
                                    <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                                        <CheckCircle2 className="w-4 h-4" /> Download Complete!
                                    </div>
                                )}
                            </div>
                        )}

                        {pullError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                <AlertCircle className="w-4 h-4" /> {pullError}
                            </div>
                        )}
                    </div>
                </CatalogCard>

                {/* RIGHT: Installed Models */}
                <CatalogCard className="p-6 shadow-xl flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-blue-400" /> Installed Models
                        </h2>
                        <Button variant="ghost" size="sm" onClick={refreshModels} disabled={isLoadingModels}>
                            <RotateCw className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[500px]">
                        {installedModels.length === 0 ? (
                            <div className="text-center text-slate-500 py-10">
                                {isLoadingModels ? 'Loading models...' : 'No models installed via Ollama yet.'}
                            </div>
                        ) : (
                            installedModels.map((model) => (
                                <div key={model.digest} className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 transition-all flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-200">{model.name}</h3>
                                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                            <span>{formatSize(model.size)}</span>
                                            <span>Updated: {new Date(model.modified_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(model.name)}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-2"
                                        title="Delete Model"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </CatalogCard>
            </div>

            {/* RunPod Settings Section */}
            <CatalogCard className="p-6 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    â˜ï¸ Cloud Engines / RunPod Integration
                </h2>
                <p className="text-sm text-slate-400">
                    Enter your RunPod Serverless or Pod endpoint URL and Bearer token below. This allows you to select images in the Gallery and render Wan2.1 First/Last Frame loops directly in the cloud.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                            RunPod Endpoint URL (e.g., https://xyz-8188.proxy.runpod.net/prompt)
                        </label>
                        <input
                            type="text"
                            value={runpodUrl}
                            onChange={(e) => setRunpodUrl(e.target.value)}
                            placeholder="https://[YOUR_POD_ID]-[PORT].proxy.runpod.net/prompt"
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                            RunPod Bearer Token (Optional if using Proxy / No-Auth)
                        </label>
                        <input
                            type="password"
                            value={runpodToken}
                            onChange={(e) => setRunpodToken(e.target.value)}
                            placeholder="Bearer xyz123..."
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                            RunPod File Explorer URL (Optional override)
                        </label>
                        <input
                            type="text"
                            value={runpodExplorerUrl}
                            onChange={(e) => setRunpodExplorerUrl(e.target.value)}
                            placeholder="https://[YOUR_POD_ID]-8888.proxy.runpod.net/lab/tree"
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            If empty, explorer defaults to your endpoint base URL. For Jupyter/Lab file browser, paste the full /lab/tree URL.
                        </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs uppercase tracking-wider text-slate-400">Node Install Status</div>
                            <button
                                onClick={refreshNodeInstallStatus}
                                className="text-xs text-slate-300 hover:text-white"
                                type="button"
                            >
                                {isLoadingNodeStatus ? 'Checking...' : 'Refresh'}
                            </button>
                        </div>
                        {nodeInstallStatus ? (
                            <>
                                <div className="text-sm text-slate-200">
                                    {nodeInstallStatus.phase === 'completed'
                                        ? 'Completed'
                                        : nodeInstallStatus.phase === 'core_ready_full_installing'
                                            ? 'Core ready, full install running in background'
                                            : 'Pending / starting'}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Core: {nodeInstallStatus.core_installed ? 'yes' : 'no'} | Full: {nodeInstallStatus.full_installed ? 'yes' : 'no'}
                                </div>
                                {nodeInstallStatus.bg_log_tail?.length > 0 && (
                                    <pre className="text-[11px] text-slate-500 max-h-28 overflow-auto whitespace-pre-wrap">{nodeInstallStatus.bg_log_tail.slice(-6).join('\n')}</pre>
                                )}
                            </>
                        ) : (
                            <div className="text-xs text-slate-500">Status unavailable (works in docker/runpod backend).</div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Button variant="secondary" onClick={() => openExternal(deriveComfyUiUrl(), 'ComfyUI')}>
                            <ExternalLink className="w-4 h-4" /> Open ComfyUI
                        </Button>
                        <Button variant="secondary" onClick={openRunpodExplorer}>
                            <FolderOpen className="w-4 h-4" /> Open File Explorer
                        </Button>
                        <Button variant="primary" onClick={saveRunpodSettings}>
                            Save Cloud Settings
                        </Button>
                    </div>
                </div>
            </CatalogCard>

        </CatalogShell>
    );
};




