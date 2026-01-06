import gpuDetector from '../services/gpuDetector.js';
import gpuSettings from '../services/gpuSettings.js';

/**
 * FFmpeg GPU-Accelerated Parameter Builder
 * Generates FFmpeg parameters with hardware acceleration support
 */
class FFmpegGPUBuilder {
    constructor() {
        this.capabilities = null;
    }

    /**
     * Initialize GPU capabilities
     */
    async init() {
        if (!this.capabilities) {
            this.capabilities = await gpuDetector.getCapabilities();
        }
        return this.capabilities;
    }

    /**
     * Build GPU-accelerated FFmpeg parameters for video encoding
     * @param {Object} options - Conversion options
     * @returns {Object} FFmpeg parameters { inputOptions, outputOptions, videoCodec }
     */
    async buildVideoParams(options = {}) {
        await this.init();

        const {
            codec = 'h264',          // h264, h265/hevc, vp9, av1
            quality = 'standard',    // fast, standard, high
            resolution,              // '720p', '1080p', '4k' or 'original'
            fps,                     // Target framerate
            bitrate,                 // Target bitrate (e.g., '5M')
            crf,                     // Constant Rate Factor (quality)
            preset = 'balanced'      // fast, balanced, quality
        } = options;

        // Check if GPU acceleration is enabled
        const gpuEnabled = gpuSettings.isVideoGPUEnabled();

        if (!gpuEnabled || !this.capabilities?.primaryGPU) {
            return this._buildCPUParams(options);
        }

        const gpu = this.capabilities.primaryGPU;

        // NVIDIA GPU
        if (gpu.vendor === 'NVIDIA' && gpu.capabilities.nvenc) {
            return this._buildNVENCParams(codec, quality, preset, options);
        }

        // AMD GPU
        if (gpu.vendor === 'AMD' && gpu.capabilities.amf) {
            return this._buildAMFParams(codec, quality, preset, options);
        }

        // Intel GPU
        if (gpu.vendor === 'Intel' && gpu.capabilities.qsv) {
            return this._buildQSVParams(codec, quality, preset, options);
        }

        // Fallback to CPU
        return this._buildCPUParams(options);
    }

    /**
     * Build NVIDIA NVENC parameters
     */
    _buildNVENCParams(codec, quality, preset, options) {
        const encoderMap = {
            'h264': 'h264_nvenc',
            'h265': 'hevc_nvenc',
            'hevc': 'hevc_nvenc',
            'av1': 'av1_nvenc'
        };

        const encoder = encoderMap[codec] || 'h264_nvenc';

        // NVENC preset mapping (p1-p7 for newer GPUs)
        const presetMap = {
            'fast': 'p1',       // Fastest
            'balanced': 'p4',   // Balanced
            'quality': 'p7'     // Best quality
        };

        const nvencPreset = presetMap[preset] || 'p4';

        const inputOptions = [
            '-hwaccel', 'cuda',
            '-hwaccel_output_format', 'cuda'  // Keep frames in GPU memory
        ];

        const outputOptions = [
            '-preset', nvencPreset
        ];

        // Quality settings
        if (options.crf !== undefined) {
            outputOptions.push('-cq', String(options.crf));  // NVENC CQ (constant quality)
        } else {
            const qualityMap = { fast: 28, standard: 23, high: 18 };
            outputOptions.push('-cq', String(qualityMap[quality] || 23));
        }

        // Bitrate (if specified)
        if (options.bitrate) {
            outputOptions.push('-b:v', options.bitrate);
        }

        // GPU-accelerated filters
        const filters = [];
        if (options.resolution && options.resolution !== 'original') {
            const resMap = { '720p': '1280:720', '1080p': '1920:1080', '4k': '3840:2160' };
            if (resMap[options.resolution]) {
                filters.push(`scale_cuda=${resMap[options.resolution]}`);
            }
        }

        if (filters.length > 0) {
            outputOptions.push('-vf', filters.join(','));
        }

        // FPS
        if (options.fps) {
            outputOptions.push('-r', String(options.fps));
        }

        return {
            inputOptions,
            outputOptions,
            videoCodec: encoder,
            hwaccel: 'nvidia'
        };
    }

