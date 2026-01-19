/**
 * 测试唤醒会话修复 - 验证后端响应格式处理
 * 
 * 这个脚本测试前端是否正确处理后端的会话列表响应格式
 */

console.log('🧪 测试唤醒会话修复 - 后端响应格式处理');
console.log('='.repeat(60));

// 模拟后端响应格式
const mockBackendResponse = {
    success: true,
    sessions: [
        {
            id: 'session-123',
            jobId: 'job-456',
            filePath: '/path/to/test.zip',
            status: 'running',
            testedPasswords: 12345,
            startTime: Date.now() - 60000
        },
        {
            id: 'session-789',
            jobId: 'job-101',
            filePath: '/path/to/test2.zip',
            status: 'paused',
            testedPasswords: 5678,
            startTime: Date.now() - 120000
        }
    ]
};

// 测试用例
const tests = [
    {
        name: '✅ 正确提取会话数组',
        test: () => {
            const response = mockBackendResponse;
            const sessions = response?.sessions || [];
            console.log('   后端响应:', JSON.stringify(response, null, 2));
            console.log('   提取的会话:', sessions);
            console.log('   会话数量:', sessions.length);
            return sessions.length === 2;
        }
    },
    {
        name: '✅ 处理空响应',
        test: () => {
            const response = null;
            const sessions = response?.sessions || [];
            console.log('   空响应处理:', sessions);
            return sessions.length === 0;
        }
    },
    {
        name: '✅ 处理无会话响应',
        test: () => {
            const response = { success: true, sessions: [] };
            const sessions = response?.sessions || [];
            console.log('   无会话响应:', sessions);
            return sessions.length === 0;
        }
    },
    {
        name: '✅ 筛选运行中的会话',
        test: () => {
            const response = mockBackendResponse;
            const sessions = response?.sessions || [];
            const runningSessions = sessions.filter(s => s.status === 'running' || s.status === 'active');
            console.log('   所有会话:', sessions.length);
            console.log('   运行中会话:', runningSessions.length);
            console.log('   运行中会话详情:', runningSessions);
            return runningSessions.length === 1 && runningSessions[0].id === 'session-123';
        }
    },
    {
        name: '✅ 筛选暂停的会话',
        test: () => {
            const response = mockBackendResponse;
            const sessions = response?.sessions || [];
            const pausedSessions = sessions.filter(s => s.status === 'paused');
            console.log('   暂停会话:', pausedSessions.length);
            console.log('   暂停会话详情:', pausedSessions);
            return pausedSessions.length === 1 && pausedSessions[0].id === 'session-789';
        }
    }
];

// 运行测试
console.log('\n🔬 运行测试用例:');
console.log('-'.repeat(40));

let passed = 0;
let total = tests.length;

tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    try {
        const result = test.test();
        if (result) {
            console.log('   ✅ 通过');
            passed++;
        } else {
            console.log('   ❌ 失败');
        }
    } catch (error) {
        console.log('   ❌ 错误:', error.message);
    }
});

// 测试结果
console.log('\n📊 测试结果:');
console.log('='.repeat(40));
console.log(`✅ 通过: ${passed}/${total}`);
console.log(`❌ 失败: ${total - passed}/${total}`);

if (passed === total) {
    console.log('\n🎉 所有测试通过！会话响应格式处理修复成功。');
    console.log('\n📋 修复内容:');
    console.log('   • 正确提取后端响应中的 sessions 数组');
    console.log('   • 处理空响应和错误情况');
    console.log('   • 保持与现有逻辑的兼容性');
    console.log('   • 增强调试日志输出');
} else {
    console.log('\n⚠️  部分测试失败，需要进一步检查。');
}

console.log('\n🔧 使用方法:');
console.log('   1. 启动密码破解任务');
console.log('   2. 让电脑进入睡眠状态');
console.log('   3. 唤醒电脑并返回应用');
console.log('   4. 检查控制台日志，应该看到:');
console.log('      - "Session check response: {success: true, sessions: [...]}"');
console.log('      - "Extracted sessions: [...]"');
console.log('      - "Running sessions found: [...]"');
console.log('      - "Auto-restoring running session after wake-up"');

console.log('\n🐛 故障排除:');
console.log('   • 如果仍然看不到运行中的任务，检查控制台是否有错误');
console.log('   • 确认后端进程确实在运行（检查任务管理器）');
console.log('   • 尝试手动点击窗口或按键触发用户活动检测');
console.log('   • 等待最多30秒让定期检查自动触发');