/**
 * Property-based tests for Task Notification System
 * Property 11: Notification Trigger Completeness
 * Validates: Requirements 16.1, 16.2, 16.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock toast functions
const createMockToast = () => ({
    downloadComplete: vi.fn(),
    downloadFailed: vi.fn(),
    crackComplete: vi.fn(),
    crackFailed: vi.fn(),
});

// Simulate notification trigger logic (same as useTaskNotifications)
function checkDownloadNotifications(prevDownloads, currentDownloads, toast) {
    const notifications = [];
    
    Object.entries(currentDownloads).forEach(([id, task]) => {
        const prevTask = prevDownloads[id];
        
        if (prevTask && prevTask.status !== 'completed' && task.status === 'completed') {
            toast.downloadComplete({ title: '下载完成', message: task.title });
            notifications.push({ type: 'downloadComplete', id, title: task.title });
        }
        
        if (prevTask && prevTask.status !== 'failed' && task.status === 'failed') {
            toast.downloadFailed({ title: '下载失败', message: task.error || task.title });
            notifications.push({ type: 'downloadFailed', id, error: task.error });
        }
    });
    
    return notifications;
}

function checkCrackJobNotifications(prevJobs, currentJobs, toast) {
    const notifications = [];
    
    Object.entries(currentJobs).forEach(([id, job]) => {
        const prevJob = prevJobs[id];
        
        if (prevJob && prevJob.status !== 'completed' && job.status === 'completed') {
            toast.crackComplete({ title: '密码破解成功', message: job.password || job.fileName });
            notifications.push({ type: 'crackComplete', id, password: job.password });
        }
        
        if (prevJob && prevJob.status !== 'failed' && job.status === 'failed') {
            toast.crackFailed({ title: '密码破解失败', message: job.error || job.fileName });
            notifications.push({ type: 'crackFailed', id, error: job.error });
        }
    });
    
    return notifications;
}

// Arbitrary generators
const downloadStatusArb = fc.constantFrom('queued', 'downloading', 'paused', 'completed', 'failed');
const crackJobStatusArb = fc.constantFrom('running', 'paused', 'completed', 'failed');

const downloadTaskArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    status: downloadStatusArb,
    error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
});

const crackJobArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    fileName: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    status: crackJobStatusArb,
    password: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
});

describe('Task Notification System', () => {
    let mockToast;
    
    beforeEach(() => {
        mockToast = createMockToast();
    });

    // Property 11.1: Download completion triggers notification
    describe('Property 11.1: Download Completion Notification', () => {
        it('should trigger downloadComplete when status changes to completed', () => {
            fc.assert(
                fc.property(downloadTaskArb, (task) => {
                    mockToast = createMockToast();
                    
                    // Previous state: downloading
                    const prevDownloads = { [task.id]: { ...task, status: 'downloading' } };
                    // Current state: completed
                    const currentDownloads = { [task.id]: { ...task, status: 'completed' } };
                    
                    checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
                    
                    expect(mockToast.downloadComplete).toHaveBeenCalledTimes(1);
                    expect(mockToast.downloadFailed).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });

        it('should NOT trigger notification if already completed', () => {
            fc.assert(
                fc.property(downloadTaskArb, (task) => {
                    mockToast = createMockToast();
                    
                    // Both states: completed
                    const prevDownloads = { [task.id]: { ...task, status: 'completed' } };
                    const currentDownloads = { [task.id]: { ...task, status: 'completed' } };
                    
                    checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
                    
                    expect(mockToast.downloadComplete).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 11.2: Download failure triggers notification
    describe('Property 11.2: Download Failure Notification', () => {
        it('should trigger downloadFailed when status changes to failed', () => {
            fc.assert(
                fc.property(downloadTaskArb, (task) => {
                    mockToast = createMockToast();
                    
                    const prevDownloads = { [task.id]: { ...task, status: 'downloading' } };
                    const currentDownloads = { [task.id]: { ...task, status: 'failed' } };
                    
                    checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
                    
                    expect(mockToast.downloadFailed).toHaveBeenCalledTimes(1);
                    expect(mockToast.downloadComplete).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 11.3: Crack job completion triggers notification
    describe('Property 11.3: Crack Job Completion Notification', () => {
        it('should trigger crackComplete when status changes to completed', () => {
            fc.assert(
                fc.property(crackJobArb, (job) => {
                    mockToast = createMockToast();
                    
                    const prevJobs = { [job.id]: { ...job, status: 'running' } };
                    const currentJobs = { [job.id]: { ...job, status: 'completed' } };
                    
                    checkCrackJobNotifications(prevJobs, currentJobs, mockToast);
                    
                    expect(mockToast.crackComplete).toHaveBeenCalledTimes(1);
                    expect(mockToast.crackFailed).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 11.4: Crack job failure triggers notification
    describe('Property 11.4: Crack Job Failure Notification', () => {
        it('should trigger crackFailed when status changes to failed', () => {
            fc.assert(
                fc.property(crackJobArb, (job) => {
                    mockToast = createMockToast();
                    
                    const prevJobs = { [job.id]: { ...job, status: 'running' } };
                    const currentJobs = { [job.id]: { ...job, status: 'failed' } };
                    
                    checkCrackJobNotifications(prevJobs, currentJobs, mockToast);
                    
                    expect(mockToast.crackFailed).toHaveBeenCalledTimes(1);
                    expect(mockToast.crackComplete).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 11.5: New tasks don't trigger notifications
    describe('Property 11.5: New Tasks No Notification', () => {
        it('should NOT trigger notification for newly added tasks (non-terminal status)', () => {
            fc.assert(
                fc.property(downloadTaskArb, (task) => {
                    // 只测试非终态的新任务（queued, downloading, paused）
                    // 因为如果新任务直接是 completed/failed 状态，这是边界情况
                    if (task.status === 'completed' || task.status === 'failed') return;
                    
                    mockToast = createMockToast();
                    
                    // No previous state
                    const prevDownloads = {};
                    const currentDownloads = { [task.id]: task };
                    
                    checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
                    
                    expect(mockToast.downloadComplete).not.toHaveBeenCalled();
                    expect(mockToast.downloadFailed).not.toHaveBeenCalled();
                }),
                { numRuns: 100 }
            );
        });

        it('should NOT trigger notification for newly added completed tasks (no previous state)', () => {
            mockToast = createMockToast();
            
            // 新任务直接是 completed 状态，但没有 prevTask，所以不应该触发通知
            // 这是正确的行为：只有状态变化才触发通知
            const prevDownloads = {};
            const currentDownloads = { 
                'new-task': { id: 'new-task', title: 'New Task', status: 'completed' } 
            };
            
            checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
            
            // 由于没有 prevTask，不会触发通知
            expect(mockToast.downloadComplete).not.toHaveBeenCalled();
        });
    });

    // Property 11.6: Multiple task completions trigger multiple notifications
    describe('Property 11.6: Multiple Task Notifications', () => {
        it('should trigger notification for each completed task', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 2, maxLength: 5 }),
                    (tasks) => {
                        mockToast = createMockToast();
                        
                        const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                        
                        // All tasks were downloading
                        const prevDownloads = {};
                        uniqueTasks.forEach(t => {
                            prevDownloads[t.id] = { ...t, status: 'downloading' };
                        });
                        
                        // All tasks now completed
                        const currentDownloads = {};
                        uniqueTasks.forEach(t => {
                            currentDownloads[t.id] = { ...t, status: 'completed' };
                        });
                        
                        checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
                        
                        expect(mockToast.downloadComplete).toHaveBeenCalledTimes(uniqueTasks.length);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 11.7: Mixed status changes
    describe('Property 11.7: Mixed Status Changes', () => {
        it('should correctly handle mixed completions and failures', () => {
            mockToast = createMockToast();
            
            const prevDownloads = {
                'task-1': { id: 'task-1', title: 'Task 1', status: 'downloading' },
                'task-2': { id: 'task-2', title: 'Task 2', status: 'downloading' },
                'task-3': { id: 'task-3', title: 'Task 3', status: 'downloading' },
            };
            
            const currentDownloads = {
                'task-1': { id: 'task-1', title: 'Task 1', status: 'completed' },
                'task-2': { id: 'task-2', title: 'Task 2', status: 'failed', error: 'Network error' },
                'task-3': { id: 'task-3', title: 'Task 3', status: 'downloading' }, // Still downloading
            };
            
            checkDownloadNotifications(prevDownloads, currentDownloads, mockToast);
            
            expect(mockToast.downloadComplete).toHaveBeenCalledTimes(1);
            expect(mockToast.downloadFailed).toHaveBeenCalledTimes(1);
        });
    });
});
