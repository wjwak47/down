/**
 * 强制停止所有密码破解相关进程
 * 立即终止所有正在运行的进程，不管是否注册
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

const isWindows = process.platform === 'win32';

console.log('🚨 强制停止所有密码破解进程...');

async function forceStopAllProcesses() {
    try {
        if (isWindows) {
            console.log('Windows: 查找并终止所有相关进程...');
            
            // 获取所有进程列表
            try {
                const processes = execSync('tasklist /fo csv', { encoding: 'utf-8', timeout: 10000 });
                const lines = processes.split('\n');
                
                console.log('🔍 扫描进程列表...');
                
                for (const line of lines) {
                    if (line.includes('hashcat') || line.includes('python') || line.includes('7z') || line.includes('bkcrack')) {
                        try {
                            // 提取进程名和PID
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                const processName = parts[0].replace(/"/g, '');
                                const pid = parts[1].replace(/"/g, '');
                                
                                if (pid && !isNaN(pid)) {
                                    console.log(`🎯 发现目标进程: ${processName} (PID: ${pid})`);
                                    execSync(`taskkill /F /PID ${pid}`, { timeout: 3000 });
                                    console.log(`✅ 已终止: ${processName} (PID: ${pid})`);
                                }
                            }
                        } catch (e) {
                            console.log(`⚠️  无法终止进程: ${e.message}`);
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️  无法获取进程列表，使用备用方法');
            }
            
            // 备用方法：按进程名终止
            const processNames = ['hashcat.exe', 'python.exe', '7z.exe', 'bkcrack.exe'];
            for (const name of processNames) {
                try {
                    execSync(`taskkill /F /IM ${name}`, { timeout: 5000 });
                    console.log(`✅ 已终止所有 ${name} 进程`);
                } catch (e) {
                    console.log(`ℹ️  没有找到 ${name} 进程`);
                }
            }
            
        } else {
            console.log('Unix: 查找并终止所有相关进程...');
            
            // 获取所有相关进程
            try {
                const processes = execSync('ps aux | grep -E "(hashcat|python|7z|bkcrack)" | grep -v grep', { 
                    encoding: 'utf-8', 
                    timeout: 10000 
                });
                
                const lines = processes.split('\n').filter(line => line.trim());
                console.log(`🔍 发现 ${lines.length} 个相关进程`);
                
                for (const line of lines) {
                    try {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            const pid = parts[1];
                            const command = parts.slice(10).join(' ');
                            
                            if (pid && !isNaN(pid)) {
                                console.log(`🎯 发现目标进程: PID ${pid} - ${command.substring(0, 50)}...`);
                                execSync(`kill -9 ${pid}`, { timeout: 3000 });
                                console.log(`✅ 已终止: PID ${pid}`);
                            }
                        }
                    } catch (e) {
                        console.log(`⚠️  无法终止进程: ${e.message}`);
                    }
                }
            } catch (e) {
                console.log('⚠️  没有找到相关进程，使用备用方法');
            }
            
            // 备用方法：按进程名终止
            const processNames = ['hashcat', 'python', '7z', 'bkcrack'];
            for (const name of processNames) {
                try {
                    execSync(`pkill -f ${name}`, { timeout: 5000 });
                    console.log(`✅ 已终止所有 ${name} 进程`);
                } catch (e) {
                    console.log(`ℹ️  没有找到 ${name} 进程`);
                }
            }
        }
        
        console.log('\n🎉 强制停止完成！');
        console.log('所有密码破解相关进程已被强制终止。');
        
        // 等待一下让进程完全终止
        console.log('\n⏳ 等待进程完全终止...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 验证是否还有进程在运行
        console.log('\n🔍 验证进程终止状态...');
        try {
            if (isWindows) {
                const remaining = execSync('tasklist | findstr /i "hashcat python 7z bkcrack"', { 
                    encoding: 'utf-8', 
                    timeout: 5000 
                });
                if (remaining.trim()) {
                    console.log('⚠️  仍有进程在运行:');
                    console.log(remaining);
                } else {
                    console.log('✅ 所有目标进程已终止');
                }
            } else {
                const remaining = execSync('ps aux | grep -E "(hashcat|python|7z|bkcrack)" | grep -v grep', { 
                    encoding: 'utf-8', 
                    timeout: 5000 
                });
                if (remaining.trim()) {
                    console.log('⚠️  仍有进程在运行:');
                    console.log(remaining);
                } else {
                    console.log('✅ 所有目标进程已终止');
                }
            }
        } catch (e) {
            console.log('✅ 所有目标进程已终止（没有找到任何相关进程）');
        }
        
        console.log('\n📋 下一步操作：');
        console.log('1. 重启应用程序');
        console.log('2. 检查终端是否还有密码破解输出');
        console.log('3. 如果问题仍然存在，可能需要重启系统');
        
    } catch (error) {
        console.error('❌ 强制停止过程中出现错误:', error.message);
        console.log('\n🔧 手动操作建议：');
        if (isWindows) {
            console.log('1. 打开任务管理器 (Ctrl+Shift+Esc)');
            console.log('2. 在"详细信息"选项卡中查找并结束以下进程：');
            console.log('   - hashcat.exe');
            console.log('   - python.exe');
            console.log('   - 7z.exe');
            console.log('   - bkcrack.exe');
        } else {
            console.log('1. 打开活动监视器 (Activity Monitor)');
            console.log('2. 查找并强制退出以下进程：');
            console.log('   - hashcat');
            console.log('   - python');
            console.log('   - 7z');
            console.log('   - bkcrack');
        }
    }
}

// 运行强制停止
forceStopAllProcesses();