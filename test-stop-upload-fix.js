#!/usr/bin/env node

/**
 * Test script for File Compressor Stop and Upload Fix
 * 
 * This script tests the enhanced stop functionality and file upload during active tasks.
 * 
 * Usage: node test-stop-upload-fix.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing File Compressor Stop and Upload Fix');
console.log('='.repeat(50));

// Test 1: Verify enhanced stop mechanism exists
console.log('\n📋 Test 1: Enhanced Stop Mechanism');
try {
    const backendCode = fs.readFileSync('src/main/modules/fileCompressor/index.js', 'utf-8');
    
    // Check for enhanced stop handler
    const hasEnhancedStop = backendCode.includes('ipcMain.handle(\'zip:crack-stop\'');
    const hasGracefulTermination = backendCode.includes('gracefulStop');
    const hasForceTermination = backendCode.includes('force = false');
    const hasTimeout = backendCode.includes('3000'); // 3 second timeout
    
    console.log(`✅ Enhanced stop handler: ${hasEnhancedStop ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Graceful termination: ${hasGracefulTermination ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Force termination: ${hasForceTermination ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Timeout handling: ${hasTimeout ? 'FOUND' : 'MISSING'}`);
    
    if (hasEnhancedStop && hasGracefulTermination && hasForceTermination && hasTimeout) {
        console.log('✅ Test 1 PASSED: Enhanced stop mechanism implemented');
    } else {
        console.log('❌ Test 1 FAILED: Enhanced stop mechanism incomplete');
    }
} catch (error) {
    console.log('❌ Test 1 ERROR:', error.message);
}

// Test 2: Verify frontend stop button logic
console.log('\n📋 Test 2: Frontend Stop Button Logic');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    
    const hasStopInProgress = frontendCode.includes('stopInProgress');
    const hasTimeoutHandling = frontendCode.includes('Stop timeout');
    const hasForceStopDialog = frontendCode.includes('showForceStopDialog');
    const hasPromiseRace = frontendCode.includes('Promise.race');
    
    console.log(`✅ Stop in progress state: ${hasStopInProgress ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Timeout handling: ${hasTimeoutHandling ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Force stop dialog: ${hasForceStopDialog ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Promise race for timeout: ${hasPromiseRace ? 'FOUND' : 'MISSING'}`);
    
    if (hasStopInProgress && hasTimeoutHandling && hasForceStopDialog && hasPromiseRace) {
        console.log('✅ Test 2 PASSED: Frontend stop logic implemented');
    } else {
        console.log('❌ Test 2 FAILED: Frontend stop logic incomplete');
    }
} catch (error) {
    console.log('❌ Test 2 ERROR:', error.message);
}

// Test 3: Verify file queue management
console.log('\n📋 Test 3: File Queue Management');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    
    const hasFileQueue = frontendCode.includes('fileQueue');
    const hasQueueStatus = frontendCode.includes('queueStatus');
    const hasAutoProcessing = frontendCode.includes('Auto-processing queued files');
    const hasQueueDisplay = frontendCode.includes('file') && frontendCode.includes('queued');
    const hasUploadHandler = frontendCode.includes('handleFileUpload');
    
    console.log(`✅ File queue state: ${hasFileQueue ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Queue status tracking: ${hasQueueStatus ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Auto-processing logic: ${hasAutoProcessing ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Queue display UI: ${hasQueueDisplay ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Enhanced upload handler: ${hasUploadHandler ? 'FOUND' : 'MISSING'}`);
    
    if (hasFileQueue && hasQueueStatus && hasAutoProcessing && hasQueueDisplay && hasUploadHandler) {
        console.log('✅ Test 3 PASSED: File queue management implemented');
    } else {
        console.log('❌ Test 3 FAILED: File queue management incomplete');
    }
} catch (error) {
    console.log('❌ Test 3 ERROR:', error.message);
}

// Test 4: Verify API changes
console.log('\n📋 Test 4: API Changes');
try {
    const preloadCode = fs.readFileSync('src/preload/index.js', 'utf-8');
    
    const hasInvokeStop = preloadCode.includes('ipcRenderer.invoke(\'zip:crack-stop\'');
    const hasForceParameter = preloadCode.includes('force = false');
    const removedStoppedListener = !preloadCode.includes('onZipCrackStopped');
    
    console.log(`✅ Invoke-based stop API: ${hasInvokeStop ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Force parameter support: ${hasForceParameter ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Removed old stopped listener: ${removedStoppedListener ? 'YES' : 'NO'}`);
    
    if (hasInvokeStop && hasForceParameter && removedStoppedListener) {
        console.log('✅ Test 4 PASSED: API changes implemented correctly');
    } else {
        console.log('❌ Test 4 FAILED: API changes incomplete');
    }
} catch (error) {
    console.log('❌ Test 4 ERROR:', error.message);
}

// Test 5: Verify UI state management
console.log('\n📋 Test 5: UI State Management');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    
    const hasDisabledButton = frontendCode.includes('disabled={stopInProgress}');
    const hasButtonStateLogic = frontendCode.includes('stopInProgress') && frontendCode.includes('bg-gray-400 cursor-not-allowed');
    const hasForceStopUI = frontendCode.includes('Force Stop Confirmation Dialog');
    const hasQueueStatusUI = frontendCode.includes('Queue Status Display');
    
    console.log(`✅ Disabled stop button: ${hasDisabledButton ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Button state styling: ${hasButtonStateLogic ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Force stop dialog UI: ${hasForceStopUI ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Queue status display: ${hasQueueStatusUI ? 'FOUND' : 'MISSING'}`);
    
    if (hasDisabledButton && hasButtonStateLogic && hasForceStopUI && hasQueueStatusUI) {
        console.log('✅ Test 5 PASSED: UI state management implemented');
    } else {
        console.log('❌ Test 5 FAILED: UI state management incomplete');
    }
} catch (error) {
    console.log('❌ Test 5 ERROR:', error.message);
}

console.log('\n' + '='.repeat(50));
console.log('🏁 Test Summary Complete');
console.log('\n💡 Manual Testing Required:');
console.log('1. Start a password crack task');
console.log('2. Click Stop button and verify it completes within 5 seconds');
console.log('3. If timeout occurs, verify force stop dialog appears');
console.log('4. During active task, try uploading new files');
console.log('5. Verify files are queued and processed after current task');
console.log('6. Check queue status display shows correct information');