#!/usr/bin/env node

/**
 * Test script for Stop Button Duplicate Request Fix
 * 
 * This script tests the fix for duplicate stop requests and session cleanup issues.
 * 
 * Usage: node test-stop-fix-duplicate-requests.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Stop Button Duplicate Request Fix');
console.log('='.repeat(50));

// Test 1: Verify duplicate request prevention in frontend
console.log('\n📋 Test 1: Frontend Duplicate Request Prevention');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    
    const hasStopRequestedRef = frontendCode.includes('stopRequestedRef');
    const hasDuplicateCheck = frontendCode.includes('stopRequestedRef.current || stopInProgress');
    const hasIgnoreDuplicateLog = frontendCode.includes('Stop already in progress, ignoring duplicate request');
    const hasRefReset = frontendCode.includes('stopRequestedRef.current = false');
    
    console.log(`✅ Stop requested ref: ${hasStopRequestedRef ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Duplicate check logic: ${hasDuplicateCheck ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Ignore duplicate log: ${hasIgnoreDuplicateLog ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Ref reset in finally: ${hasRefReset ? 'FOUND' : 'MISSING'}`);
    
    if (hasStopRequestedRef && hasDuplicateCheck && hasIgnoreDuplicateLog && hasRefReset) {
        console.log('✅ Test 1 PASSED: Frontend duplicate request prevention implemented');
    } else {
        console.log('❌ Test 1 FAILED: Frontend duplicate request prevention incomplete');
    }
} catch (error) {
    console.log('❌ Test 1 ERROR:', error.message);
}

// Test 2: Verify backend session state tracking
console.log('\n📋 Test 2: Backend Session State Tracking');
try {
    const backendCode = fs.readFileSync('src/main/modules/fileCompressor/index.js', 'utf-8');
    
    const hasStoppingFlag = backendCode.includes('session.stopping');
    const hasStoppingCheck = backendCode.includes('Stop already in progress for');
    const hasSessionNotFoundMessage = backendCode.includes('Session already stopped or not found');
    const hasStoppingFlagSet = backendCode.includes('session.stopping = true');
    
    console.log(`✅ Stopping flag usage: ${hasStoppingFlag ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Stopping check logic: ${hasStoppingCheck ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Better not found message: ${hasSessionNotFoundMessage ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Stopping flag set: ${hasStoppingFlagSet ? 'FOUND' : 'MISSING'}`);
    
    if (hasStoppingFlag && hasStoppingCheck && hasSessionNotFoundMessage && hasStoppingFlagSet) {
        console.log('✅ Test 2 PASSED: Backend session state tracking implemented');
    } else {
        console.log('❌ Test 2 FAILED: Backend session state tracking incomplete');
    }
} catch (error) {
    console.log('❌ Test 2 ERROR:', error.message);
}

// Test 3: Verify proper error handling
console.log('\n📋 Test 3: Error Handling Improvements');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    const backendCode = fs.readFileSync('src/main/modules/fileCompressor/index.js', 'utf-8');
    
    const frontendHasFinally = frontendCode.includes('} finally {') && frontendCode.includes('stopRequestedRef.current = false');
    const backendHasCleanupOnError = backendCode.includes('Ensure cleanup even on error');
    const frontendHasStateReset = frontendCode.includes('Reset UI state even on error');
    
    console.log(`✅ Frontend finally block: ${frontendHasFinally ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Backend cleanup on error: ${backendHasCleanupOnError ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Frontend state reset on error: ${frontendHasStateReset ? 'FOUND' : 'MISSING'}`);
    
    if (frontendHasFinally && backendHasCleanupOnError && frontendHasStateReset) {
        console.log('✅ Test 3 PASSED: Error handling improvements implemented');
    } else {
        console.log('❌ Test 3 FAILED: Error handling improvements incomplete');
    }
} catch (error) {
    console.log('❌ Test 3 ERROR:', error.message);
}

// Test 4: Verify force stop improvements
console.log('\n📋 Test 4: Force Stop Improvements');
try {
    const frontendCode = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');
    
    const hasForceStopDuplicateCheck = frontendCode.includes('!stopRequestedRef.current');
    const hasForceStopRefSet = frontendCode.includes('stopRequestedRef.current = true') && frontendCode.includes('handleForceStop');
    const hasForceStopRefReset = frontendCode.includes('stopRequestedRef.current = false') && frontendCode.includes('setShowForceStopDialog(false)');
    
    console.log(`✅ Force stop duplicate check: ${hasForceStopDuplicateCheck ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Force stop ref set: ${hasForceStopRefSet ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Force stop ref reset: ${hasForceStopRefReset ? 'FOUND' : 'MISSING'}`);
    
    if (hasForceStopDuplicateCheck && hasForceStopRefSet && hasForceStopRefReset) {
        console.log('✅ Test 4 PASSED: Force stop improvements implemented');
    } else {
        console.log('❌ Test 4 FAILED: Force stop improvements incomplete');
    }
} catch (error) {
    console.log('❌ Test 4 ERROR:', error.message);
}

console.log('\n' + '='.repeat(50));
console.log('🏁 Test Summary Complete');
console.log('\n💡 Expected Behavior After Fix:');
console.log('1. Stop button should only send one request per click');
console.log('2. Backend should not show "No session found" repeatedly');
console.log('3. UI should properly reset after stop operation');
console.log('4. Force stop should work without duplicate requests');
console.log('5. Error states should be properly handled and reset');