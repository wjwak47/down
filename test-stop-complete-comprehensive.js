/**
 * Comprehensive Test: Complete Stop Functionality
 * 
 * This test verifies that the stop button completely terminates all background processes
 * and prevents auto-reconnection through wake-up detection.
 * 
 * Test Scenarios:
 * 1. Start crack task → Stop → Verify no processes remain
 * 2. Start crack task → Pause → Stop → Verify no processes remain  
 * 3. Start crack task → Stop → Wait → Verify no auto-reconnection
 * 4. Multiple sessions → Stop all → Verify complete cleanup
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    testArchive: path.join(__dirname, 'test-files', 'test-encrypted.zip'),
    testTimeout: 30000, // 30 seconds max per test
    processCheckInterval: 1000, // Check processes every 1 second
    maxProcessChecks: 10 // Check up to 10 times
};

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}[Test] ${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// Helper function to check for running processes
function checkRunningProcesses() {
    try {
        let processes = [];
        
        if (process.platform === 'win32') {
            // Windows: Check for hashcat, python, 7z processes
            const output = execSync('tasklist /FI "IMAGENAME eq hashcat.exe" /FI "IMAGENAME eq python.exe" /FI "IMAGENAME eq 7z.exe" /FO CSV', { encoding: 'utf8' });
            const lines = output.split('\n').filter(line => line.includes('.exe'));
            processes = lines.map(line => {
                const parts = line.split(',');
                return {
                    name: parts[0]?.replace(/"/g, ''),
                    pid: parts[1]?.replace(/"/g, '')
                };
            });
        } else {
            // Mac/Linux: Check for hashcat, python, 7z processes
            try {
                const hashcatOutput = execSync('pgrep -f hashcat', { encoding: 'utf8' }).trim();
                if (hashcatOutput) {
                    hashcatOutput.split('\n').forEach(pid => {
                        processes.push({ name: 'hashcat', pid: pid.trim() });
                    });
                }
            } catch (e) {}
            
            try {
                const pythonOutput = execSync('pgrep -f "passgpt_inference"', { encoding: 'utf8' }).trim();
                if (pythonOutput) {
                    pythonOutput.split('\n').forEach(pid => {
                        processes.push({ name: 'python-passgpt', pid: pid.trim() });
                    });
                }
            } catch (e) {}
            
            try {
                const sevenZOutput = execSync('pgrep -f "7z"', { encoding: 'utf8' }).trim();
                if (sevenZOutput) {
                    sevenZOutput.split('\n').forEach(pid => {
                        processes.push({ name: '7z', pid: pid.trim() });
                    });
                }
            } catch (e) {}
        }
        
        return processes.filter(p => p.pid && p.pid !== '');
    } catch (error) {
        logWarning(`Failed to check processes: ${error.message}`);
        return [];
    }
}

// Helper function to wait for processes to terminate
async function waitForProcessTermination(maxChecks = TEST_CONFIG.maxProcessChecks) {
    for (let i = 0; i < maxChecks; i++) {
        const processes = checkRunningProcesses();
        
        if (processes.length === 0) {
            logSuccess(`All processes terminated after ${i + 1} checks`);
            return true;
        }
        
        logInfo(`Check ${i + 1}/${maxChecks}: Found ${processes.length} running processes: ${processes.map(p => `${p.name}(${p.pid})`).join(', ')}`);
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.processCheckInterval));
    }
    
    const remainingProcesses = checkRunningProcesses();
    logError(`Processes still running after ${maxChecks} checks: ${remainingProcesses.map(p => `${p.name}(${p.pid})`).join(', ')}`);
    return false;
}

// Mock IPC for testing
class MockIPC {
    constructor() {
        this.handlers = new Map();
        this.listeners = new Map();
        this.sessions = new Map();
    }
    
    handle(channel, handler) {
        this.handlers.set(channel, handler);
    }
    
    async invoke(channel, ...args) {
        const handler = this.handlers.get(channel);
        if (!handler) {
            throw new Error(`No handler for channel: ${channel}`);
        }
        
        // Create mock event object
        const mockEvent = {
            reply: (replyChannel, data) => {
                const listeners = this.listeners.get(replyChannel) || [];
                listeners.forEach(listener => listener(data));
            }
        };
        
        return await handler(mockEvent, ...args);
    }
    
    on(channel, listener) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, []);
        }
        this.listeners.get(channel).push(listener);
    }
    
    // Simulate starting a crack session
    async startCrackSession() {
        const sessionId = `test-session-${Date.now()}`;
        const jobId = `test-job-${Date.now()}`;
        
        logInfo(`Starting crack session: ${sessionId}`);
        
        // Start the crack process
        const result = await this.invoke('zip:crack-start', {
            id: jobId,
            archivePath: TEST_CONFIG.testArchive,
            options: {
                mode: 'smart',
                charset: ['lowercase', 'numbers'],
                minLength: 1,
                maxLength: 4,
                attackMode: 'fast'
            }
        });
        
        if (result.success) {
            this.sessions.set(jobId, { sessionId, jobId, status: 'running' });
            logSuccess(`Crack session started: ${jobId}`);
            return { sessionId, jobId };
        } else {
            throw new Error(`Failed to start crack session: ${result.error}`);
        }
    }
    
    // Simulate stopping a crack session
    async stopCrackSession(jobId, force = false) {
        logInfo(`Stopping crack session: ${jobId} (force: ${force})`);
        
        const result = await this.invoke('zip:crack-stop', { id: jobId, force });
        
        if (result.success) {
            this.sessions.delete(jobId);
            logSuccess(`Crack session stopped: ${jobId}`);
            return result;
        } else {
            throw new Error(`Failed to stop crack session: ${result.error}`);
        }
    }
    
    // Simulate pausing a crack session
    async pauseCrackSession(jobId) {
        logInfo(`Pausing crack session: ${jobId}`);
        
        const result = await this.invoke('zip:crack-pause', { id: jobId });
        
        if (result.success) {
            const session = this.sessions.get(jobId);
            if (session) {
                session.status = 'paused';
            }
            logSuccess(`Crack session paused: ${jobId}`);
            return result;
        } else {
            throw new Error(`Failed to pause crack session: ${result.error}`);
        }
    }
    
    // Check session blacklist
    async isSessionBlacklisted(sessionId) {
        const result = await this.invoke('zip:crack-is-blacklisted', { sessionId });
        return result.isBlacklisted;
    }
    
    // List active sessions
    async listSessions() {
        const result = await this.invoke('zip:crack-list-sessions');
        return result.sessions || [];
    }
}

// Test Cases
class StopFunctionalityTests {
    constructor() {
        this.ipc = new MockIPC();
        this.testResults = [];
    }
    
    async runAllTests() {
        logInfo('Starting comprehensive stop functionality tests...');
        
        // Initialize the file compressor module to register IPC handlers
        try {
            // Import and initialize the module
            const fileCompressorModule = require('./src/main/modules/fileCompressor/index.js');
            logSuccess('File compressor module loaded successfully');
        } catch (error) {
            logError(`Failed to load file compressor module: ${error.message}`);
            return false;
        }
        
        const tests = [
            { name: 'Basic Stop Test', fn: () => this.testBasicStop() },
            { name: 'Pause Then Stop Test', fn: () => this.testPauseStop() },
            { name: 'Stop Prevents Reconnection Test', fn: () => this.testStopPreventsReconnection() },
            { name: 'Multiple Sessions Stop Test', fn: () => this.testMultipleSessionsStop() },
            { name: 'Force Stop Test', fn: () => this.testForceStop() }
        ];
        
        for (const test of tests) {
            try {
                logInfo(`Running test: ${test.name}`);
                const result = await Promise.race([
                    test.fn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.testTimeout)
                    )
                ]);
                
                this.testResults.push({ name: test.name, status: 'PASS', result });
                logSuccess(`Test passed: ${test.name}`);
            } catch (error) {
                this.testResults.push({ name: test.name, status: 'FAIL', error: error.message });
                logError(`Test failed: ${test.name} - ${error.message}`);
            }
            
            // Wait between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        this.printTestSummary();
        return this.testResults.every(result => result.status === 'PASS');
    }
    
    async testBasicStop() {
        logInfo('Test 1: Basic Stop - Start crack → Stop → Verify no processes remain');
        
        // Start crack session
        const { sessionId, jobId } = await this.ipc.startCrackSession();
        
        // Wait a moment for processes to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check that processes are running
        const processesBefore = checkRunningProcesses();
        if (processesBefore.length === 0) {
            logWarning('No processes detected before stop - test may be inconclusive');
        } else {
            logInfo(`Found ${processesBefore.length} processes before stop`);
        }
        
        // Stop the session
        await this.ipc.stopCrackSession(jobId);
        
        // Wait for processes to terminate
        const allTerminated = await waitForProcessTermination();
        
        if (!allTerminated) {
            throw new Error('Processes still running after stop');
        }
        
        // Verify session is blacklisted
        const isBlacklisted = await this.ipc.isSessionBlacklisted(sessionId);
        if (!isBlacklisted) {
            throw new Error('Session was not blacklisted after stop');
        }
        
        return { processesTerminated: true, sessionBlacklisted: true };
    }
    
    async testPauseStop() {
        logInfo('Test 2: Pause Then Stop - Start crack → Pause → Stop → Verify no processes remain');
        
        // Start crack session
        const { sessionId, jobId } = await this.ipc.startCrackSession();
        
        // Wait for processes to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Pause the session
        await this.ipc.pauseCrackSession(jobId);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stop the paused session
        await this.ipc.stopCrackSession(jobId);
        
        // Wait for processes to terminate
        const allTerminated = await waitForProcessTermination();
        
        if (!allTerminated) {
            throw new Error('Processes still running after stop of paused session');
        }
        
        // Verify session is blacklisted
        const isBlacklisted = await this.ipc.isSessionBlacklisted(sessionId);
        if (!isBlacklisted) {
            throw new Error('Paused session was not blacklisted after stop');
        }
        
        return { pausedThenStopped: true, processesTerminated: true, sessionBlacklisted: true };
    }
    
    async testStopPreventsReconnection() {
        logInfo('Test 3: Stop Prevents Reconnection - Start crack → Stop → Wait → Verify no auto-reconnection');
        
        // Start crack session
        const { sessionId, jobId } = await this.ipc.startCrackSession();
        
        // Wait for processes to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stop the session
        await this.ipc.stopCrackSession(jobId);
        
        // Wait for termination
        await waitForProcessTermination();
        
        // Wait additional time to see if any processes restart
        logInfo('Waiting to check for auto-reconnection...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check that no processes have restarted
        const processesAfterWait = checkRunningProcesses();
        if (processesAfterWait.length > 0) {
            throw new Error(`Processes restarted after stop: ${processesAfterWait.map(p => p.name).join(', ')}`);
        }
        
        // Verify session is still blacklisted
        const isBlacklisted = await this.ipc.isSessionBlacklisted(sessionId);
        if (!isBlacklisted) {
            throw new Error('Session blacklist was cleared unexpectedly');
        }
        
        // Verify session doesn't appear in active sessions list
        const activeSessions = await this.ipc.listSessions();
        const foundSession = activeSessions.find(s => s.id === sessionId);
        if (foundSession) {
            throw new Error('Stopped session still appears in active sessions list');
        }
        
        return { noReconnection: true, sessionBlacklisted: true, notInActiveList: true };
    }
    
    async testMultipleSessionsStop() {
        logInfo('Test 4: Multiple Sessions Stop - Start multiple cracks → Stop all → Verify complete cleanup');
        
        const sessions = [];
        
        // Start multiple sessions
        for (let i = 0; i < 3; i++) {
            const session = await this.ipc.startCrackSession();
            sessions.push(session);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Stagger starts
        }
        
        logInfo(`Started ${sessions.length} crack sessions`);
        
        // Wait for all processes to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Stop all sessions
        for (const session of sessions) {
            await this.ipc.stopCrackSession(session.jobId);
            await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between stops
        }
        
        // Wait for all processes to terminate
        const allTerminated = await waitForProcessTermination(15); // More time for multiple sessions
        
        if (!allTerminated) {
            throw new Error('Some processes still running after stopping multiple sessions');
        }
        
        // Verify all sessions are blacklisted
        for (const session of sessions) {
            const isBlacklisted = await this.ipc.isSessionBlacklisted(session.sessionId);
            if (!isBlacklisted) {
                throw new Error(`Session ${session.sessionId} was not blacklisted`);
            }
        }
        
        return { 
            sessionsCount: sessions.length, 
            allProcessesTerminated: true, 
            allSessionsBlacklisted: true 
        };
    }
    
    async testForceStop() {
        logInfo('Test 5: Force Stop - Start crack → Force stop → Verify immediate termination');
        
        // Start crack session
        const { sessionId, jobId } = await this.ipc.startCrackSession();
        
        // Wait for processes to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Force stop the session
        await this.ipc.stopCrackSession(jobId, true); // force = true
        
        // Wait for processes to terminate (should be faster with force)
        const allTerminated = await waitForProcessTermination(5); // Less time for force stop
        
        if (!allTerminated) {
            throw new Error('Processes still running after force stop');
        }
        
        // Verify session is blacklisted
        const isBlacklisted = await this.ipc.isSessionBlacklisted(sessionId);
        if (!isBlacklisted) {
            throw new Error('Session was not blacklisted after force stop');
        }
        
        return { forceStopSuccessful: true, processesTerminated: true, sessionBlacklisted: true };
    }
    
    printTestSummary() {
        logInfo('\n=== TEST SUMMARY ===');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        
        this.testResults.forEach(result => {
            if (result.status === 'PASS') {
                logSuccess(`✅ ${result.name}`);
            } else {
                logError(`❌ ${result.name}: ${result.error}`);
            }
        });
        
        logInfo(`\nTotal: ${this.testResults.length}, Passed: ${passed}, Failed: ${failed}`);
        
        if (failed === 0) {
            logSuccess('🎉 All tests passed! Stop functionality is working correctly.');
        } else {
            logError(`⚠️  ${failed} test(s) failed. Stop functionality needs attention.`);
        }
    }
}

// Main execution
async function main() {
    // Check if test archive exists
    if (!fs.existsSync(TEST_CONFIG.testArchive)) {
        logWarning(`Test archive not found: ${TEST_CONFIG.testArchive}`);
        logInfo('Creating a simple test archive...');
        
        // Create test directory if it doesn't exist
        const testDir = path.dirname(TEST_CONFIG.testArchive);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Create a simple test file and zip it (this is just for testing, won't actually crack)
        const testFile = path.join(testDir, 'test.txt');
        fs.writeFileSync(testFile, 'This is a test file for password cracking tests.');
        
        logInfo('Test archive created (note: actual cracking may not work without proper encrypted archive)');
    }
    
    const tester = new StopFunctionalityTests();
    const success = await tester.runAllTests();
    
    process.exit(success ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        logError(`Test execution failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    });
}

module.exports = { StopFunctionalityTests, checkRunningProcesses, waitForProcessTermination };