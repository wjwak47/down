import si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GPU Detection Service
 * Detects NVIDIA/AMD/Intel GPUs and their hardware acceleration capabilities
 */
class GPUDetector {
    constructor() {
        this.gpuInfo = null;
        this.capabilities = null;
    }

    /**
     * Detect all GPUs in the system
     */
    async detectGPUs() {
        try {
            const graphics = await si.graphics();
            this.gpuInfo = {
                controllers: graphics.controllers.map(gpu => ({
                    vendor: gpu.vendor,
                    model: gpu.model,
                    vram: gpu.vram || 0,
                    vramDynamic: gpu.vramDynamic || false,
                    bus: gpu.bus,
                    vendorId: gpu.vendorId,
                    deviceId: gpu.deviceId
                })),
                displays: graphics.displays.length
            };

            return this.gpuInfo;
        } catch (error) {
            console.error('Error detecting GPUs:', error);
            return { controllers: [], displays: 0 };
        }
    }

    /**
     * Detect NVIDIA GPU and NVENC/NVDEC capabilities
     */
    async detectNVIDIA() {
        const nvidia = this.gpuInfo?.controllers.find(gpu =>
            gpu.vendor.toLowerCase().includes('nvidia')
        );

        if (!nvidia) {
            return null;
        }

        try {
            // Try to get NVIDIA-SMI output for detailed info
            const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits');
            const [name, vramMB, driver] = stdout.trim().split(',').map(s => s.trim());

            return {
                vendor: 'NVIDIA',
                model: name || nvidia.model,
                vram: parseInt(vramMB) || nvidia.vram,
                driver: driver,
                capabilities: {
                    // Check NVENC generation based on model name
                    nvenc: this.getNVENCGeneration(name || nvidia.model),
                    cudaAvailable: true,
                    supportedCodecs: ['h264_nvenc', 'hevc_nvenc', 'av1_nvenc'],
                    supportedDecoders: ['h264_cuvid', 'hevc_cuvid', 'vp9_cuvid'],
                    supportedFilters: ['scale_cuda', 'overlay_cuda', 'yadif_cuda']
                }
            };
        } catch (error) {
            // nvidia-smi not available, return basic info
            return {
                vendor: 'NVIDIA',
                model: nvidia.model,
                vram: nvidia.vram,
                driver: 'Unknown',
                capabilities: {
                    nvenc: 'Unknown',
                    cudaAvailable: false,
                    supportedCodecs: ['h264_nvenc', 'hevc_nvenc'],
                    supportedDecoders: ['h264_cuvid', 'hevc_cuvid'],
                    supportedFilters: []
                }
            };
        }
    }

    /**
     * Detect AMD GPU and AMF capabilities
     */
    async detectAMD() {
        const amd = this.gpuInfo?.controllers.find(gpu =>
            gpu.vendor.toLowerCase().includes('amd') ||
            gpu.vendor.toLowerCase().includes('ati')
        );

        if (!amd) {
            return null;
        }

        return {
            vendor: 'AMD',
            model: amd.model,
            vram: amd.vram,
            capabilities: {
                amf: true,
                supportedCodecs: ['h264_amf', 'hevc_amf'],
                supportedDecoders: [],
                supportedFilters: []
            }
        };
    }

    /**
     * Detect Intel GPU and QSV capabilities
     */
    async detectIntel() {
        const intel = this.gpuInfo?.controllers.find(gpu =>
            gpu.vendor.toLowerCase().includes('intel')
        );

        if (!intel) {
            return null;
        }

        return {
            vendor: 'Intel',
            model: intel.model,
            vram: intel.vram || 0, // Often shared memory
            vramDynamic: intel.vramDynamic,
            capabilities: {
                qsv: true,
                supportedCodecs: ['h264_qsv', 'hevc_qsv', 'vp9_qsv', 'av1_qsv'],
                supportedDecoders: ['h264_qsv', 'hevc_qsv', 'vp9_qsv'],
                supportedFilters: ['scale_qsv', 'overlay_qsv']
            }
        };
    }

    /**
     * Get all GPU capabilities
     */
    async getCapabilities() {
        await this.detectGPUs();

        const nvidia = await this.detectNVIDIA();
        const amd = await this.detectAMD();
        const intel = await this.detectIntel();

        this.capabilities = {
            hasNVIDIA: !!nvidia,
            hasAMD: !!amd,
            hasIntel: !!intel,
            nvidia,
            amd,
            intel,
            primaryGPU: nvidia || amd || intel,
            totalVRAM: (nvidia?.vram || 0) + (amd?.vram || 0),
            recommendedConcurrency: this.getRecommendedConcurrency(nvidia, amd, intel)
        };

        return this.capabilities;
    }

    /**
     * Determine NVENC generation based on GPU model
     */
    getNVENCGeneration(modelName) {
        const model = modelName.toLowerCase();

        // RTX 40 series - 8th gen NVENC
        if (model.includes('rtx 40') || model.includes('ada')) {
            return '8th Gen (Ada Lovelace)';
        }
        // RTX 30 series - 7th gen NVENC
        if (model.includes('rtx 30') || model.includes('ampere')) {
            return '7th Gen (Ampere)';
        }
        // RTX 20 / GTX 16 series - 6th gen NVENC
        if (model.includes('rtx 20') || model.includes('gtx 16') || model.includes('turing')) {
            return '6th Gen (Turing)';
        }
        // GTX 10 series - 5th gen NVENC
        if (model.includes('gtx 10') || model.includes('pascal')) {
            return '5th Gen (Pascal)';
        }

        return 'Legacy';
    }

    /**
     * Calculate recommended concurrent encoding jobs based on VRAM
     */
    getRecommendedConcurrency(nvidia, amd, intel) {
        const vram = (nvidia?.vram || 0) + (amd?.vram || 0);

        if (vram >= 12000) return 6;  // 12GB+ -> 6 concurrent
        if (vram >= 8000) return 4;   // 8GB -> 4 concurrent
        if (vram >= 6000) return 3;   // 6GB -> 3 concurrent
        if (vram >= 4000) return 2;   // 4GB -> 2 concurrent
        return 1;                     // Less than 4GB -> 1 concurrent
    }

    /**
     * Get best available encoder for a codec
     */
    getBestEncoder(codec) {
        if (!this.capabilities) {
            return null;
        }

        const codecMap = {
            'h264': ['h264_nvenc', 'h264_qsv', 'h264_amf', 'libx264'],
            'h265': ['hevc_nvenc', 'hevc_qsv', 'hevc_amf', 'libx265'],
            'hevc': ['hevc_nvenc', 'hevc_qsv', 'hevc_amf', 'libx265'],
            'vp9': ['vp9_qsv', 'libvpx-vp9'],
            'av1': ['av1_nvenc', 'av1_qsv', 'libsvtav1']
        };

        const preferredEncoders = codecMap[codec.toLowerCase()] || [];
        const { nvidia, intel, amd } = this.capabilities;

        for (const encoder of preferredEncoders) {
            if (encoder.includes('nvenc') && nvidia) return encoder;
            if (encoder.includes('qsv') && intel) return encoder;
            if (encoder.includes('amf') && amd) return encoder;
            if (encoder.startsWith('lib')) return encoder; // CPU fallback
        }

        return preferredEncoders[preferredEncoders.length - 1] || 'libx264';
    }

    /**
     * Check if GPU acceleration is available for video processing
     */
    isHardwareAccelerationAvailable() {
        return this.capabilities &&
            (this.capabilities.hasNVIDIA || this.capabilities.hasAMD || this.capabilities.hasIntel);
    }
}

// Export singleton instance
export default new GPUDetector();
