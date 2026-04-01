import { useState, useCallback } from 'react';
import { WorkbenchShell } from '../components/layout/WorkbenchShell';
import { ImageGallery } from '../components/image/ImageGallery';
import { PonyXLGenerateTab } from '../components/ponyxl/PonyXLGenerateTab';

interface PonyXLPageProps {
    modelId: string;
    modelLabel: string;
}

export const PonyXLPage = ({ modelId }: PonyXLPageProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>(() => {
        const saved = localStorage.getItem(`gallery_${modelId}`);
        return saved ? JSON.parse(saved) : [];
    });

    const handleSendToTab = useCallback((_tab: string, _imageUrl: string) => {
        // Future: route to inpaint/img2img tabs
    }, []);

    return (
        <WorkbenchShell
            leftWidthClassName="w-[520px]"
            leftPaneClassName="p-4"
            collapsible
            collapseKey="ponyxl_preview_collapsed"
            leftPane={
                <div className="px-4 mt-4">
                    <PonyXLGenerateTab isGenerating={isGenerating} setIsGenerating={setIsGenerating} />
                </div>
            }
            rightPane={
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                    <ImageGallery
                        generatedImages={generatedImages}
                        setGeneratedImages={setGeneratedImages}
                        isGenerating={isGenerating}
                        setIsGenerating={setIsGenerating}
                        galleryKey={modelId}
                        onSendToTab={handleSendToTab}
                    />
                </div>
            }
        />
    );
};
