#!/usr/bin/env node

/**
 * Mac GPU 检测测试脚本
 * 用于验证 Mac 上的 GPU 检测功能是否正常工作
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const isMac = process.platform === 'darwin';

console.log('🍎 Mac GPU 检测测试');
console.log('==================');
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log('');

if (!isMac) {
    console.log('❌ 此脚本仅在 Mac 上运行');
    process.exit(1);
}

// 模拟 getHashcatPath 函数
function getHashcatPath() {
    // 检查常见的 hashcat 安装路径
    const possiblePaths = [
        '/opt/homebrew/bin/hashcat',
        '/usr/local/bin/hashcat',
        '/usr/bin/hashcat',
        // 应用资源路径（开发环境）
        path.join(process.cwd(), 'resources', 'hashcat-mac', 'hashcat'),
        // 打包后的路径
        path.join(process.resourcesPath || '', 'hashcat', 'hashcat')
    ];
    
    for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
            return testPath;
        }
    }
    
    return null;
}

// 模拟 checkMacGPUSupport 函数
function checkMacGPUSupport() {
    try {
        const hashcatPath = getHashcatPath();
        if (!hashcatPath) {
            return { hasGPU: false, backend: 'none', error: 'Hashcat not found' };
        }
        
        console.log('🔍 找到 hashcat:', hashcatPath);
        
        // 检查版本
        try {
            const versionResult = execSync(`"${hashcatPath}" --version 2>/dev/null | head -1`, { 
                encoding: 'utf-8', 
                timeout: 3000 
            });
            console.log('📋 版本信息:', versionResult.trim());
        } catch (e) {
            console.log('⚠️  版本检查失败:', e.message);
        }
        
        // 检查GPU后端支持
        const backendResult = execSync(`"${hashcatPath}" --backend-info 2>/dev/null | head -10`, { 
            encoding: 'utf-8', 
            timeout: 5000 
        });
        
        const hasOpenCL = backendResult.toLowerCase().includes('opencl');
        const hasMetal = backendResult.toLowerCase().includes('metal');
        const hasAnyBackend = hasOpenCL || hasMetal || backendResult.includes('Backend');
        
        // 检测具体的GPU类型
        let gpuType = 'unknown';
        if (backendResult.toLowerCase().includes('apple')) {
            gpuType = 'Apple Silicon';
        } else if (backendResult.toLowerCase().includes('intel')) {
            gpuType = 'Intel';
        } else if (backendResult.toLowerCase().includes('amd')) {
            gpuType = 'AMD';
        } else if (backendResult.toLowerCase().includes('nvidia')) {
            gpuType = 'NVIDIA';
        }
        
        console.log('🖥️  后端信息:');
        console.log(backendResult);
        
        const result = {
            hasGPU: hasAnyBackend,
            backend: hasOpenCL ? 'OpenCL' : hasMetal ? 'Metal' : 'CPU',
            gpuType,
            backendInfo: backendResult.trim()
        };
        
        console.log('📊 检测结果:', result);
        
        return result;
    } catch (error) {
        console.log('❌ GPU 检测错误:', error.message);
        return { hasGPU: false, backend: 'none', error: error.message };
    }
}

// 运行测试
console.log('🚀 开始 GPU 检测...');
console.log('');

const result = checkMacGPUSupport();

console.log('');
console.log('📋 最终结果:');
console.log('============');
console.log('GPU 支持:', result.hasGPU ? '✅ 是' : '❌ 否');
console.log('后端类型:', result.backend);
console.log('GPU 类型:', result.gpuType || '未知');

if (result.error) {
    console.log('错误信息:', result.error);
}

console.log('');
console.log('💡 建议:');
if (result.hasGPU) {
    console.log('✅ 您的 Mac 支持 GPU 加速密码破解');
    console.log('🚀 推荐使用 GPU 模式以获得最佳性能');
} else {
    console.log('⚠️  GPU 加速不可用，将使用 CPU 模式');
    if (result.error?.includes('not found')) {
        console.log('💡 请安装 hashcat: brew install hashcat');
    }
}

console.log('');
console.log('🔧 如需安装 hashcat:');
console.log('   brew install hashcat');
console.log('');