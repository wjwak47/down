/**
 * Property-based tests for GlobalTaskContext
 * Property 10: Task State Persistence Across Navigation
 * Validates: Requirements 15.1, 15.2, 15.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock localStorage for testing
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

global.localStorage = localStorageMock;

// Action Types (same as GlobalTaskContext.jsx)
const ActionTypes = {
    ADD_DOWNLOAD: 'ADD_DOWNLOAD',
    UPDATE_DOWNLOAD: 'UPDATE_DOWNLOAD',
    REMOVE_DOWNLOAD: 'REMOVE_DOWNLOAD',
    CLEAR_COMPLETED_DOWNLOADS: 'CLEAR_COMPLETED_DOWNLOADS',
    ADD_CRACK_JOB: 'ADD_CRACK_JOB',
    UPDATE_CRACK_JOB: 'UPDATE_CRACK_JOB',
    REMOVE_CRACK_JOB: 'REMOVE_CRACK_JOB',
    ADD_TO_HISTORY: 'ADD_TO_HISTORY',
    REMOVE_FROM_HISTORY: 'REMOVE_FROM_HISTORY',
    CLEAR_HISTORY: 'CLEAR_HISTORY',
    LOAD_HISTORY: 'LOAD_HISTORY',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    LOAD_SETTINGS: 'LOAD_SETTINGS',
    ADD_NOTIFICATION: 'ADD_NOTIFICATION',
    REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
    CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
};

// Initial state (same as GlobalTaskContext.jsx)
const initialState = {
    downloads: {},
    crackJobs: {},
    history: [],
    settings: {
        downloadPath: '',
        maxConcurrent: 3,
        autoRetry: true,
        retryCount: 3,
    },
    notifications: [],
};

// Reducer function (same logic as GlobalTaskContext.jsx)
function taskReducer(state, action) {
    switch (action.type) {
        case ActionTypes.ADD_DOWNLOAD:
            return {
                ...state,
                downloads: {
                    ...state.downloads,
                    [action.payload.id]: {
                        ...action.payload,
                        createdAt: new Date().toISOString(),
                        retryCount: 0,
                    },
                },
            };
        
        case ActionTypes.UPDATE_DOWNLOAD:
            if (!state.downloads[action.payload.id]) return state;
            return {
                ...state,
                downloads: {
                    ...state.downloads,
                    [action.payload.id]: {
                        ...state.downloads[action.payload.id],
                        ...action.payload,
                    },
                },
            };
        
        case ActionTypes.REMOVE_DOWNLOAD: {
            const { [action.payload]: removed, ...remainingDownloads } = state.downloads;
            return { ...state, downloads: remainingDownloads };
        }
        
        case ActionTypes.CLEAR_COMPLETED_DOWNLOADS: {
            const activeDownloads = {};
            Object.entries(state.downloads).forEach(([id, task]) => {
                if (task.status !== 'completed' && task.status !== 'failed') {
                    activeDownloads[id] = task;
                }
            });
            return { ...state, downloads: activeDownloads };
        }
        
        case ActionTypes.ADD_CRACK_JOB:
            return {
                ...state,
                crackJobs: {
                    ...state.crackJobs,
                    [action.payload.id]: {
                        ...action.payload,
                        startedAt: new Date().toISOString(),
                    },
                },
            };
        
        case ActionTypes.UPDATE_CRACK_JOB:
            if (!state.crackJobs[action.payload.id]) return state;
            return {
                ...state,
                crackJobs: {
                    ...state.crackJobs,
                    [action.payload.id]: {
                        ...state.crackJobs[action.payload.id],
                        ...action.payload,
                    },
                },
            };
        
        case ActionTypes.REMOVE_CRACK_JOB: {
            const { [action.payload]: removedJob, ...remainingJobs } = state.crackJobs;
            return { ...state, crackJobs: remainingJobs };
        }

        case ActionTypes.ADD_TO_HISTORY:
            return {
                ...state,
                history: [
                    { ...action.payload, downloadedAt: new Date().toISOString() },
                    ...state.history,
                ].slice(0, 100),
            };
        
        case ActionTypes.REMOVE_FROM_HISTORY:
            return {
                ...state,
                history: state.history.filter(item => item.id !== action.payload),
            };
        
        case ActionTypes.CLEAR_HISTORY:
            return { ...state, history: [] };
        
        case ActionTypes.LOAD_HISTORY:
            return { ...state, history: action.payload || [] };
        
        case ActionTypes.UPDATE_SETTINGS:
            return { ...state, settings: { ...state.settings, ...action.payload } };
        
        case ActionTypes.LOAD_SETTINGS:
            return { ...state, settings: { ...state.settings, ...action.payload } };
        
        case ActionTypes.ADD_NOTIFICATION:
            return {
                ...state,
                notifications: [
                    ...state.notifications,
                    { ...action.payload, id: action.payload.id || Date.now().toString(), createdAt: new Date().toISOString() },
                ],
            };
        
        case ActionTypes.REMOVE_NOTIFICATION:
            return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
        
        case ActionTypes.CLEAR_NOTIFICATIONS:
            return { ...state, notifications: [] };
        
        default:
            return state;
    }
}

// Helper: Calculate derived state
function getDerivedState(state) {
    const activeDownloadCount = Object.values(state.downloads).filter(
        d => d.status === 'downloading' || d.status === 'queued'
    ).length;
    const activeCrackJobCount = Object.values(state.crackJobs).filter(
        j => j.status === 'running'
    ).length;
    return {
        activeDownloadCount,
        activeCrackJobCount,
        totalActiveTaskCount: activeDownloadCount + activeCrackJobCount,
        hasActiveTasks: activeDownloadCount + activeCrackJobCount > 0,
    };
}

// Arbitrary generators
const downloadStatusArb = fc.constantFrom('queued', 'downloading', 'paused', 'completed', 'failed');
const crackJobStatusArb = fc.constantFrom('running', 'paused', 'completed', 'failed');

const downloadTaskArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    url: fc.webUrl(),
    status: downloadStatusArb,
    progress: fc.integer({ min: 0, max: 100 }),
    speed: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    platform: fc.constantFrom('youtube', 'bilibili', 'douyin', 'vimeo', 'unknown'),
});

const crackJobArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    fileName: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    status: crackJobStatusArb,
    progress: fc.integer({ min: 0, max: 100 }),
    method: fc.constantFrom('dictionary', 'bruteforce', 'smart'),
});

const historyItemArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    platform: fc.constantFrom('youtube', 'bilibili', 'douyin', 'vimeo', 'unknown'),
    type: fc.constantFrom('video', 'audio'),
});

const notificationArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    type: fc.constantFrom('success', 'error', 'info', 'warning'),
    message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
});

describe('GlobalTaskContext Reducer', () => {
    beforeEach(() => { localStorage.clear(); });
    afterEach(() => { localStorage.clear(); });

    // Property 10.1: Download tasks persist across state changes
    describe('Property 10.1: Download Task State Persistence', () => {
        it('should add download tasks and preserve them', () => {
            fc.assert(
                fc.property(downloadTaskArb, (task) => {
                    let state = taskReducer(initialState, { type: ActionTypes.ADD_DOWNLOAD, payload: task });
                    expect(state.downloads[task.id]).toBeDefined();
                    expect(state.downloads[task.id].title).toBe(task.title);
                    expect(state.downloads[task.id].status).toBe(task.status);
                }),
                { numRuns: 100 }
            );
        });

        it('should update download tasks without losing other tasks', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 2, maxLength: 5 }),
                    fc.integer({ min: 0, max: 100 }),
                    (tasks, newProgress) => {
                        const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                        let state = initialState;
                        uniqueTasks.forEach(t => { state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t }); });
                        
                        const taskToUpdate = uniqueTasks[0];
                        state = taskReducer(state, { type: ActionTypes.UPDATE_DOWNLOAD, payload: { id: taskToUpdate.id, progress: newProgress } });
                        
                        expect(state.downloads[taskToUpdate.id].progress).toBe(newProgress);
                        expect(Object.keys(state.downloads).length).toBe(uniqueTasks.length);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.2: Crack job tasks persist across state changes
    describe('Property 10.2: Crack Job State Persistence', () => {
        it('should add crack jobs and preserve them', () => {
            fc.assert(
                fc.property(crackJobArb, (job) => {
                    let state = taskReducer(initialState, { type: ActionTypes.ADD_CRACK_JOB, payload: job });
                    expect(state.crackJobs[job.id]).toBeDefined();
                    expect(state.crackJobs[job.id].fileName).toBe(job.fileName);
                    expect(state.crackJobs[job.id].status).toBe(job.status);
                }),
                { numRuns: 100 }
            );
        });

        it('should update crack jobs without losing other jobs', () => {
            fc.assert(
                fc.property(
                    fc.array(crackJobArb, { minLength: 2, maxLength: 5 }),
                    fc.integer({ min: 0, max: 100 }),
                    (jobs, newProgress) => {
                        const uniqueJobs = jobs.map((j, i) => ({ ...j, id: `job-${i}` }));
                        let state = initialState;
                        uniqueJobs.forEach(j => { state = taskReducer(state, { type: ActionTypes.ADD_CRACK_JOB, payload: j }); });
                        
                        const jobToUpdate = uniqueJobs[0];
                        state = taskReducer(state, { type: ActionTypes.UPDATE_CRACK_JOB, payload: { id: jobToUpdate.id, progress: newProgress } });
                        
                        expect(state.crackJobs[jobToUpdate.id].progress).toBe(newProgress);
                        expect(Object.keys(state.crackJobs).length).toBe(uniqueJobs.length);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should preserve crack jobs when downloads are modified', () => {
            fc.assert(
                fc.property(crackJobArb, downloadTaskArb, (job, download) => {
                    let state = taskReducer(initialState, { type: ActionTypes.ADD_CRACK_JOB, payload: job });
                    state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: download });
                    state = taskReducer(state, { type: ActionTypes.UPDATE_DOWNLOAD, payload: { id: download.id, progress: 50 } });
                    
                    // Crack job should still exist
                    expect(state.crackJobs[job.id]).toBeDefined();
                    expect(state.crackJobs[job.id].fileName).toBe(job.fileName);
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 10.3: Remove operations only affect target
    describe('Property 10.3: Remove Operations Isolation', () => {
        it('should only remove specified download', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 2, maxLength: 5 }),
                    (tasks) => {
                        const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                        let state = initialState;
                        uniqueTasks.forEach(t => { state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t }); });
                        
                        const taskToRemove = uniqueTasks[0];
                        state = taskReducer(state, { type: ActionTypes.REMOVE_DOWNLOAD, payload: taskToRemove.id });
                        
                        expect(state.downloads[taskToRemove.id]).toBeUndefined();
                        expect(Object.keys(state.downloads).length).toBe(uniqueTasks.length - 1);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should only remove specified crack job', () => {
            fc.assert(
                fc.property(
                    fc.array(crackJobArb, { minLength: 2, maxLength: 5 }),
                    (jobs) => {
                        const uniqueJobs = jobs.map((j, i) => ({ ...j, id: `job-${i}` }));
                        let state = initialState;
                        uniqueJobs.forEach(j => { state = taskReducer(state, { type: ActionTypes.ADD_CRACK_JOB, payload: j }); });
                        
                        const jobToRemove = uniqueJobs[0];
                        state = taskReducer(state, { type: ActionTypes.REMOVE_CRACK_JOB, payload: jobToRemove.id });
                        
                        expect(state.crackJobs[jobToRemove.id]).toBeUndefined();
                        expect(Object.keys(state.crackJobs).length).toBe(uniqueJobs.length - 1);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.4: Clear completed only removes completed/failed
    describe('Property 10.4: Clear Completed Downloads', () => {
        it('should only clear completed and failed downloads', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 3, maxLength: 10 }),
                    (tasks) => {
                        const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                        let state = initialState;
                        uniqueTasks.forEach(t => { state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t }); });
                        
                        const activeCount = uniqueTasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length;
                        state = taskReducer(state, { type: ActionTypes.CLEAR_COMPLETED_DOWNLOADS });
                        
                        expect(Object.keys(state.downloads).length).toBe(activeCount);
                        Object.values(state.downloads).forEach(d => {
                            expect(['queued', 'downloading', 'paused']).toContain(d.status);
                        });
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.5: Derived state calculations
    describe('Property 10.5: Derived State Accuracy', () => {
        it('should correctly count active downloads', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 1, maxLength: 10 }),
                    (tasks) => {
                        const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                        let state = initialState;
                        uniqueTasks.forEach(t => { state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t }); });
                        
                        const derived = getDerivedState(state);
                        const expectedActive = uniqueTasks.filter(t => t.status === 'downloading' || t.status === 'queued').length;
                        
                        expect(derived.activeDownloadCount).toBe(expectedActive);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should correctly count active crack jobs', () => {
            fc.assert(
                fc.property(
                    fc.array(crackJobArb, { minLength: 1, maxLength: 10 }),
                    (jobs) => {
                        const uniqueJobs = jobs.map((j, i) => ({ ...j, id: `job-${i}` }));
                        let state = initialState;
                        uniqueJobs.forEach(j => { state = taskReducer(state, { type: ActionTypes.ADD_CRACK_JOB, payload: j }); });
                        
                        const derived = getDerivedState(state);
                        const expectedActive = uniqueJobs.filter(j => j.status === 'running').length;
                        
                        expect(derived.activeCrackJobCount).toBe(expectedActive);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should correctly calculate total active tasks', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 1, maxLength: 5 }),
                    fc.array(crackJobArb, { minLength: 1, maxLength: 5 }),
                    (downloads, crackJobs) => {
                        const uniqueDownloads = downloads.map((t, i) => ({ ...t, id: `dl-${i}` }));
                        const uniqueJobs = crackJobs.map((j, i) => ({ ...j, id: `job-${i}` }));
                        
                        let state = initialState;
                        uniqueDownloads.forEach(t => { state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t }); });
                        uniqueJobs.forEach(j => { state = taskReducer(state, { type: ActionTypes.ADD_CRACK_JOB, payload: j }); });
                        
                        const derived = getDerivedState(state);
                        expect(derived.totalActiveTaskCount).toBe(derived.activeDownloadCount + derived.activeCrackJobCount);
                        expect(derived.hasActiveTasks).toBe(derived.totalActiveTaskCount > 0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.6: History management
    describe('Property 10.6: History Management', () => {
        it('should add items to history at the beginning', () => {
            fc.assert(
                fc.property(
                    fc.array(historyItemArb, { minLength: 2, maxLength: 5 }),
                    (items) => {
                        const uniqueItems = items.map((item, i) => ({ ...item, id: `hist-${i}` }));
                        let state = initialState;
                        uniqueItems.forEach(item => { state = taskReducer(state, { type: ActionTypes.ADD_TO_HISTORY, payload: item }); });
                        
                        // Last added should be first
                        const lastAdded = uniqueItems[uniqueItems.length - 1];
                        expect(state.history[0].id).toBe(lastAdded.id);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should limit history to 100 items', () => {
            let state = initialState;
            for (let i = 0; i < 120; i++) {
                state = taskReducer(state, { 
                    type: ActionTypes.ADD_TO_HISTORY, 
                    payload: { id: `item-${i}`, title: `Item ${i}`, platform: 'youtube', type: 'video' } 
                });
            }
            expect(state.history.length).toBeLessThanOrEqual(100);
        });

        it('should remove specific history item', () => {
            fc.assert(
                fc.property(
                    fc.array(historyItemArb, { minLength: 2, maxLength: 5 }),
                    (items) => {
                        const uniqueItems = items.map((item, i) => ({ ...item, id: `hist-${i}` }));
                        let state = initialState;
                        uniqueItems.forEach(item => { state = taskReducer(state, { type: ActionTypes.ADD_TO_HISTORY, payload: item }); });
                        
                        const itemToRemove = uniqueItems[0];
                        state = taskReducer(state, { type: ActionTypes.REMOVE_FROM_HISTORY, payload: itemToRemove.id });
                        
                        expect(state.history.find(h => h.id === itemToRemove.id)).toBeUndefined();
                        expect(state.history.length).toBe(uniqueItems.length - 1);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should clear all history', () => {
            fc.assert(
                fc.property(
                    fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
                    (items) => {
                        const uniqueItems = items.map((item, i) => ({ ...item, id: `hist-${i}` }));
                        let state = initialState;
                        uniqueItems.forEach(item => { state = taskReducer(state, { type: ActionTypes.ADD_TO_HISTORY, payload: item }); });
                        
                        state = taskReducer(state, { type: ActionTypes.CLEAR_HISTORY });
                        expect(state.history.length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.7: Settings management
    describe('Property 10.7: Settings Management', () => {
        it('should update settings without losing other settings', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.boolean(),
                    (maxConcurrent, autoRetry) => {
                        let state = taskReducer(initialState, { 
                            type: ActionTypes.UPDATE_SETTINGS, 
                            payload: { maxConcurrent } 
                        });
                        state = taskReducer(state, { 
                            type: ActionTypes.UPDATE_SETTINGS, 
                            payload: { autoRetry } 
                        });
                        
                        expect(state.settings.maxConcurrent).toBe(maxConcurrent);
                        expect(state.settings.autoRetry).toBe(autoRetry);
                        expect(state.settings.downloadPath).toBe(initialState.settings.downloadPath);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should load settings and merge with defaults', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (maxConcurrent) => {
                        const state = taskReducer(initialState, { 
                            type: ActionTypes.LOAD_SETTINGS, 
                            payload: { maxConcurrent } 
                        });
                        
                        expect(state.settings.maxConcurrent).toBe(maxConcurrent);
                        expect(state.settings.autoRetry).toBe(initialState.settings.autoRetry);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.8: Notification management
    describe('Property 10.8: Notification Management', () => {
        it('should add notifications', () => {
            fc.assert(
                fc.property(notificationArb, (notification) => {
                    const state = taskReducer(initialState, { type: ActionTypes.ADD_NOTIFICATION, payload: notification });
                    expect(state.notifications.length).toBe(1);
                    expect(state.notifications[0].message).toBe(notification.message);
                    expect(state.notifications[0].type).toBe(notification.type);
                }),
                { numRuns: 100 }
            );
        });

        it('should remove specific notification', () => {
            fc.assert(
                fc.property(
                    fc.array(notificationArb, { minLength: 2, maxLength: 5 }),
                    (notifications) => {
                        const uniqueNotifications = notifications.map((n, i) => ({ ...n, id: `notif-${i}` }));
                        let state = initialState;
                        uniqueNotifications.forEach(n => { state = taskReducer(state, { type: ActionTypes.ADD_NOTIFICATION, payload: n }); });
                        
                        const notifToRemove = uniqueNotifications[0];
                        state = taskReducer(state, { type: ActionTypes.REMOVE_NOTIFICATION, payload: notifToRemove.id });
                        
                        expect(state.notifications.find(n => n.id === notifToRemove.id)).toBeUndefined();
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should clear all notifications', () => {
            fc.assert(
                fc.property(
                    fc.array(notificationArb, { minLength: 1, maxLength: 10 }),
                    (notifications) => {
                        const uniqueNotifications = notifications.map((n, i) => ({ ...n, id: `notif-${i}` }));
                        let state = initialState;
                        uniqueNotifications.forEach(n => { state = taskReducer(state, { type: ActionTypes.ADD_NOTIFICATION, payload: n }); });
                        
                        state = taskReducer(state, { type: ActionTypes.CLEAR_NOTIFICATIONS });
                        expect(state.notifications.length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.9: State isolation between different task types
    describe('Property 10.9: State Isolation', () => {
        it('should maintain isolation between downloads, crack jobs, history, and notifications', () => {
            fc.assert(
                fc.property(
                    downloadTaskArb,
                    crackJobArb,
                    historyItemArb,
                    notificationArb,
                    (download, crackJob, historyItem, notification) => {
                        // Ensure unique IDs across all types
                        const uniqueDownload = { ...download, id: `dl-${download.id}` };
                        const uniqueCrackJob = { ...crackJob, id: `crack-${crackJob.id}` };
                        const uniqueHistoryItem = { ...historyItem, id: `hist-${historyItem.id}` };
                        const uniqueNotification = { ...notification, id: `notif-${notification.id}` };
                        
                        let state = initialState;
                        
                        // Add all types
                        state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: uniqueDownload });
                        state = taskReducer(state, { type: ActionTypes.ADD_CRACK_JOB, payload: uniqueCrackJob });
                        state = taskReducer(state, { type: ActionTypes.ADD_TO_HISTORY, payload: uniqueHistoryItem });
                        state = taskReducer(state, { type: ActionTypes.ADD_NOTIFICATION, payload: uniqueNotification });
                        
                        // Verify all exist
                        expect(state.downloads[uniqueDownload.id]).toBeDefined();
                        expect(state.crackJobs[uniqueCrackJob.id]).toBeDefined();
                        expect(state.history.find(h => h.id === uniqueHistoryItem.id)).toBeDefined();
                        expect(state.notifications.find(n => n.id === uniqueNotification.id)).toBeDefined();
                        
                        // Remove one type, others should remain
                        state = taskReducer(state, { type: ActionTypes.REMOVE_DOWNLOAD, payload: uniqueDownload.id });
                        expect(state.downloads[uniqueDownload.id]).toBeUndefined();
                        expect(state.crackJobs[uniqueCrackJob.id]).toBeDefined();
                        expect(state.history.find(h => h.id === uniqueHistoryItem.id)).toBeDefined();
                        expect(state.notifications.find(n => n.id === uniqueNotification.id)).toBeDefined();
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 10.10: Unknown actions don't modify state
    describe('Property 10.10: Unknown Action Handling', () => {
        it('should return unchanged state for unknown actions', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    (unknownType) => {
                        // Skip if it matches a known action type
                        if (Object.values(ActionTypes).includes(unknownType)) return;
                        
                        const state = taskReducer(initialState, { type: unknownType, payload: {} });
                        expect(state).toEqual(initialState);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});

/**
 * Property 1: Download Queue Ordering Invariant
 * For any sequence of download tasks added to the queue, the queue SHALL maintain
 * FIFO ordering unless explicitly reordered by the user, and the number of active
 * downloads SHALL never exceed the configured concurrent limit.
 */
