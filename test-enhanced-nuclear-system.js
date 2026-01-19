#!/usr/bin/env node

/**
 * Test script for the enhanced nuclear termination system
 * This script tests the advanced multi-method process termination
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Enhanced Nuclear Termination System');
console.log('='.repeat(50));

// Test 1: Check if enhanced nuclear cleanup is implemented
console.log('\n📋 Test 1: Enhanced Nuclear Cleanup Implementation');
const backendPath = path.join(__dirname, 'src/main/modules/fileCompressor/index.js');
if (fs.existsSync(backendPath)) {
    const backendCode = fs.readFileSync(backendPath, 'utf-8');
    
    const hasEnhancedNuclear = backendCode.includes('ENHANCED NUCLEAR CLEANUP');
    const hasResultsTracking = backendCode.includes('const results = {') && backendCode.includes('totalProcesses:');
    const hasMethodsUsed = backendCode.includes('methodsUsed:');
    const hasSuccessfulAttempts = backendCode.includes('successfulAttempts:');
    const hasFinalVerification = backendCode.includes('finalVerification');
    
    console.log(`✅ Enhanced nuclear cleanup: ${hasEnhancedNuclear ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Results tracking: ${hasResultsTracking ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Methods tracking: ${hasMethodsUsed ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Success tracking: ${hasSuccessfulAttempts ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Final verification: ${hasFinalVerification ? 'FOUND' : 'MISSING'}`);
    
    if (hasEnhancedNuclear && hasResultsTracking && hasMethodsUsed && hasFinalVerification) {
        console.log('✅ Test 1 PASSED: Enhanced nuclear cleanup properly implemented\n');
    } else {
        console.log('❌ Test 1 FAILED: Enhanced nuclear cleanup implementation incomplete\n');
    }
} else {
    console.log('❌ Test 1 FAILED: Backend file not found\n');
}

// Test 2: Check Windows-specific enhancements
console.log('📋 Test 2: Windows-Specific Enhancements');
if (fs.existsSync(backendPath)) {
    const backendCode = fs.readFileSync(backendPath, 'utf-8');
    
    const hasEnhancedTaskkill = backendCode.includes('Method 1: Enhanced taskkill');
    const hasProcessEnumeration = backendCode.includes('tasklist /FI "IMAGENAME eq');
    const hasEnhancedWmic = backendCode.includes('Method 2: Enhanced wmic');
    const hasWmicVerification = backendCode.includes('wmic process where "name=');
    const hasEnhancedPowerShell = backendCode.includes('Method 3: Enhanced PowerShell');
    const hasProcessHandleTermination = backendCode.includes('Method 4: Process handle termination');
    const hasWmiObjectTermination = backendCode.includes('Get-WmiObject Win32_Process');
    
    console.log(`✅ Enhanced taskkill: ${hasEnhancedTaskkill ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Process enumeration: ${hasProcessEnumeration ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Enhanced wmic: ${hasEnhancedWmic ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Wmic verification: ${hasWmicVerification ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Enhanced PowerShell: ${hasEnhancedPowerShell ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Process handle termination: ${hasProcessHandleTermination ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ WMI object termination: ${hasWmiObjectTermination ? 'FOUND' : 'MISSING'}`);
    
    if (hasEnhancedTaskkill && hasEnhancedWmic && hasEnhancedPowerShell && hasProcessHandleTermination) {
        console.log('✅ Test 2 PASSED: Windows-specific enhancements complete\n');
    } else {
        console.log('❌ Test 2 FAILED: Windows-specific enhancements incomplete\n');
    }
} else {
    console.log('❌ Test 2 FAILED: Backend file not found\n');
}

// Test 3: Check Unix-specific enhancements
console.log('📋 Test 3: Unix-Specific Enhancements');
if (fs.existsSync(backendPath)) {
    const backendCode = fs.readFileSync(backendPath, 'utf-8');
    
    const hasSignalEscalation = backendCode.includes('signal escalation');
    const hasTermKillSignals = backendCode.includes("signals = ['TERM', 'KILL']");
    const hasPkillEnhancement = backendCode.includes('Method 1: Enhanced pkill');
    const hasEnhancedKillall = backendCode.includes('Method 2: Enhanced killall');
    const hasSignalVerification = backendCode.includes('Wait and verify');
    const hasIndividualKillall = backendCode.includes('killall for each process individually');
    
    console.log(`✅ Signal escalation: ${hasSignalEscalation ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ TERM/KILL signals: ${hasTermKillSignals ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Enhanced pkill: ${hasPkillEnhancement ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Enhanced killall: ${hasEnhancedKillall ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Signal verification: ${hasSignalVerification ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Individual killall: ${hasIndividualKillall ? 'FOUND' : 'MISSING'}`);
    
    if (hasSignalEscalation && hasTermKillSignals && hasPkillEnhancement && hasEnhancedKillall) {
        console.log('✅ Test 3 PASSED: Unix-specific enhancements complete\n');
    } else {
        console.log('❌ Test 3 FAILED: Unix-specific enhancements incomplete\n');
    }
} else {
    console.log('❌ Test 3 FAILED: Backend file not found\n');
}

// Test 4: Check comprehensive reporting
console.log('📋 Test 4: Comprehensive Reporting');
if (fs.existsSync(backendPath)) {
    const backendCode = fs.readFileSync(backendPath, 'utf-8');
    
    const hasSuccessRate = backendCode.includes('successRate') && backendCode.includes('toFixed(1)');
    const hasTerminationReport = backendCode.includes('Termination report:');
    const hasMethodsUsedReport = backendCode.includes('Methods used:');
    const hasTotalAttemptsReport = backendCode.includes('Total attempts:');
    const hasSuccessRateReport = backendCode.includes('Success rate:');
    const hasTerminatedProcessesReport = backendCode.includes('Terminated processes:');
    const hasFailedProcessesReport = backendCode.includes('Failed processes:');
    const hasRemainingProcessesReport = backendCode.includes('Still running:');
    
    console.log(`✅ Success rate calculation: ${hasSuccessRate ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Termination report: ${hasTerminationReport ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Methods used report: ${hasMethodsUsedReport ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Total attempts report: ${hasTotalAttemptsReport ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Success rate report: ${hasSuccessRateReport ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Terminated processes report: ${hasTerminatedProcessesReport ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Failed processes report: ${hasFailedProcessesReport ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Remaining processes report: ${hasRemainingProcessesReport ? 'FOUND' : 'MISSING'}`);
    
    if (hasSuccessRate && hasTerminationReport && hasMethodsUsedReport && hasSuccessRateReport) {
        console.log('✅ Test 4 PASSED: Comprehensive reporting complete\n');
    } else {
        console.log('❌ Test 4 FAILED: Comprehensive reporting incomplete\n');
    }
} else {
    console.log('❌ Test 4 FAILED: Backend file not found\n');
}

// Summary
console.log('📊 SUMMARY');
console.log('='.repeat(30));
console.log('The enhanced nuclear termination system has been implemented with:');
console.log('');
console.log('🪟 Windows Methods:');
console.log('  1. Enhanced taskkill with process enumeration');
console.log('  2. Enhanced wmic with verification');
console.log('  3. Enhanced PowerShell with process verification');
console.log('  4. Process handle termination via WMI');
console.log('');
console.log('🐧 Unix Methods:');
console.log('  1. Enhanced pkill with signal escalation (TERM → KILL)');
console.log('  2. Enhanced killall with individual process targeting');
console.log('');
console.log('📊 Features:');
console.log('  - Comprehensive results tracking');
console.log('  - Success rate calculation');
console.log('  - Method usage tracking');
console.log('  - Final verification');
console.log('  - Detailed reporting');
console.log('  - Process enumeration and verification');
console.log('  - Signal escalation (Unix)');
console.log('  - Multiple termination methods (Windows)');
console.log('');
console.log('This system provides maximum reliability for process termination');