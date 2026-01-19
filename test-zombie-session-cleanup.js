#!/usr/bin/env node

/**
 * Test script for Zombie Session Cleanup Fix
 * 
 * This script tests the fix for zombie sessions that cause auto-restore on app restart.
 * 
 * Usage: node test-zombie-session-cleanup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Zombie Session Cleanup Fix');
console.log('='.repeat(50));

// Test 1: Verify zombie session cleanup method exists
console.log('\n📋 Test 1: Zombie Session Cleanup Method');
try {
    const sessionManagerCode = fs.readFileSync('src/main/modules/fileCompressor/sessionManager.js', 'utf-8');
    
    const hasCleanupZombieMethod = sessionManagerCode.includes('cleanupZombieSessions()');
    const hasZombieDetection = sessionManagerCode.includes('status === \'running\' || sessionData.status === \'paused\'');
    const hasStatusUpdate = sessionManagerCode.includes('sessionData.status = \'failed\'');
    const hasFileWrite = sessionManagerCode.includes('fs.writeFileSync(sessionFile');
    
    console.log(`✅ Cleanup zombie method: ${hasCleanupZombieMethod ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Zombie detection logic: ${hasZombieDetection ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Status update to failed: ${hasStatusUpdate ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ File write back: ${hasFileWrite ? 'FOUND' : 'MISSING'}`);
    
    if (hasCleanupZombieMethod && hasZombieDetection && hasStatusUpdate && hasFileWrite) {
        console.log('✅ Test 1 PASSED: Zombie session cleanup method implemented');
    } else {
        console.log('❌ Test 1 FAILED: Zombie session cleanup method incomplete');
    }
} catch (error) {
    console.log('❌ Test 1 ERROR:', error.message);
}

// Test 2: Verify startup cleanup call
console.log('\n📋 Test 2: Startup Cleanup Call');
try {
    const backendCode = fs.readFileSync('src/main/modules/fileCompressor/index.js', 'utf-8');
    
    const hasStartupCleanup = backendCode.includes('sessionManager.cleanupZombieSessions()');
    const hasCleanupLog = backendCode.includes('Cleaning up zombie sessions');
    const hasInitComment = backendCode.includes('启动时清理僵尸会话');
    
    console.log(`✅ Startup cleanup call: ${hasStartupCleanup ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Cleanup log message: ${hasCleanupLog ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Init comment: ${hasInitComment ? 'FOUND' : 'MISSING'}`);
    
    if (hasStartupCleanup && hasCleanupLog) {
        console.log('✅ Test 2 PASSED: Startup cleanup call implemented');
    } else {
        console.log('❌ Test 2 FAILED: Startup cleanup call incomplete');
    }
} catch (error) {
    console.log('❌ Test 2 ERROR:', error.message);
}

// Test 3: Verify improved session cleanup on stop
console.log('\n📋 Test 3: Improved Session Cleanup on Stop');
try {
    const backendCode = fs.readFileSync('src/main/modules/fileCompressor/index.js', 'utf-8');
    
    const hasCompleteSessionCall = backendCode.includes('sessionManager.completeSession(session.sessionId, false)');
    const hasMarkingLog = backendCode.includes('Marking session as stopped');
    const hasPreventAutoRestore = backendCode.includes('prevent auto-restore');
    
    console.log(`✅ Complete session call: ${hasCompleteSessionCall ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Marking log message: ${hasMarkingLog ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Auto-restore prevention: ${hasPreventAutoRestore ? 'FOUND' : 'MISSING'}`);
    
    if (hasCompleteSessionCall && hasMarkingLog) {
        console.log('✅ Test 3 PASSED: Improved session cleanup implemented');
    } else {
        console.log('❌ Test 3 FAILED: Improved session cleanup incomplete');
    }
} catch (error) {
    console.log('❌ Test 3 ERROR:', error.message);
}

// Test 4: Verify auto-restore logic still exists (but should not trigger for zombie sessions)
console.log('\n📋 Test 4: Auto-restore Logic Verification');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    
    const hasAutoRestore = frontendCode.includes('Auto-restoring running session');
    const hasSessionFilter = frontendCode.includes('s.status === \'running\' || s.status === \'active\'');
    const hasModeSwitch = frontendCode.includes('setMode(\'crack\')');
    
    console.log(`✅ Auto-restore logic: ${hasAutoRestore ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Session status filter: ${hasSessionFilter ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Mode switch to crack: ${hasModeSwitch ? 'FOUND' : 'MISSING'}`);
    
    if (hasAutoRestore && hasSessionFilter && hasModeSwitch) {
        console.log('✅ Test 4 PASSED: Auto-restore logic preserved (but zombie sessions will be cleaned)');
    } else {
        console.log('❌ Test 4 FAILED: Auto-restore logic missing');
    }
} catch (error) {
    console.log('❌ Test 4 ERROR:', error.message);
}

console.log('\n' + '='.repeat(50));
console.log('🏁 Test Summary Complete');
console.log('\n💡 Expected Behavior After Fix:');
console.log('1. On app startup, all zombie sessions (running/paused) are marked as failed');
console.log('2. Auto-restore will not trigger for zombie sessions');
console.log('3. Only genuinely running sessions (if any) will be restored');
console.log('4. When stopping tasks, sessions are properly marked as completed before deletion');
console.log('5. App will start with a clean state instead of old crack files');

console.log('\n🔧 Manual Testing Steps:');
console.log('1. Start a crack task and force-quit the app (Ctrl+C or close terminal)');
console.log('2. Restart the app with npm run dev');
console.log('3. Verify it starts with a clean file compressor page, not the old crack file');
console.log('4. Check console for "Cleaning up zombie sessions" message');