    /**
     * Build AMD AMF parameters
     */
    _buildAMFParams(codec, quality, preset, options) {
        const encoderMap = {
            'h264': 'h264_amf',
            'h265': 'hevc_amf',
            'hevc': 'hevc_amf'
        };

        const encoder = encoderMap[codec] || 'h264_amf';

        const presetMap = {
            'fast': 'speed',
            'balanced': 'balanced',
            'quality': 'quality'
        };

        const amfQuality = presetMap[preset] || 'balanced';

        const inputOptions = [
            '-hwaccel', 'auto'
        ];

        const outputOptions = [
            '-quality', amfQuality
        ];

        // Quality (AMF uses rc mode)
        if (options.crf !== undefined) {
            outputOptions.push('-qp_i', String(options.crf));
            outputOptions.push('-qp_p', String(options.crf));
        }

        // Bitrate
        if (options.bitrate) {
            outputOptions.push('-b:v', options.bitrate);
        }

        // Resolution (CPU filter for AMD)
        if (options.resolution && options.resolution !== 'original') {
            const resMap = { '720p': '1280x720', '1080p': '1920x1080', '4k': '3840x2160' };
            if (resMap[options.resolution]) {
                outputOptions.push('-s', resMap[options.resolution]);
            }
        }

        // FPS
        if (options.fps) {
            outputOptions.push('-r', String(options.fps));
        }

        return {
            inputOptions,
            outputOptions,
            videoCodec: encoder,
            hwaccel: 'amd'
        };
    }

    /**
     * Build Intel QSV parameters
     */
    _buildQSVParams(codec, quality, preset, options) {
        const encoderMap = {
            'h264': 'h264_qsv',
            'h265': 'hevc_qsv',
            'hevc': 'hevc_qsv',
            'vp9': 'vp9_qsv',
            'av1': 'av1_qsv'
        };

        const encoder = encoderMap[codec] || 'h264_qsv';

        const presetMap = {
            'fast': 'veryfast',
            'balanced': 'medium',
            'quality': 'veryslow'
        };

        const qsvPreset = presetMap[preset] || 'medium';

        const inputOptions = [
            '-hwaccel', 'qsv',
            '-hwaccel_output_format', 'qsv'
        ];

        const outputOptions = [
            '-preset', qsvPreset
        ];

        // Quality
        if (options.crf !== undefined) {
            outputOptions.push('-global_quality', String(options.crf));
        } else {
            const qualityMap = { fast: 28, standard: 23, high: 18 };
            outputOptions.push('-global_quality', String(qualityMap[quality] || 23));
        }

        // Bitrate
        if (options.bitrate) {
            outputOptions.push('-b:v', options.bitrate);
        }

        // GPU-accelerated scale
        const filters = [];
        if (options.resolution && options.resolution !== 'original') {
            const resMap = { '720p': '1280:720', '1080p': '1920:1080', '4k': '3840:2160' };
            if (resMap[options.resolution]) {
                filters.push(`scale_qsv=${resMap[options.resolution]}`);
            }
        }

        if (filters.length > 0) {
            outputOptions.push('-vf', filters.join(','));
        }

        // FPS
        if (options.fps) {
            outputOptions.push('-r', String(options.fps));
        }

        return {
            inputOptions,
            outputOptions,
            videoCodec: encoder,
            hwaccel: 'intel'
        };
    }

    /**
     * Build CPU fallback parameters
     */
    _buildCPUParams(options) {
        const codec = options.codec || 'h264';
        const quality = options.quality || 'standard';

        const encoderMap = {
            'h264': 'libx264',
            'h265': 'libx265',
            'hevc': 'libx265',
            'vp9': 'libvpx-vp9',
            'av1': 'libsvtav1'
        };

        const encoder = encoderMap[codec] || 'libx264';

        const presetMap = {
            'fast': 'fast',
            'balanced': 'medium',
            'quality': 'slow'
        };

        const cpuPreset = presetMap[options.preset] || 'medium';

        const outputOptions = [
            '-preset', cpuPreset
        ];

        // CRF quality
        if (options.crf !== undefined) {
            outputOptions.push('-crf', String(options.crf));
        } else {
            const qualityMap = { fast: 28, standard: 23, high: 18 };
            outputOptions.push('-crf', String(qualityMap[quality] || 23));
        }

        // Bitrate
        if (options.bitrate) {
            outputOptions.push('-b:v', options.bitrate);
        }

        // Resolution
        if (options.resolution && options.resolution !== 'original') {
            const resMap = { '720p': '1280x720', '1080p': '1920x1080', '4k': '3840x2160' };
            if (resMap[options.resolution]) {
                outputOptions.push('-s', resMap[options.resolution]);
            }
        }

        // FPS
        if (options.fps) {
            outputOptions.push('-r', String(options.fps));
        }

        return {
            inputOptions: [],
            outputOptions,
            videoCodec: encoder,
            hwaccel: 'none'
        };
    }

    /**
     * Get recommended encoding settings based on GPU
     */
    async getRecommendedSettings(targetFormat) {
        await this.init();

        if (!this.capabilities?.primaryGPU) {
            return {
                encoder: 'libx264',
                preset: 'medium',
                hwaccel: false
            };
        }

        const gpu = this.capabilities.primaryGPU;
        const encoder = gpuDetector.getBestEncoder(targetFormat || 'h264');

        return {
            encoder,
            gpuModel: gpu.model,
            vram: gpu.vram,
            recommendedConcurrency: this.capabilities.recommendedConcurrency,
            hwaccel: true
        };
    }
}

export default new FFmpegGPUBuilder();
