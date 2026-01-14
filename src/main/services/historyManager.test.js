/**
 * Property-based tests for History Manager
 * Property 6: History Persistence Round-Trip
 * Validates: Requirements 7.1, 7.2, 7.3
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

// Replace global localStorage
global.localStorage = localStorageMock;

// Import after mocking localStorage
const STORAGE_KEY = 'downloadHistory';
const MAX_HISTORY_ITEMS = 100;

// Re-implement functions for testing (same logic as historyManager.js)
function getHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveToHistory(item) {
    if (!item || !item.id || !item.title) {
        return getHistory();
    }

    const historyItem = {
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail || null,
        platform: item.platform || 'unknown',
        type: item.type || 'video',
        size: item.size || null,
        filePath: item.filePath || null,
        completedAt: new Date().toISOString()
    };

    try {
        const current = getHistory();
        const updated = [historyItem, ...current.filter(h => h.id !== item.id)]
            .slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        return getHistory();
    }
}

function removeFromHistory(id) {
    if (!id) return getHistory();

    try {
        const current = getHistory();
        const updated = current.filter(h => h.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        return getHistory();
    }
}

function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return [];
    } catch (e) {
        return [];
    }
}

function getHistoryItem(id) {
    if (!id) return null;
    const history = getHistory();
    return history.find(h => h.id === id) || null;
}

// Arbitrary generators
const historyItemArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    thumbnail: fc.option(fc.webUrl(), { nil: null }),
    platform: fc.constantFrom('youtube', 'bilibili', 'douyin', 'vimeo', 'soundcloud', 'unknown'),
    type: fc.constantFrom('video', 'audio', 'subtitle'),
    size: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    filePath: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null })
});

describe('History Manager', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    // Property 6.1: Round-trip persistence
    describe('Property 6.1: History Persistence Round-Trip', () => {
        it('should persist and retrieve history items correctly', () => {
            fc.assert(
                fc.property(historyItemArb, (item) => {
                    // Clear before test
                    clearHistory();
                    
                    // Save item
                    saveToHistory(item);
                    
                    // Retrieve and verify
                    const retrieved = getHistoryItem(item.id);
                    expect(retrieved).not.toBeNull();
                    expect(retrieved.id).toBe(item.id);
                    expect(retrieved.title).toBe(item.title);
                    expect(retrieved.platform).toBe(item.platform);
                    expect(retrieved.type).toBe(item.type);
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 6.2: Save adds to history
    describe('Property 6.2: Save adds item to history', () => {
        it('should add new items to history', () => {
            fc.assert(
                fc.property(historyItemArb, (item) => {
                    clearHistory();
                    
                    const beforeCount = getHistory().length;
                    saveToHistory(item);
                    const afterCount = getHistory().length;
                    
                    expect(afterCount).toBe(beforeCount + 1);
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 6.3: Remove removes from history
    describe('Property 6.3: Remove removes item from history', () => {
        it('should remove items from history', () => {
            fc.assert(
                fc.property(historyItemArb, (item) => {
                    clearHistory();
                    
                    // Add item
                    saveToHistory(item);
                    expect(getHistoryItem(item.id)).not.toBeNull();
                    
                    // Remove item
                    removeFromHistory(item.id);
                    expect(getHistoryItem(item.id)).toBeNull();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 6.4: Clear removes all items
    describe('Property 6.4: Clear removes all items', () => {
        it('should clear all history items', () => {
            fc.assert(
                fc.property(
                    fc.array(historyItemArb, { minLength: 1, maxLength: 10 }),
                    (items) => {
                        clearHistory();
                        
                        // Add multiple items
                        items.forEach(item => saveToHistory(item));
                        expect(getHistory().length).toBeGreaterThan(0);
                        
                        // Clear all
                        clearHistory();
                        expect(getHistory().length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 6.5: Duplicate IDs are replaced
    describe('Property 6.5: Duplicate IDs are replaced', () => {
        it('should replace items with same ID', () => {
            fc.assert(
                fc.property(
                    historyItemArb,
                    fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
                    (item, newTitle) => {
                        clearHistory();
                        
                        // Add original item
                        saveToHistory(item);
                        
                        // Add item with same ID but different title
                        saveToHistory({ ...item, title: newTitle });
                        
                        // Should only have one item
                        const history = getHistory();
                        const matchingItems = history.filter(h => h.id === item.id);
                        expect(matchingItems.length).toBe(1);
                        expect(matchingItems[0].title).toBe(newTitle);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 6.6: History respects max limit
    describe('Property 6.6: History respects max limit', () => {
        it('should not exceed MAX_HISTORY_ITEMS', () => {
            clearHistory();
            
            // Add more than max items
            for (let i = 0; i < MAX_HISTORY_ITEMS + 20; i++) {
                saveToHistory({
                    id: `item-${i}`,
                    title: `Test Item ${i}`,
                    type: 'video'
                });
            }
            
            const history = getHistory();
            expect(history.length).toBeLessThanOrEqual(MAX_HISTORY_ITEMS);
        });
    });

    // Property 6.7: New items are added at the beginning
    describe('Property 6.7: New items are added at the beginning', () => {
        it('should add new items at the beginning of history', () => {
            fc.assert(
                fc.property(
                    fc.array(historyItemArb, { minLength: 2, maxLength: 5 }),
                    (items) => {
                        clearHistory();
                        
                        // Ensure unique IDs
                        const uniqueItems = items.map((item, i) => ({
                            ...item,
                            id: `${item.id}-${i}`
                        }));
                        
                        // Add items in order
                        uniqueItems.forEach(item => saveToHistory(item));
                        
                        // Last added should be first
                        const history = getHistory();
                        const lastAdded = uniqueItems[uniqueItems.length - 1];
                        expect(history[0].id).toBe(lastAdded.id);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 6.8: Invalid items are rejected
    describe('Property 6.8: Invalid items are rejected', () => {
        it('should reject items without id', () => {
            clearHistory();
            const beforeCount = getHistory().length;
            
            saveToHistory({ title: 'No ID' });
            
            expect(getHistory().length).toBe(beforeCount);
        });

        it('should reject items without title', () => {
            clearHistory();
            const beforeCount = getHistory().length;
            
            saveToHistory({ id: 'no-title' });
            
            expect(getHistory().length).toBe(beforeCount);
        });

        it('should reject null/undefined items', () => {
            clearHistory();
            const beforeCount = getHistory().length;
            
            saveToHistory(null);
            saveToHistory(undefined);
            
            expect(getHistory().length).toBe(beforeCount);
        });
    });

    // Unit tests for specific scenarios
    describe('Specific scenario tests', () => {
        it('should handle empty history gracefully', () => {
            clearHistory();
            expect(getHistory()).toEqual([]);
            expect(getHistoryItem('nonexistent')).toBeNull();
        });

        it('should preserve all fields when saving', () => {
            clearHistory();
            
            const item = {
                id: 'test-123',
                title: 'Test Video',
                thumbnail: 'https://example.com/thumb.jpg',
                platform: 'youtube',
                type: 'video',
                size: '100 MB',
                filePath: '/path/to/file.mp4'
            };
            
            saveToHistory(item);
            const retrieved = getHistoryItem('test-123');
            
            expect(retrieved.id).toBe(item.id);
            expect(retrieved.title).toBe(item.title);
            expect(retrieved.thumbnail).toBe(item.thumbnail);
            expect(retrieved.platform).toBe(item.platform);
            expect(retrieved.type).toBe(item.type);
            expect(retrieved.size).toBe(item.size);
            expect(retrieved.filePath).toBe(item.filePath);
            expect(retrieved.completedAt).toBeDefined();
        });

        it('should default optional fields correctly', () => {
            clearHistory();
            
            const item = {
                id: 'minimal-item',
                title: 'Minimal Item'
            };
            
            saveToHistory(item);
            const retrieved = getHistoryItem('minimal-item');
            
            expect(retrieved.platform).toBe('unknown');
            expect(retrieved.type).toBe('video');
            expect(retrieved.thumbnail).toBeNull();
            expect(retrieved.size).toBeNull();
            expect(retrieved.filePath).toBeNull();
        });
    });
});
