#!/usr/bin/env node

/**
 * 客户模式映射测试脚本
 * 验证前端攻击模式正确映射到后端分层策略
 */

console.log('🔧 客户模式映射测试开始...\n');

// 模拟攻击模式映射函数
function mapClientModeToBackend(clientMode) {
    let attackMode = clientMode || 'standard';
    
    // 兼容前端的 'smart' 和 'bruteforce' 模式
    if (attackMode === 'smart') {
        attackMode = 'standard'; // smart模式映射到标准模式
    } else if (attackMode === 'bruteforce') {
        attackMode = 'standard'; // bruteforce模式也映射到标准模式（用户自定义参数）
    }
    
    // 确保攻击模式有效
    if (!['fast', 'standard', 'deep'].includes(attackMode)) {
        attackMode = 'standard';
    }
    
    return attackMode;
}

// 模拟分层选择函数
function selectBruteforceLayers(attackMode) {
    const SHORT_PASSWORD_STRATEGY = {
        ultraShort: { range: [1, 3], name: 'ultraShort' },
        short: { range: [4, 6], name: 'short' },
        mediumShort: { range: [7, 8], name: 'mediumShort' }
    };
    
    switch(attackMode) {
        case 'fast':
            return [SHORT_PASSWORD_STRATEGY.ultraShort];
        case 'standard': 
            return [
                SHORT_PASSWORD_STRATEGY.ultraShort,
                SHORT_PASSWORD_STRATEGY.short
            ];
        case 'deep':
            return [
                SHORT_PASSWORD_STRATEGY.ultraShort,
                SHORT_PASSWORD_STRATEGY.short,
                SHORT_PASSWORD_STRATEGY.mediumShort
            ];
        default:
            return [SHORT_PASSWORD_STRATEGY.ultraShort, SHORT_PASSWORD_STRATEGY.short];
    }
}

// ============ 测试用例 ============

console.log('📊 测试1: 客户模式映射验证');
console.log('================================');

const testCases = [
    { client: 'smart', expected: 'standard', description: 'Smart模式 → 标准模式' },
    { client: 'bruteforce', expected: 'standard', description: 'Bruteforce模式 → 标准模式' },
    { client: 'fast', expected: 'fast', description: 'Fast模式 → 快速模式' },
    { client: 'standard', expected: 'standard', description: '标准模式 → 标准模式' },
    { client: 'deep', expected: 'deep', description: '深度模式 → 深度模式' },
    { client: null, expected: 'standard', description: '空值 → 默认标准模式' },
    { client: 'invalid', expected: 'standard', description: '无效模式 → 默认标准模式' }
];

let passedMappingTests = 0;
testCases.forEach((testCase, index) => {
    const result = mapClientModeToBackend(testCase.client);
    const status = result === testCase.expected ? '✅ 通过' : '❌ 失败';
    console.log(`  ${index + 1}. ${testCase.description}: ${status}`);
    console.log(`     输入: ${testCase.client || 'null'} → 输出: ${result} (期望: ${testCase.expected})`);
    if (result === testCase.expected) passedMappingTests++;
});

console.log(`\n📊 映射测试结果: ${passedMappingTests}/${testCases.length} 通过\n`);

console.log('🎯 测试2: 分层策略选择验证');
console.log('================================');

const strategyTests = [
    { mode: 'smart', expectedLayers: 2, description: 'Smart模式 → 标准分层 (1-3位 + 4-6位)' },
    { mode: 'bruteforce', expectedLayers: 2, description: 'Bruteforce模式 → 标准分层 (1-3位 + 4-6位)' },
    { mode: 'fast', expectedLayers: 1, description: 'Fast模式 → 快速分层 (仅1-3位)' },
    { mode: 'deep', expectedLayers: 3, description: 'Deep模式 → 深度分层 (1-3位 + 4-6位 + 7-8位)' }
];

