#!/usr/bin/env node

/**
 * 紧急核心停止脚本 - 最强力的进程终止
 * 当常规取消功能仍然无法完全停止所有进程时使用
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

const isWindows = process.platform === 'win32';

console.log('🚨 紧急核心停止 - 最强力进程终止');
console.log('='.repeat(50));

// 目标进程列表
const targetProcesses = isWindows 
    ? ['7za.exe', '7z.exe', 'hashcat.exe', 'python.exe', 'bkcrack.exe', 'node.exe']
    : ['7za', '7z', 'hashcat', 'python', 'bkcrack', 'node'];

async function emergencyStop() {
    console.log('🔍 第1步：检查当前运行的目标进程...');
    
    // 检查当前进程
    try {
        if (isWindows) {
            const result = execSync('tasklist /FI "IMAGENAME eq 7za.exe" /FO CSV', { encoding: 'utf-8', timeout: 5000 });
            console.log('当前7za.exe进程：');
            console.log(result);
        } else {
            const result = execSync('ps aux | grep -E "(7za|hashcat|python.*crack)" | grep -v grep', { encoding: 'utf-8', timeout: 5000 });
            console.log('当前相关进程：');
            console.log(result);
        }
    } catch (e) {
        console.log('进程检查完成（可能没有找到目标进程）');
    }

    console.log('\n🚨 第2步：执行核心终止...');
    
    if (isWindows) {
        // Windows 核心终止策略
        console.log('Windows 核心终止模式');
        
        // 方法1：强制终止所有目标进程
        for (const processName of targetProcesses) {
            try {
                console.log(`🔥 强制终止所有 ${processName} 进程...`);
                execSync(`taskkill /F /IM ${processName} /T`, { timeout: 3000 });
                console.log(`✅ ${processName} 进程已终止`);
            } catch (e) {
                console.log(`⚠️  ${processName} 进程可能不存在或已终止`);
            }
        }
        
        // 方法2：使用 wmic 删除
        for (const processName of targetProcesses) {
            try {
                console.log(`🔥 WMIC 删除 ${processName}...`);
                execSync(`wmic process where "name='${processName}'" delete`, { timeout: 3000 });
                console.log(`✅ WMIC 删除 ${processName} 完成`);
            } catch (e) {
                console.log(`⚠️  WMIC 删除 ${processName} 失败或进程不存在`);
            }
        }
        
        // 方法3：PowerShell 核心清理
        try {
            console.log('🔥 PowerShell 核心清理...');
            const psCommand = `Get-Process | Where-Object {$_.ProcessName -match '7za|7z|hashcat|python|bkcrack'} | Stop-Process -Force -ErrorAction SilentlyContinue`;
            execSync(`powershell -Command "${psCommand}"`, { timeout: 5000 });
            console.log('✅ PowerShell 核心清理完成');
        } catch (e) {
            console.log('⚠️  PowerShell 清理失败：', e.message);
        }
        
        // 方法4：终极 PowerShell 清理（按命令行匹配）
        try {
            console.log('🔥 终极 PowerShell 清理（按命令行匹配）...');
            const ultimateCommand = `Get-WmiObject Win32_Process | Where-Object {$_.CommandLine -match '7za|hashcat|crack|password'} | ForEach-Object {$_.Terminate()}`;
            execSync(`powershell -Command "${ultimateCommand}"`, { timeout: 5000 });
            console.log('✅ 终极 PowerShell 清理完成');
        } catch (e) {
            console.log('⚠️  终极 PowerShell 清理失败：', e.message);
        }
        
    } else {
        // Unix/Linux/Mac 核心终止策略
        console.log('Unix 核心终止模式');
        
        // 方法1：pkill 强制终止
        for (const processName of targetProcesses) {
            try {
                console.log(`🔥 pkill 强制终止 ${processName}...`);
                execSync(`pkill -9 -f ${processName}`, { timeout: 3000 });
                console.log(`✅ pkill ${processName} 完成`);
            } catch (e) {
                console.log(`⚠️  pkill ${processName} 失败或进程不存在`);
            }
        }
        
        // 方法2：killall 强制终止
        try {
            console.log('🔥 killall 强制终止...');
            execSync(`killall -9 ${targetProcesses.join(' ')}`, { timeout: 3000 });
            console.log('✅ killall 完成');
        } catch (e) {
            console.log('⚠️  killall 失败：', e.message);
        }
        
        // 方法3：按命令行匹配终止
        try {
            console.log('🔥 按命令行匹配终止...');
            execSync(`pkill -9 -f "crack|password|7za"`, { timeout: 3000 });
            console.log('✅ 命令行匹配终止完成');
        } catch (e) {
            console.log('⚠️  命令行匹配终止失败：', e.message);
        }
    }

    console.log('\n🔍 第3步：验证清理结果...');
    
    // 验证清理结果
    try {
        if (isWindows) {
            const result = execSync('tasklist /FI "IMAGENAME eq 7za.exe" /FO CSV', { encoding: 'utf-8', timeout: 5000 });
            if (result.includes('7za.exe')) {
                console.log('❌ 仍有7za.exe进程运行：');
                console.log(result);
            } else {
                console.log('✅ 没有发现7za.exe进程');
            }
        } else {
            const result = execSync('ps aux | grep -E "(7za|hashcat|python.*crack)" | grep -v grep', { encoding: 'utf-8', timeout: 5000 });
            if (result.trim()) {
                console.log('❌ 仍有相关进程运行：');
                console.log(result);
            } else {
                console.log('✅ 没有发现相关进程');
            }
        }
    } catch (e) {
        console.log('✅ 验证完成：没有发现目标进程（这是好消息）');
    }

    console.log('\n🎯 第4步：系统资源清理...');
    
    // 清理临时文件
    try {
        const tempDirs = [
            os.tmpdir() + '/hashcat-*',
            os.tmpdir() + '/bkcrack-*',
            os.tmpdir() + '/crack-*'
        ];
        
        for (const pattern of tempDirs) {
            try {
                if (isWindows) {
                    execSync(`for /d %i in ("${pattern}") do rmdir /s /q "%i"`, { timeout: 3000 });
                } else {
                    execSync(`rm -rf ${pattern}`, { timeout: 3000 });
                }
                console.log(`✅ 清理临时目录：${pattern}`);
            } catch (e) {
                console.log(`⚠️  清理临时目录失败：${pattern}`);
            }
        }
    } catch (e) {
        console.log('⚠️  临时文件清理失败：', e.message);
    }

    console.log('\n🚀 紧急核心停止完成！');
    console.log('='.repeat(50));
    console.log('如果仍有进程运行，请：');
    console.log('1. 重启应用程序');
    console.log('2. 重启计算机（最后手段）');
    console.log('3. 检查任务管理器/活动监视器手动终止');
}

// 执行紧急停止
emergencyStop().catch(console.error);