/**
 * 紧急停止无限循环脚本
 * 立即终止所有相关进程
 */

const { execSync } = require('child_process');
const os = require('os');

const isWindows = process.platform === 'win32';

console.log('🚨 紧急停止无限循环进程...');

try {
    if (isWindows) {
        // Windows: 强制终止所有相关进程
        console.log('Windows: 终止所有相关进程...');
        
        // 终止所有 hashcat 进程
        try {
            execSync('taskkill /F /IM hashcat.exe', { timeout: 5000 });
            console.log('✅ 已终止 hashcat.exe');
        } catch (e) {
            console.log('ℹ️  没有找到 hashcat.exe 进程');
        }
        
        // 终止所有 python 进程
        try {
            execSync('taskkill /F /IM python.exe', { timeout: 5000 });
            console.log('✅ 已终止 python.exe');
        } catch (e) {
            console.log('ℹ️  没有找到 python.exe 进程');
        }
        
        // 终止所有 7z 进程
        try {
            execSync('taskkill /F /IM 7z.exe', { timeout: 5000 });
            console.log('✅ 已终止 7z.exe');
        } catch (e) {
            console.log('ℹ️  没有找到 7z.exe 进程');
        }
        
        // 终止所有 node 进程（除了当前进程）
        try {
            const currentPid = process.pid;
            const result = execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv', { 
                encoding: 'utf-8', 
                timeout: 10000 
            });
            
            const lines = result.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
            for (const line of lines) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const pid = parts[2].trim();
                    if (pid && pid !== currentPid.toString() && pid !== 'ProcessId') {
                        try {
                            execSync(`taskkill /F /PID ${pid}`, { timeout: 3000 });
                            console.log(`✅ 已终止 node.exe PID: ${pid}`);
                        } catch (e) {
                            console.log(`⚠️  无法终止 PID ${pid}: ${e.message}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.log('⚠️  无法获取 node 进程列表:', e.message);
        }
        
    } else {
        // Mac/Linux: 强制终止所有相关进程
        console.log('Unix: 终止所有相关进程...');
        
        // 终止所有 hashcat 进程
        try {
            execSync('pkill -f hashcat', { timeout: 5000 });
            console.log('✅ 已终止 hashcat');
        } catch (e) {
            console.log('ℹ️  没有找到 hashcat 进程');
        }
        
        // 终止所有 python 进程
        try {
            execSync('pkill -f python', { timeout: 5000 });
            console.log('✅ 已终止 python');
        } catch (e) {
            console.log('ℹ️  没有找到 python 进程');
        }
        
        // 终止所有 7z 进程
        try {
            execSync('pkill -f 7z', { timeout: 5000 });
            console.log('✅ 已终止 7z');
        } catch (e) {
            console.log('ℹ️  没有找到 7z 进程');
        }
    }
    
    console.log('\n🎉 紧急停止完成！');
    console.log('所有相关进程已被强制终止。');
    console.log('\n📋 下一步操作：');
    console.log('1. 重启应用程序');
    console.log('2. 检查控制台是否还有无限循环消息');
    console.log('3. 如果问题仍然存在，请联系开发者');
    
} catch (error) {
    console.error('❌ 紧急停止过程中出现错误:', error.message);
    console.log('\n🔧 手动操作建议：');
    if (isWindows) {
        console.log('1. 打开任务管理器 (Ctrl+Shift+Esc)');
        console.log('2. 在"进程"选项卡中查找并结束以下进程：');
        console.log('   - hashcat.exe');
        console.log('   - python.exe');
        console.log('   - 7z.exe');
        console.log('   - node.exe (除了当前终端)');
    } else {
        console.log('1. 打开活动监视器 (Activity Monitor)');
        console.log('2. 查找并强制退出以下进程：');
        console.log('   - hashcat');
        console.log('   - python');
        console.log('   - 7z');
    }
}