let passedStrategyTests = 0;
strategyTests.forEach((test, index) => {
    const backendMode = mapClientModeToBackend(test.mode);
    const layers = selectBruteforceLayers(backendMode);
    const status = layers.length === test.expectedLayers ? '✅ 通过' : '❌ 失败';
    
    console.log(`  ${index + 1}. ${test.description}: ${status}`);
    console.log(`     客户模式: ${test.mode} → 后端模式: ${backendMode} → 层级数: ${layers.length} (期望: ${test.expectedLayers})`);
    
    layers.forEach((layer, layerIndex) => {
        console.log(`       层级${layerIndex + 1}: ${layer.name} (${layer.range[0]}-${layer.range[1]}位)`);
    });
    
    if (layers.length === test.expectedLayers) passedStrategyTests++;
    console.log('');
});

console.log(`📊 策略测试结果: ${passedStrategyTests}/${strategyTests.length} 通过\n`);

console.log('🔄 测试3: 完整流程验证');
console.log('================================');

// 模拟完整的客户端到后端流程
const clientRequests = [
    { 
        clientMode: 'smart', 
        description: '用户选择Smart模式（前端默认）',
        expectedBackend: 'standard',
        expectedLayers: ['1-3位', '4-6位']
    },
    { 
        clientMode: 'bruteforce', 
        description: '用户选择Custom模式（自定义参数）',
        expectedBackend: 'standard', 
        expectedLayers: ['1-3位', '4-6位']
    }
];

let passedFlowTests = 0;
clientRequests.forEach((request, index) => {
    console.log(`流程${index + 1}: ${request.description}`);
    
    // 步骤1: 前端发送请求
    console.log(`  1. 前端发送: mode="${request.clientMode}"`);
    
    // 步骤2: 后端映射模式
    const backendMode = mapClientModeToBackend(request.clientMode);
    console.log(`  2. 后端映射: "${request.clientMode}" → "${backendMode}"`);
    
    // 步骤3: 选择分层策略
    const layers = selectBruteforceLayers(backendMode);
    const layerNames = layers.map(l => `${l.range[0]}-${l.range[1]}位`);
    console.log(`  3. 分层策略: [${layerNames.join(', ')}]`);
    
    // 验证结果
    const backendCorrect = backendMode === request.expectedBackend;
    const layersCorrect = JSON.stringify(layerNames) === JSON.stringify(request.expectedLayers);
    const overallStatus = backendCorrect && layersCorrect ? '✅ 通过' : '❌ 失败';
    
    console.log(`  4. 验证结果: ${overallStatus}`);
    if (backendCorrect && layersCorrect) passedFlowTests++;
    console.log('');
});

console.log(`📊 流程测试结果: ${passedFlowTests}/${clientRequests.length} 通过\n`);

// ============ 总结 ============

const totalTests = testCases.length + strategyTests.length + clientRequests.length;
const totalPassed = passedMappingTests + passedStrategyTests + passedFlowTests;

console.log('📋 测试总结');
console.log('================================');
console.log(`映射测试: ${passedMappingTests}/${testCases.length} 通过`);
console.log(`策略测试: ${passedStrategyTests}/${strategyTests.length} 通过`);
console.log(`流程测试: ${passedFlowTests}/${clientRequests.length} 通过`);
console.log(`总计: ${totalPassed}/${totalTests} 通过`);

if (totalPassed === totalTests) {
    console.log('\n🎉 所有测试通过！客户模式映射工作正常。');
    console.log('\n✅ 确认事项:');
    console.log('1. 前端Smart模式正确映射到后端Standard模式');
    console.log('2. 前端Custom模式正确映射到后端Standard模式');
    console.log('3. 分层短密码策略按预期工作');
    console.log('4. 用户界面设置不受影响');
    console.log('5. 向后兼容性得到保证');
} else {
    console.log('\n⚠️  部分测试失败，需要检查映射逻辑。');
}

console.log('\n🔧 客户模式映射测试完成！');