/**
 * 唤醒会话调试工具
 * 
 * 这个脚本帮助用户调试唤醒后看不到运行中任务的问题
 */

console.log('🔍 唤醒会话调试工具');
console.log('='.repeat(60));

// 模拟不同的调试场景
const debugScenarios = [
    {
        name: '✅ 正常场景 - 有运行中的会话',
        response: {
            success: true,
            sessions: [
                {
                    id: 'session-123',
                    jobId: 'job-456',
                    filePath: '/path/to/test.zip',
                    status: 'running',
                    testedPasswords: 12345,
                    startTime: Date.now() - 60000
                }
            ]
        },
        expectedBehavior: '应该自动恢复UI并显示破解进度'
    },
    {
        name: '⏸️  暂停场景 - 有暂停的会话',
        response: {
            success: true,
            sessions: [
                {
                    id: 'session-789',
                    jobId: 'job-101',
                    filePath: '/path/to/test2.zip',
                    status: 'paused',
                    testedPasswords: 5678,
                    startTime: Date.now() - 120000
                }
            ]
        },
        expectedBehavior: '应该显示会话恢复对话框'
    },
    {
        name: '❌ 空会话场景 - 没有活跃会话',
        response: {
            success: true,
            sessions: []
        },
        expectedBehavior: '不应该有任何自动恢复行为'
    },
    {
        name: '🔄 已完成会话场景 - 只有已完成的会话',
        response: {
            success: true,
            sessions: [
                {
                    id: 'session-completed',
                    jobId: 'job-completed',
                    filePath: '/path/to/completed.zip',
                    status: 'completed',
                    testedPasswords: 100000,
                    startTime: Date.now() - 300000,
                    endTime: Date.now() - 60000,
                    foundPassword: 'password123'
                }
            ]
        },
        expectedBehavior: '不应该恢复已完成的会话'
    },
    {
        name: '⚠️  API错误场景 - 后端API失败',
        response: null,
        error: 'API调用失败',
        expectedBehavior: '应该显示错误提示并优雅处理'
    }
];

console.log('\n🧪 测试不同的调试场景:');
console.log('-'.repeat(50));

debugScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log('   场景描述:', scenario.expectedBehavior);
    
    if (scenario.error) {
        console.log('   模拟错误:', scenario.error);
        console.log('   处理逻辑:');
        console.log('     • 捕获异常并记录错误日志');
        console.log('     • 显示用户友好的错误提示');
        console.log('     • 不影响应用的正常使用');
        return;
    }
    
    const response = scenario.response;
    const sessions = response?.sessions || [];
    
    console.log('   后端响应:', JSON.stringify(response, null, 4));
    console.log('   提取的会话数量:', sessions.length);
    
    if (sessions.length > 0) {
        const runningSessions = sessions.filter(s => s.status === 'running' || s.status === 'active');
        const pausedSessions = sessions.filter(s => s.status === 'paused');
        const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'failed');
        
        console.log('   运行中会话:', runningSessions.length);
        console.log('   暂停会话:', pausedSessions.length);
        console.log('   已完成会话:', completedSessions.length);
        
        if (runningSessions.length > 0) {
            console.log('   🔄 应该执行的操作:');
            console.log('     • 切换到Crack标签页');
            console.log('     • 设置processing=true');
            console.log('     • 恢复crackJobId和crackSessionId');
            console.log('     • 显示"Reconnected to running session"提示');
            console.log('     • 重新注册IPC监听器');
            console.log('     • 请求当前进度更新');
        } else if (pausedSessions.length > 0) {
            console.log('   ⏸️  应该执行的操作:');
            console.log('     • 切换到Crack标签页');
            console.log('     • 显示会话恢复对话框');
            console.log('     • 让用户选择恢复或删除会话');
        } else {
            console.log('   ℹ️  无需执行操作（没有活跃会话）');
        }
    } else {
        console.log('   ℹ️  无需执行操作（会话列表为空）');
    }
});

console.log('\n🔧 调试步骤指南:');
console.log('='.repeat(40));
console.log('1. 打开浏览器开发者工具（F12）');
console.log('2. 切换到Console标签页');
console.log('3. 启动一个密码破解任务');
console.log('4. 让电脑进入睡眠状态');
console.log('5. 唤醒电脑并返回应用');
console.log('6. 观察控制台日志输出');

console.log('\n📋 关键日志检查清单:');
console.log('-'.repeat(30));
console.log('✅ 应该看到的日志:');
console.log('   • "🔍 Window focused, checking for running sessions..."');
console.log('   • "🔍 Starting enhanced session check after wake-up..."');
console.log('   • "🔗 Force re-registering IPC listeners before session check..."');
console.log('   • "Session check response: {success: true, sessions: [...]}"');
console.log('   • "Extracted sessions: [...]"');
console.log('   • "🏃 Running sessions found: [...]"');
console.log('   • "🔄 Auto-restoring running session after wake-up"');

console.log('\n❌ 问题指示器:');
console.log('   • "❌ zipCrackListSessions API not available" - API不可用');
console.log('   • "❌ Failed to get sessions after all retries" - 后端连接失败');
console.log('   • "Extracted sessions: []" - 没有活跃会话（可能已完成或崩溃）');
console.log('   • 完全没有日志 - 唤醒检测没有触发');

console.log('\n🛠️  故障排除步骤:');
console.log('-'.repeat(25));
console.log('如果仍然看不到运行中的任务:');
console.log('');
console.log('1. 检查后端进程:');
console.log('   • 打开任务管理器');
console.log('   • 查找hashcat.exe或相关进程');
console.log('   • 如果没有找到，说明破解进程已经停止');
console.log('');
console.log('2. 手动触发检测:');
console.log('   • 点击应用窗口');
console.log('   • 按任意键');
console.log('   • 等待30秒让定期检查触发');
console.log('');
console.log('3. 检查会话文件:');
console.log('   • 会话保存在用户数据目录');
console.log('   • 查看是否有.json会话文件');
console.log('   • 检查文件中的status字段');
console.log('');
console.log('4. 重启应用:');
console.log('   • 如果所有方法都失败');
console.log('   • 重启应用应该能检测到遗留的会话');

console.log('\n💡 预防措施:');
console.log('-'.repeat(20));
console.log('• 避免在破解过程中强制关闭应用');
console.log('• 使用暂停功能而不是直接睡眠电脑');
console.log('• 定期检查破解进度，不要长时间离开');
console.log('• 如果需要长时间运行，考虑使用服务器模式');

console.log('\n🎯 修复验证:');
console.log('-'.repeat(20));
console.log('修复成功的标志:');
console.log('✅ 唤醒后自动显示正在运行的破解任务');
console.log('✅ 进度条和统计信息正确显示');
console.log('✅ 暂停/恢复按钮正常工作');
console.log('✅ 控制台显示完整的调试日志');
console.log('✅ 用户收到"Reconnected to running session"提示');

console.log('\n📞 如需进一步帮助:');
console.log('-'.repeat(25));
console.log('请提供以下信息:');
console.log('• 完整的控制台日志输出');
console.log('• 任务管理器中的进程截图');
console.log('• 破解任务的具体配置');
console.log('• 电脑睡眠的时长');
console.log('• 操作系统版本信息');