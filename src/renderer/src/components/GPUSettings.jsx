import React, { useState, useEffect } from 'react';

const GPUSettings = () => {
    const [gpuInfo, setGpuInfo] = useState(null);
    const [gpuSettings, setGpuSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGPUInfo();
    }, []);

    const loadGPUInfo = async () => {
        try {
            setLoading(true);
            const [info, settings] = await Promise.all([
                window.api.gpuDetect(),
                window.api.gpuGetSettings()
            ]);
            setGpuInfo(info);
            setGpuSettings(settings);
        } catch (error) {
            console.error('Error loading GPU info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = async (path, value) => {
        const keys = path.split('.');
        const newSettings = { ...gpuSettings };
        let target = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;

        setGpuSettings(newSettings);
        await window.api.gpuUpdateSettings(newSettings);
    };

    if (loading) {
        return (
            <div className="gpu-settings">
                <h3 className="text-lg font-semibold mb-4">🎮 GPU 加速设置</h3>
                <div className="text-gray-500">检测 GPU 中...</div>
            </div>
        );
    }

    if (!gpuInfo || gpuInfo.error) {
        return (
            <div className="gpu-settings">
                <h3 className="text-lg font-semibold mb-4">🎮 GPU 加速设置</h3>
                <div className="text-red-500">GPU 检测失败: {gpuInfo?.error || '未知错误'}</div>
            </div>
        );
    }

    const primaryGPU = gpuInfo.primaryGPU;

    return (
        <div className="gpu-settings space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">🎮 GPU 加速设置</h3>
            </div>

            {/* GPU Information */}
            {primaryGPU && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-3">检测到的 GPU</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">型号:</span>
                            <span className="font-medium">{primaryGPU.model}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">厂商:</span>
                            <span className="font-medium">{primaryGPU.vendor}</span>
                        </div>
                        {primaryGPU.vram > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">显存:</span>
                                <span className="font-medium">{Math.round(primaryGPU.vram / 1024)} GB</span>
                            </div>
                        )}
                        {primaryGPU.driver && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">驱动:</span>
                                <span className="font-medium">{primaryGPU.driver}</span>
                            </div>
                        )}
                        {gpuInfo.recommendedConcurrency && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">推荐并发:</span>
                                <span className="font-medium">{gpuInfo.recommendedConcurrency} 个任务</span>
                            </div>
                        )}
                    </div>

                    {/* Supported Codecs */}
                    {primaryGPU.capabilities && (
                        <div className="mt-4">
                            <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">支持的编码器:</h5>
                            <div className="flex flex-wrap gap-2">
                                {primaryGPU.capabilities.supportedCodecs?.map(codec => (
                                    <span key={codec} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                        {codec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* GPU Acceleration Toggle */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">启用 GPU 加速</div>
                        <div className="text-sm text-gray-500">利用 GPU 硬件加速视频、图片和文档处理</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={gpuSettings?.enabled ?? true}
                            onChange={(e) => handleSettingChange('enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Video GPU Acceleration */}
                <div className="flex items-center justify-between ml-4">
                    <div>
                        <div className="font-medium">视频处理加速</div>
                        <div className="text-sm text-gray-500">使用 {primaryGPU?.vendor} GPU 加速视频转码</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={gpuSettings?.video?.enabled ?? true}
                            onChange={(e) => handleSettingChange('video.enabled', e.target.checked)}
                            disabled={!gpuSettings?.enabled}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                </div>

                {/* Image GPU Acceleration */}
                <div className="flex items-center justify-between ml-4">
                    <div>
                        <div className="font-medium">图片处理加速</div>
                        <div className="text-sm text-gray-500">批量图片处理和滤镜加速</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={gpuSettings?.image?.enabled ?? true}
                            onChange={(e) => handleSettingChange('image.enabled', e.target.checked)}
                            disabled={!gpuSettings?.enabled}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                </div>

                {/* Document GPU Acceleration */}
                <div className="flex items-center justify-between ml-4">
                    <div>
                        <div className="font-medium">文档处理加速</div>
                        <div className="text-sm text-gray-500">PDF/Office 文档渲染和转换加速</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={gpuSettings?.document?.enabled ?? true}
                            onChange={(e) => handleSettingChange('document.enabled', e.target.checked)}
                            disabled={!gpuSettings?.enabled}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                </div>

                {/* CPU Fallback */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">自动回退到 CPU</div>
                        <div className="text-sm text-gray-500">GPU 失败时自动使用 CPU 处理</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={gpuSettings?.fallbackToCPU ?? true}
                            onChange={(e) => handleSettingChange('fallbackToCPU', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {/* Performance Hint */}
            {gpuInfo.hasNVIDIA && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                            <p className="font-medium text-green-800 dark:text-green-200">NVIDIA GPU 检测成功</p>
                            <p className="text-green-700 dark:text-green-300 mt-1">
                                视频转码速度预计提升 <strong>5-15倍</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!gpuInfo.hasNVIDIA && !gpuInfo.hasAMD && !gpuInfo.hasIntel && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">未检测到支持的 GPU</p>
                            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                将使用 CPU 进行处理。建议使用 NVIDIA/AMD/Intel GPU 以获得更快速度。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPUSettings;
