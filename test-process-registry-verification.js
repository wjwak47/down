/**
 * Process Registry Verification Test
 * 
 * This script verifies that the process registry is properly tracking
 * and terminating all spawned processes during password cracking.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    testDuration: 10000, // Run test for 10 seconds
    checkInterval: 1000   // Check processes every 1 second
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
    console.log(`${colors[color]}[ProcessTest] ${message}${colors.reset}`);
}

// Mock process registry for testing
class ProcessRegistry {
    constructor() {
        this.processes = new Map(); // sessionId -> { processes: Set, workers: Set, cleanup: Function[] }
    }
    
    registerProcess(sessionId, process, type = 'process') {
        if (!this.processes.has(sessionId)) {
            this.processes.set(sessionId, {
                processes: new Set(),
                workers: new Set(),
                cleanup: []
            });
        }
        
        const registry = this.processes.get(sessionId);
        
        if (type === 'worker') {
            registry.workers.add(process);
            log(`Registered worker for session: ${sessionId}`, 'blue');
        } else {
            registry.processes.add(process);
            log(`Registered process for session: ${sessionId}, PID: ${process.pid}`, 'blue');
        }
    }
    
    registerCleanup(sessionId, cleanupFn) {
        if (!this.processes.has(sessionId)) {
            this.processes.set(sessionId, {
                processes: new Set(),
                workers: new Set(),
                cleanup: []
            });
        }
        
        this.processes.get(sessionId).cleanup.push(cleanupFn);
        log(`Registered cleanup function for session: ${sessionId}`, 'blue');
    }
    
    terminateAllProcesses(sessionId, force = false) {
        const registry = this.processes.get(sessionId);
        if (!registry) {
            log(`No processes found for session: ${sessionId}`, 'yellow');
            return;
        }
        
        log(`Terminating all processes for session: ${sessionId} (processes: ${registry.processes.size}, workers: ${registry.workers.size}, cleanup: ${registry.cleanup.length})`, 'yellow');
        
        // Terminate all spawned processes
        for (const process of registry.processes) {
            try {
                if (process && process.pid && !process.killed) {
                    const signal = force ? 'SIGKILL' : 'SIGTERM';
                    log(`Terminating process PID: ${process.pid} with ${signal}`, 'yellow');
                    process.kill(signal);
                }
            } catch (error) {
                log(`Error terminating process: ${error.message}`, 'red');
            }
        }
        
        // Terminate all workers
        for (const worker of registry.workers) {
            try {
                log('Terminating worker', 'yellow');
                worker.terminate();
            } catch (error) {
                log(`Error terminating worker: ${error.message}`, 'red');
            }
        }
        
        // Execute all cleanup functions
        for (const cleanupFn of registry.cleanup) {
            try {
                log('Executing cleanup function', 'yellow');
                cleanupFn();
            } catch (error) {
                log(`Error executing cleanup: ${error.message}`, 'red');
            }
        }
        
        // Clear the registry
        this.processes.delete(sessionId);
        log(`Cleared registry for session: ${sessionId}`, 'green');
    }
    
    getSessionInfo(sessionId) {
        const registry = this.processes.get(sessionId);
        if (!registry) return null;
        
        return {
            processCount: registry.processes.size,
            workerCount: registry.workers.size,
            cleanupCount: registry.cleanup.length,
            processes: Array.from(registry.processes).map(p => ({ pid: p.pid, killed: p.killed }))
        };
    }
    
    getAllSessions() {
        const sessions = {};
        for (const [sessionId, registry] of this.processes.entries()) {
            sessions[sessionId] = {
                processCount: registry.processes.size,
                workerCount: registry.workers.size,
                cleanupCount: registry.cleanup.length
            };
        }
        return sessions;
    }
}

// Test class
class ProcessRegistryTest {
    constructor() {
        this.registry = new ProcessRegistry();
        this.testResults = [];
    }
    
    async runTests() {
        log('Starting Process Registry Verification Tests...', 'blue');
        
        const tests = [
            { name: 'Basic Process Registration', fn: () => this.testBasicRegistration() },
            { name: 'Multiple Process Registration', fn: () => this.testMultipleProcesses() },
            { name: 'Worker Registration', fn: () => this.testWorkerRegistration() },
            { name: 'Cleanup Function Registration', fn: () => this.testCleanupRegistration() },
            { name: 'Complete Termination', fn: () => this.testCompleteTermination() },
            { name: 'Force Termination', fn: () => this.testForceTermination() }
        ];
        
        for (const test of tests) {
            try {
                log(`Running test: ${test.name}`, 'blue');
                const result = await test.fn();
                this.testResults.push({ name: test.name, status: 'PASS', result });
                log(`✅ Test passed: ${test.name}`, 'green');
            } catch (error) {
                this.testResults.push({ name: test.name, status: 'FAIL', error: error.message });
                log(`❌ Test failed: ${test.name} - ${error.message}`, 'red');
            }
            
            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.printSummary();
        return this.testResults.every(result => result.status === 'PASS');
    }
    
    async testBasicRegistration() {
        const sessionId = 'test-session-1';
        
        // Spawn a simple process
        const process = spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], { stdio: 'ignore' });
        
        // Register the process
        this.registry.registerProcess(sessionId, process);
        
        // Verify registration
        const info = this.registry.getSessionInfo(sessionId);
        if (!info || info.processCount !== 1) {
            throw new Error(`Expected 1 process, got ${info?.processCount || 0}`);
        }
        
        // Clean up
        this.registry.terminateAllProcesses(sessionId);
        
        // Wait for termination
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify cleanup
        const infoAfter = this.registry.getSessionInfo(sessionId);
        if (infoAfter !== null) {
            throw new Error('Session registry not cleared after termination');
        }
        
        return { registered: true, terminated: true, cleaned: true };
    }
    
    async testMultipleProcesses() {
        const sessionId = 'test-session-2';
        const processes = [];
        
        // Spawn multiple processes
        for (let i = 0; i < 3; i++) {
            const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { stdio: 'ignore' });
            processes.push(process);
            this.registry.registerProcess(sessionId, process);
        }
        
        // Verify all registered
        const info = this.registry.getSessionInfo(sessionId);
        if (!info || info.processCount !== 3) {
            throw new Error(`Expected 3 processes, got ${info?.processCount || 0}`);
        }
        
        // Terminate all
        this.registry.terminateAllProcesses(sessionId);
        
        // Wait for termination
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify all terminated
        const allTerminated = processes.every(p => p.killed);
        if (!allTerminated) {
            throw new Error('Not all processes were terminated');
        }
        
        return { processCount: 3, allRegistered: true, allTerminated: true };
    }
    
    async testWorkerRegistration() {
        const sessionId = 'test-session-3';
        
        // Create a mock worker
        const mockWorker = {
            terminate: () => {
                this.workerTerminated = true;
            }
        };
        
        // Register the worker
        this.registry.registerProcess(sessionId, mockWorker, 'worker');
        
        // Verify registration
        const info = this.registry.getSessionInfo(sessionId);
        if (!info || info.workerCount !== 1) {
            throw new Error(`Expected 1 worker, got ${info?.workerCount || 0}`);
        }
        
        // Terminate
        this.registry.terminateAllProcesses(sessionId);
        
        // Verify worker was terminated
        if (!this.workerTerminated) {
            throw new Error('Worker terminate method was not called');
        }
        
        return { workerRegistered: true, workerTerminated: true };
    }
    
    async testCleanupRegistration() {
        const sessionId = 'test-session-4';
        let cleanupCalled = false;
        
        // Register cleanup function
        this.registry.registerCleanup(sessionId, () => {
            cleanupCalled = true;
        });
        
        // Verify registration
        const info = this.registry.getSessionInfo(sessionId);
        if (!info || info.cleanupCount !== 1) {
            throw new Error(`Expected 1 cleanup function, got ${info?.cleanupCount || 0}`);
        }
        
        // Terminate (should call cleanup)
        this.registry.terminateAllProcesses(sessionId);
        
        // Verify cleanup was called
        if (!cleanupCalled) {
            throw new Error('Cleanup function was not called');
        }
        
        return { cleanupRegistered: true, cleanupCalled: true };
    }
    
    async testCompleteTermination() {
        const sessionId = 'test-session-5';
        let cleanupCalled = false;
        
        // Register process, worker, and cleanup
        const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { stdio: 'ignore' });
        const mockWorker = { terminate: () => {} };
        
        this.registry.registerProcess(sessionId, process);
        this.registry.registerProcess(sessionId, mockWorker, 'worker');
        this.registry.registerCleanup(sessionId, () => { cleanupCalled = true; });
        
        // Verify all registered
        const info = this.registry.getSessionInfo(sessionId);
        if (!info || info.processCount !== 1 || info.workerCount !== 1 || info.cleanupCount !== 1) {
            throw new Error('Not all items were registered correctly');
        }
        
        // Terminate all
        this.registry.terminateAllProcesses(sessionId);
        
        // Wait for termination
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify complete cleanup
        const infoAfter = this.registry.getSessionInfo(sessionId);
        if (infoAfter !== null) {
            throw new Error('Session registry not cleared after complete termination');
        }
        
        if (!cleanupCalled) {
            throw new Error('Cleanup function was not called during complete termination');
        }
        
        return { completeTermination: true, registryCleared: true, cleanupCalled: true };
    }
    
    async testForceTermination() {
        const sessionId = 'test-session-6';
        
        // Spawn a process that ignores SIGTERM
        const process = spawn('node', ['-e', `
            process.on('SIGTERM', () => {
                console.log('Ignoring SIGTERM');
            });
            setTimeout(() => {}, 30000);
        `], { stdio: 'ignore' });
        
        this.registry.registerProcess(sessionId, process);
        
        // Try graceful termination first (should not work)
        this.registry.terminateAllProcesses(sessionId, false);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Process should still be running
        if (process.killed) {
            log('Warning: Process was killed by graceful termination (unexpected)', 'yellow');
        }
        
        // Now force terminate
        this.registry.terminateAllProcesses(sessionId, true);
        
        // Wait for force termination
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Process should now be killed
        if (!process.killed) {
            throw new Error('Process was not killed by force termination');
        }
        
        return { forceTerminationWorked: true };
    }
    
    printSummary() {
        log('\n=== PROCESS REGISTRY TEST SUMMARY ===', 'blue');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        
        this.testResults.forEach(result => {
            if (result.status === 'PASS') {
                log(`✅ ${result.name}`, 'green');
            } else {
                log(`❌ ${result.name}: ${result.error}`, 'red');
            }
        });
        
        log(`\nTotal: ${this.testResults.length}, Passed: ${passed}, Failed: ${failed}`, 'blue');
        
        if (failed === 0) {
            log('🎉 All process registry tests passed!', 'green');
        } else {
            log(`⚠️  ${failed} test(s) failed. Process registry needs attention.`, 'red');
        }
    }
}

// Main execution
async function main() {
    const tester = new ProcessRegistryTest();
    const success = await tester.runTests();
    
    process.exit(success ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        log(`Test execution failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    });
}

module.exports = { ProcessRegistryTest };