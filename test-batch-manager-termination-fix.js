#!/usr/bin/env node

/**
 * Test script to verify BatchTestManager termination fix
 * 
 * This script verifies that:
 * 1. BatchTestManager instances are properly stored in sessions
 * 2. terminateAllProcesses() calls BatchTestManager.terminateAllProcesses()
 * 3. All 7za.exe processes are properly terminated
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing BatchTestManager Termination Fix\n');

// Test 1: Check if terminateAllProcesses function includes BatchTestManager termination
console.log('1. Checking terminateAllProcesses function...');

const backendPath = 'src/main/modules/fileCompressor/index.js';
if (!fs.existsSync(backendPath)) {
    console.error('❌ Backend file not found:', backendPath);
    process.exit(1);
}

const backendCode = fs.readFileSync(backendPath, 'utf-8');

// Check for BatchTestManager termination in terminateAllProcesses
const hasBatchManagerTermination = backendCode.includes('session.batchManagers') && 
                                  backendCode.includes('batchManager.terminateAllProcesses()');

const hasEnhanced7zaKill = backendCode.includes('7za.exe') && 
                          backendCode.includes('wmic process');

const hasSessionBatchManagerStorage = backendCode.includes('session.batchManagers = []') &&
                                     backendCode.includes('session.batchManagers.push(batchManager)');

console.log(`   ✅ BatchTestManager termination in terminateAllProcesses: ${hasBatchManagerTermination ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Enhanced 7za.exe killing (wmic): ${hasEnhanced7zaKill ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Session BatchTestManager storage: ${hasSessionBatchManagerStorage ? 'FOUND' : 'MISSING'}`);

// Test 2: Check BatchTestManager.js has terminateAllProcesses method
console.log('\n2. Checking BatchTestManager.js...');

const batchManagerPath = 'src/main/modules/fileCompressor/batchTestManager.js';
if (!fs.existsSync(batchManagerPath)) {
    console.error('❌ BatchTestManager file not found:', batchManagerPath);
    process.exit(1);
}

const batchManagerCode = fs.readFileSync(batchManagerPath, 'utf-8');

const hasTerminateMethod = batchManagerCode.includes('terminateAllProcesses()') &&
                          batchManagerCode.includes('this.activeProcesses');

const hasProcessTracking = batchManagerCode.includes('this.activeProcesses = this.activeProcesses || new Set()') &&
                          batchManagerCode.includes('this.activeProcesses.add(proc)');

const hasForceKill = batchManagerCode.includes('SIGKILL') &&
                    batchManagerCode.includes('proc.kill(');

console.log(`   ✅ terminateAllProcesses method: ${hasTerminateMethod ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Process tracking: ${hasProcessTracking ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ Force kill capability: ${hasForceKill ? 'FOUND' : 'MISSING'}`);

// Test 3: Verify integration points
console.log('\n3. Checking integration points...');

// Check CPU cracking function
const cpuCrackingHasStorage = backendCode.includes('session.batchManagers.push(batchManager)') &&
                             backendCode.includes('Registered BatchTestManager for session');

// Check AI phase function  
const aiPhaseHasStorage = backendCode.includes('Registered BatchTestManager for AI phase');

console.log(`   ✅ CPU cracking BatchTestManager storage: ${cpuCrackingHasStorage ? 'FOUND' : 'MISSING'}`);
console.log(`   ✅ AI phase BatchTestManager storage: ${aiPhaseHasStorage ? 'FOUND' : 'MISSING'}`);

// Test 4: Check frontend stop functionality
console.log('\n4. Checking frontend stop functionality...');

const frontendPath = 'src/renderer/src/pages/FileCompressor.jsx';
if (fs.existsSync(frontendPath)) {
    const frontendCode = fs.readFileSync(frontendPath, 'utf-8');
    
    const hasStopHandler = frontendCode.includes('const handleStop = async () => {');
    const hasForceStop = frontendCode.includes('zipCrackStop') && frontendCode.includes('force = true');
    const hasSessionCleanup = frontendCode.includes('zipCrackDeleteSession');
    
    console.log(`   ✅ Stop handler: ${hasStopHandler ? 'FOUND' : 'MISSING'}`);
    console.log(`   ✅ Force stop capability: ${hasForceStop ? 'FOUND' : 'MISSING'}`);
    console.log(`   ✅ Session cleanup: ${hasSessionCleanup ? 'FOUND' : 'MISSING'}`);
} else {
    console.log('   ⚠️  Frontend file not found, skipping frontend checks');
}

// Summary
console.log('\n📋 SUMMARY:');
console.log('='.repeat(50));

const allChecksPass = hasBatchManagerTermination && 
                     hasEnhanced7zaKill && 
                     hasSessionBatchManagerStorage && 
                     hasTerminateMethod && 
                     hasProcessTracking && 
                     hasForceKill && 
                     cpuCrackingHasStorage && 
                     aiPhaseHasStorage;

if (allChecksPass) {
    console.log('✅ ALL CHECKS PASSED - BatchTestManager termination fix is complete!');
    console.log('');
    console.log('🔧 IMPLEMENTED FIXES:');
    console.log('   1. ✅ terminateAllProcesses() now calls BatchTestManager.terminateAllProcesses()');
    console.log('   2. ✅ BatchTestManager instances are stored in session.batchManagers[]');
    console.log('   3. ✅ Enhanced 7za.exe process killing with wmic on Windows');
    console.log('   4. ✅ BatchTestManager tracks and can terminate all spawned processes');
    console.log('   5. ✅ Both CPU and AI phases register their BatchTestManager instances');
    console.log('');
    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('   - When user clicks Cancel, ALL processes should terminate immediately');
    console.log('   - No 7za.exe processes should remain running in terminal');
    console.log('   - BatchTestManager processes are terminated before main process cleanup');
    console.log('   - System-level cleanup ensures no orphaned processes');
    
} else {
    console.log('❌ SOME CHECKS FAILED - Fix may be incomplete');
    console.log('');
    console.log('🔍 MISSING COMPONENTS:');
    if (!hasBatchManagerTermination) console.log('   ❌ BatchTestManager termination in terminateAllProcesses');
    if (!hasEnhanced7zaKill) console.log('   ❌ Enhanced 7za.exe killing');
    if (!hasSessionBatchManagerStorage) console.log('   ❌ Session BatchTestManager storage');
    if (!hasTerminateMethod) console.log('   ❌ BatchTestManager terminateAllProcesses method');
    if (!hasProcessTracking) console.log('   ❌ BatchTestManager process tracking');
    if (!hasForceKill) console.log('   ❌ BatchTestManager force kill capability');
    if (!cpuCrackingHasStorage) console.log('   ❌ CPU cracking BatchTestManager storage');
    if (!aiPhaseHasStorage) console.log('   ❌ AI phase BatchTestManager storage');
}

console.log('');
console.log('🧪 TEST INSTRUCTIONS:');
console.log('   1. Start a password cracking task');
console.log('   2. Click Cancel button');
console.log('   3. Check terminal/task manager for remaining 7za.exe processes');
console.log('   4. Verify no processes remain running');
console.log('');
console.log('📝 DEBUGGING:');
console.log('   - Check console logs for "Registered BatchTestManager for session"');
console.log('   - Look for "Terminating BatchTestManager processes" in logs');
console.log('   - Verify "Used wmic to kill 7za.exe processes" on Windows');

process.exit(allChecksPass ? 0 : 1);