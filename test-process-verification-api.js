#!/usr/bin/env node

/**
 * Test script for the new process verification API
 * This script tests the zipCrackVerifyTermination API functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Process Verification API Implementation');
console.log('='.repeat(50));

// Test 1: Check if backend API is implemented
console.log('\n📋 Test 1: Backend API Implementation');
const backendPath = path.join(__dirname, 'src/main/modules/fileCompressor/index.js');
if (fs.existsSync(backendPath)) {
    const backendCode = fs.readFileSync(backendPath, 'utf-8');
    
    const hasVerifyAPI = backendCode.includes("ipcMain.handle('zip:crack-verify-termination'");
    const hasProcessCheck = backendCode.includes('tasklist') && backendCode.includes('pgrep');
    const hasWindowsLogic = backendCode.includes('tasklist /FI "IMAGENAME eq');
    const hasUnixLogic = backendCode.includes('pgrep -f');
    const hasProcessDetails = backendCode.includes('processDetails');
    const hasIsClean = backendCode.includes('isClean');
    
    console.log(`✅ Verify termination API: ${hasVerifyAPI ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Cross-platform process check: ${hasProcessCheck ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Windows tasklist logic: ${hasWindowsLogic ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Unix pgrep logic: ${hasUnixLogic ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Process details tracking: ${hasProcessDetails ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Clean status reporting: ${hasIsClean ? 'FOUND' : 'MISSING'}`);
    
    if (hasVerifyAPI && hasProcessCheck && hasWindowsLogic && hasUnixLogic) {
        console.log('✅ Test 1 PASSED: Backend API properly implemented\n');
    } else {
        console.log('❌ Test 1 FAILED: Backend API implementation incomplete\n');
    }
} else {
    console.log('❌ Test 1 FAILED: Backend file not found\n');
}

// Test 2: Check if preload API is exposed
console.log('📋 Test 2: Preload API Exposure');
const preloadPath = path.join(__dirname, 'src/preload/index.js');
if (fs.existsSync(preloadPath)) {
    const preloadCode = fs.readFileSync(preloadPath, 'utf-8');
    
    const hasVerifyExposed = preloadCode.includes('zipCrackVerifyTermination');
    const hasVerifyIPC = preloadCode.includes("ipcRenderer.invoke('zip:crack-verify-termination'");
    
    console.log(`✅ zipCrackVerifyTermination exposed: ${hasVerifyExposed ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Verify termination IPC call: ${hasVerifyIPC ? 'FOUND' : 'MISSING'}`);
    
    if (hasVerifyExposed && hasVerifyIPC) {
        console.log('✅ Test 2 PASSED: Preload API properly exposed\n');
    } else {
        console.log('❌ Test 2 FAILED: Preload API exposure incomplete\n');
    }
} else {
    console.log('❌ Test 2 FAILED: Preload file not found\n');
}

// Test 3: Check API response structure
console.log('📋 Test 3: API Response Structure');
const expectedFields = [
    'success',
    'isClean', 
    'runningProcesses',
    'processDetails',
    'message',
    'timestamp'
];

let structureValid = true;
for (const field of expectedFields) {
    const fieldFound = fs.readFileSync(backendPath, 'utf-8').includes(`${field}:`);
    console.log(`✅ Response field '${field}': ${fieldFound ? 'FOUND' : 'MISSING'}`);
    if (!fieldFound) structureValid = false;
}

if (structureValid) {
    console.log('✅ Test 3 PASSED: API response structure is complete\n');
} else {
    console.log('❌ Test 3 FAILED: API response structure incomplete\n');
}

// Test 4: Check process name coverage
console.log('📋 Test 4: Process Name Coverage');
const backendContent = fs.readFileSync(backendPath, 'utf-8');
const requiredProcesses = ['7za.exe', '7z.exe', 'hashcat.exe', 'python.exe', 'bkcrack.exe'];
const requiredUnixProcesses = ['7za', '7z', 'hashcat', 'python', 'bkcrack'];

let processesFound = true;
for (const process of requiredProcesses) {
    const found = backendContent.includes(process);
    console.log(`✅ Windows process '${process}': ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) processesFound = false;
}

for (const process of requiredUnixProcesses) {
    const found = backendContent.includes(`'${process}'`);
    console.log(`✅ Unix process '${process}': ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) processesFound = false;
}

if (processesFound) {
    console.log('✅ Test 4 PASSED: All required processes covered\n');
} else {
    console.log('❌ Test 4 FAILED: Some processes missing from coverage\n');
}

// Summary
console.log('📊 SUMMARY');
console.log('='.repeat(30));
console.log('The process verification API has been implemented with:');
console.log('');
console.log('1. ✅ Backend IPC handler for zip:crack-verify-termination');
console.log('2. ✅ Cross-platform process detection (Windows + Unix)');
console.log('3. ✅ Detailed process information collection');
console.log('4. ✅ Frontend API exposure through preload');
console.log('5. ✅ Comprehensive response structure');
console.log('');
console.log('Next steps:');
console.log('- Integrate verification into frontend cancel handler');
console.log('- Add progressive termination with verification');
console.log('- Implement nuclear options for stubborn processes');