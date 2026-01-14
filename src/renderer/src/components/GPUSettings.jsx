import React, { useState, useEffect } from 'react';

const GPUSettings = () => {
    const [gpuInfo, setGpuInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGPUInfo();
    }, []);

    const loadGPUInfo = async () => {
        try {
            setLoading(true);
            const info = await window.api.gpuDetect();
            setGpuInfo(info);
        } catch (error) {
            console.error('Error loading GPU info:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="gpu-settings">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2196F3]">memory</span>
                    GPU Acceleration
                </h3>
                <div className="text-gray-500">Detecting GPU...</div>
            </div>
        );
    }

    if (!gpuInfo || gpuInfo.error) {
        return (
            <div className="gpu-settings">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2196F3]">memory</span>
                    GPU Acceleration
                </h3>
                <div className="text-red-500">GPU detection failed: {gpuInfo?.error || 'Unknown error'}</div>
            </div>
        );
    }

    const primaryGPU = gpuInfo.primaryGPU;

    return (
        <div className="gpu-settings space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2196F3]">memory</span>
                    GPU Acceleration
                </h3>
                <p className="text-sm text-gray-500">
                    GPU acceleration is automatically enabled for optimal performance.
                </p>
            </div>

            {/* GPU Information */}
            {primaryGPU && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Detected GPU
                    </h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Model:</span>
                            <span className="font-medium">{primaryGPU.model}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                            <span className="font-medium">{primaryGPU.vendor}</span>
                        </div>
                        {primaryGPU.vram > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">VRAM:</span>
                                <span className="font-medium">{Math.round(primaryGPU.vram / 1024)} GB</span>
                            </div>
                        )}
                        {primaryGPU.driver && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Driver:</span>
                                <span className="font-medium">{primaryGPU.driver}</span>
                            </div>
                        )}
                        {gpuInfo.recommendedConcurrency && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Recommended Concurrency:</span>
                                <span className="font-medium">{gpuInfo.recommendedConcurrency} tasks</span>
                            </div>
                        )}
                    </div>

                    {/* Supported Codecs */}
                    {primaryGPU.capabilities && primaryGPU.capabilities.supportedCodecs?.length > 0 && (
                        <div className="mt-4">
                            <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Supported Codecs:</h5>
                            <div className="flex flex-wrap gap-2">
                                {primaryGPU.capabilities.supportedCodecs.map(codec => (
                                    <span key={codec} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                        {codec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Hint */}
            {gpuInfo.hasNVIDIA && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 mr-3">check_circle</span>
                        <div className="text-sm">
                            <p className="font-medium text-green-800 dark:text-green-200">NVIDIA GPU Detected</p>
                            <p className="text-green-700 dark:text-green-300 mt-1">
                                Video transcoding speed expected to improve by <strong>5-15x</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {gpuInfo.hasAMD && !gpuInfo.hasNVIDIA && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 mr-3">check_circle</span>
                        <div className="text-sm">
                            <p className="font-medium text-green-800 dark:text-green-200">AMD GPU Detected</p>
                            <p className="text-green-700 dark:text-green-300 mt-1">
                                Hardware acceleration enabled for faster processing.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {gpuInfo.hasIntel && !gpuInfo.hasNVIDIA && !gpuInfo.hasAMD && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 mr-3">check_circle</span>
                        <div className="text-sm">
                            <p className="font-medium text-green-800 dark:text-green-200">Intel GPU Detected</p>
                            <p className="text-green-700 dark:text-green-300 mt-1">
                                Quick Sync Video enabled for faster encoding.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!gpuInfo.hasNVIDIA && !gpuInfo.hasAMD && !gpuInfo.hasIntel && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 mr-3">warning</span>
                        <div className="text-sm">
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">No Supported GPU Detected</p>
                            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                CPU will be used for processing. For faster speeds, consider using an NVIDIA, AMD, or Intel GPU.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPUSettings;
