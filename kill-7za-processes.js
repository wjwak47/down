/**
 * 专门终止 7za.exe 进程
 */

const { execSync } = require('child_process');

console.log('🎯 专门终止 7za.exe 进程...');

try {
    // 获取所有 7za.exe 进程的详细信息
    const result = execSync('wmic process where "name=\'7za.exe\'" get ProcessId,CommandLine /format:csv', { 
        encoding: 'utf-8', 
        timeout: 10000 
    });
    
    console.log('📋 7za.exe 进程列表:');
    console.log(result);
    
    const lines = result.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
    console.log(`\n🔍 发现 ${lines.length} 个 7za.exe 进程`);
    
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
            const pid = parts[2].trim();
            if (pid && pid !== 'ProcessId' && !isNaN(pid)) {
                try {
                    console.log(`🎯 尝试终止 PID: ${pid}`);
                    execSync(`taskkill /F /PID ${pid}`, { timeout: 3000 });
                    console.log(`✅ 成功终止 PID: ${pid}`);
                } catch (e) {
                    console.log(`❌ 无法终止 PID ${pid}: ${e.message}`);
                    
                    // 尝试使用 wmic 终止
                    try {
                        execSync(`wmic process where ProcessId=${pid} delete`, { timeout: 3000 });
                        console.log(`✅ 使用 wmic 成功终止 PID: ${pid}`);
                    } catch (wmicError) {
                        console.log(`❌ wmic 也无法终止 PID ${pid}: ${wmicError.message}`);
                    }
                }
            }
        }
    }
    
    // 再次检查是否还有 7za.exe 进程
    console.log('\n🔍 检查剩余的 7za.exe 进程...');
    try {
        const remaining = execSync('tasklist | findstr 7za.exe', { encoding: 'utf-8', timeout: 5000 });
        if (remaining.trim()) {
            console.log('⚠️  仍有 7za.exe 进程在运行:');
            console.log(remaining);
            
            // 尝试最后的手段：重启系统建议
            console.log('\n🚨 建议操作：');
            console.log('1. 这些进程可能被系统保护或处于僵死状态');
            console.log('2. 请重启应用程序');
            console.log('3. 如果问题仍然存在，请重启计算机');
        } else {
            console.log('✅ 所有 7za.exe 进程已成功终止！');
        }
    } catch (e) {
        console.log('✅ 所有 7za.exe 进程已成功终止！（没有找到任何进程）');
    }
    
} catch (error) {
    console.error('❌ 获取进程信息失败:', error.message);
    
    // 备用方法：直接尝试终止所有 7za.exe
    console.log('\n🔄 使用备用方法...');
    try {
        execSync('taskkill /F /IM 7za.exe', { timeout: 5000 });
        console.log('✅ 备用方法成功');
    } catch (backupError) {
        console.log('❌ 备用方法也失败:', backupError.message);
    }
}