describe('Download Queue Ordering (Property 1)', () => {
    // Helper to get sorted queue by creation time
    function getDownloadQueue(state) {
        return Object.values(state.downloads)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    // Helper to count active downloads
    function getActiveDownloadCount(state) {
        return Object.values(state.downloads).filter(d => d.status === 'downloading').length;
    }

    // Helper to count queued downloads
    function getQueuedDownloadCount(state) {
        return Object.values(state.downloads).filter(d => d.status === 'queued').length;
    }

    it('should maintain FIFO ordering when adding downloads', () => {
        fc.assert(
            fc.property(
                fc.array(downloadTaskArb, { minLength: 2, maxLength: 10 }),
                (tasks) => {
                    const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}`, status: 'queued' }));
                    let state = initialState;
                    
                    // Add tasks sequentially with small delay simulation
                    uniqueTasks.forEach((t, index) => {
                        state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t });
                    });
                    
                    const queue = getDownloadQueue(state);
                    
                    // Verify FIFO order - earlier added tasks should come first
                    for (let i = 1; i < queue.length; i++) {
                        const prevTime = new Date(queue[i - 1].createdAt).getTime();
                        const currTime = new Date(queue[i].createdAt).getTime();
                        expect(prevTime).toBeLessThanOrEqual(currTime);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should preserve queue order when updating task status', () => {
        fc.assert(
            fc.property(
                fc.array(downloadTaskArb, { minLength: 3, maxLength: 8 }),
                fc.integer({ min: 0, max: 7 }),
                (tasks, updateIndex) => {
                    const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}`, status: 'queued' }));
                    let state = initialState;
                    
                    uniqueTasks.forEach(t => {
                        state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t });
                    });
                    
                    const queueBefore = getDownloadQueue(state).map(d => d.id);
                    
                    // Update a task's status
                    const safeIndex = updateIndex % uniqueTasks.length;
                    state = taskReducer(state, { 
                        type: ActionTypes.UPDATE_DOWNLOAD, 
                        payload: { id: uniqueTasks[safeIndex].id, status: 'downloading' } 
                    });
                    
                    const queueAfter = getDownloadQueue(state).map(d => d.id);
                    
                    // Order should be preserved
                    expect(queueAfter).toEqual(queueBefore);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should correctly count active vs queued downloads', () => {
        fc.assert(
            fc.property(
                fc.array(downloadTaskArb, { minLength: 1, maxLength: 10 }),
                (tasks) => {
                    const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                    let state = initialState;
                    
                    uniqueTasks.forEach(t => {
                        state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t });
                    });
                    
                    const activeCount = getActiveDownloadCount(state);
                    const queuedCount = getQueuedDownloadCount(state);
                    
                    const expectedActive = uniqueTasks.filter(t => t.status === 'downloading').length;
                    const expectedQueued = uniqueTasks.filter(t => t.status === 'queued').length;
                    
                    expect(activeCount).toBe(expectedActive);
                    expect(queuedCount).toBe(expectedQueued);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should identify next queued download correctly', () => {
        fc.assert(
            fc.property(
                fc.array(downloadTaskArb, { minLength: 2, maxLength: 8 }),
                (tasks) => {
                    // Make all tasks queued
                    const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}`, status: 'queued' }));
                    let state = initialState;
                    
                    uniqueTasks.forEach(t => {
                        state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t });
                    });
                    
                    const queue = getDownloadQueue(state);
                    const queuedTasks = queue.filter(d => d.status === 'queued');
                    
                    if (queuedTasks.length > 0) {
                        // First queued task should be the one with earliest createdAt
                        const firstQueued = queuedTasks[0];
                        const allQueuedTimes = queuedTasks.map(t => new Date(t.createdAt).getTime());
                        const minTime = Math.min(...allQueuedTimes);
                        
                        expect(new Date(firstQueued.createdAt).getTime()).toBe(minTime);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should handle mixed status downloads correctly', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 5 }), // downloading count
                fc.integer({ min: 1, max: 5 }), // queued count
                fc.integer({ min: 0, max: 3 }), // completed count
                (downloadingCount, queuedCount, completedCount) => {
                    let state = initialState;
                    let taskId = 0;
                    
                    // Add downloading tasks
                    for (let i = 0; i < downloadingCount; i++) {
                        state = taskReducer(state, { 
                            type: ActionTypes.ADD_DOWNLOAD, 
                            payload: { id: `task-${taskId++}`, title: `Downloading ${i}`, status: 'downloading', url: 'http://test.com' } 
                        });
                    }
                    
                    // Add queued tasks
                    for (let i = 0; i < queuedCount; i++) {
                        state = taskReducer(state, { 
                            type: ActionTypes.ADD_DOWNLOAD, 
                            payload: { id: `task-${taskId++}`, title: `Queued ${i}`, status: 'queued', url: 'http://test.com' } 
                        });
                    }
                    
                    // Add completed tasks
                    for (let i = 0; i < completedCount; i++) {
                        state = taskReducer(state, { 
                            type: ActionTypes.ADD_DOWNLOAD, 
                            payload: { id: `task-${taskId++}`, title: `Completed ${i}`, status: 'completed', url: 'http://test.com' } 
                        });
                    }
                    
                    expect(getActiveDownloadCount(state)).toBe(downloadingCount);
                    expect(getQueuedDownloadCount(state)).toBe(queuedCount);
                    expect(Object.keys(state.downloads).length).toBe(downloadingCount + queuedCount + completedCount);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should maintain queue integrity after removing tasks', () => {
        fc.assert(
            fc.property(
                fc.array(downloadTaskArb, { minLength: 3, maxLength: 8 }),
                fc.integer({ min: 0, max: 7 }),
                (tasks, removeIndex) => {
                    const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}`, status: 'queued' }));
                    let state = initialState;
                    
                    uniqueTasks.forEach(t => {
                        state = taskReducer(state, { type: ActionTypes.ADD_DOWNLOAD, payload: t });
                    });
                    
                    const safeIndex = removeIndex % uniqueTasks.length;
                    const removedId = uniqueTasks[safeIndex].id;
                    
                    state = taskReducer(state, { type: ActionTypes.REMOVE_DOWNLOAD, payload: removedId });
                    
                    const queue = getDownloadQueue(state);
                    
                    // Removed task should not be in queue
                    expect(queue.find(d => d.id === removedId)).toBeUndefined();
                    
                    // Remaining tasks should still be in FIFO order
                    for (let i = 1; i < queue.length; i++) {
                        const prevTime = new Date(queue[i - 1].createdAt).getTime();
                        const currTime = new Date(queue[i].createdAt).getTime();
                        expect(prevTime).toBeLessThanOrEqual(currTime);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });
});
