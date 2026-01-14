import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateSelectionState } from './PlaylistSelector';

describe('PlaylistSelector Selection State', () => {
    /**
     * Property 9: Playlist Selection State Consistency
     * For any playlist with N videos, the "Select All" checkbox state SHALL be true
     * if and only if all N videos are selected, and the selected count display
     * SHALL always equal the actual number of selected items.
     */

    describe('validateSelectionState', () => {
        it('should correctly identify all selected state', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100 }),
                    (totalItems) => {
                        const selectedItems = new Set(
                            Array.from({ length: totalItems }, (_, i) => `item-${i}`)
                        );
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        expect(state.isAllSelected).toBe(true);
                        expect(state.isNoneSelected).toBe(false);
                        expect(state.isPartialSelected).toBe(false);
                        expect(state.selectedCount).toBe(totalItems);
                    }
                )
            );
        });

        it('should correctly identify none selected state', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100 }),
                    (totalItems) => {
                        const selectedItems = new Set();
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        expect(state.isAllSelected).toBe(false);
                        expect(state.isNoneSelected).toBe(true);
                        expect(state.isPartialSelected).toBe(false);
                        expect(state.selectedCount).toBe(0);
                    }
                )
            );
        });

        it('should correctly identify partial selected state', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 100 }), // Need at least 2 items for partial
                    fc.integer({ min: 1, max: 99 }),
                    (totalItems, selectedCount) => {
                        // Ensure selectedCount is less than totalItems
                        const actualSelected = Math.min(selectedCount, totalItems - 1);
                        const selectedItems = new Set(
                            Array.from({ length: actualSelected }, (_, i) => `item-${i}`)
                        );
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        expect(state.isAllSelected).toBe(false);
                        expect(state.isNoneSelected).toBe(false);
                        expect(state.isPartialSelected).toBe(true);
                        expect(state.selectedCount).toBe(actualSelected);
                    }
                )
            );
        });

        it('selected count should always equal actual number of selected items', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 1, max: 100 }),
                    (selectedCount, totalItems) => {
                        const actualSelected = Math.min(selectedCount, totalItems);
                        const selectedItems = new Set(
                            Array.from({ length: actualSelected }, (_, i) => `item-${i}`)
                        );
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        expect(state.selectedCount).toBe(selectedItems.size);
                    }
                )
            );
        });

        it('states should be mutually exclusive', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 1, max: 100 }),
                    (selectedCount, totalItems) => {
                        const actualSelected = Math.min(selectedCount, totalItems);
                        const selectedItems = new Set(
                            Array.from({ length: actualSelected }, (_, i) => `item-${i}`)
                        );
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        // Exactly one state should be true
                        const trueStates = [
                            state.isAllSelected,
                            state.isNoneSelected,
                            state.isPartialSelected
                        ].filter(Boolean);
                        
                        expect(trueStates.length).toBe(1);
                    }
                )
            );
        });

        it('isAllSelected should be true iff selectedCount equals totalItems', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 1, max: 100 }),
                    (selectedCount, totalItems) => {
                        const actualSelected = Math.min(selectedCount, totalItems);
                        const selectedItems = new Set(
                            Array.from({ length: actualSelected }, (_, i) => `item-${i}`)
                        );
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        expect(state.isAllSelected).toBe(actualSelected === totalItems);
                    }
                )
            );
        });

        it('isNoneSelected should be true iff selectedCount is 0', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 1, max: 100 }),
                    (selectedCount, totalItems) => {
                        const actualSelected = Math.min(selectedCount, totalItems);
                        const selectedItems = new Set(
                            Array.from({ length: actualSelected }, (_, i) => `item-${i}`)
                        );
                        const state = validateSelectionState(selectedItems, totalItems);
                        
                        expect(state.isNoneSelected).toBe(actualSelected === 0);
                    }
                )
            );
        });

        it('should work with array input as well as Set', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string(), { minLength: 0, maxLength: 50 }),
                    fc.integer({ min: 1, max: 100 }),
                    (selectedArray, totalItems) => {
                        const state = validateSelectionState(selectedArray, totalItems);
                        
                        expect(state.selectedCount).toBe(selectedArray.length);
                        expect(state.totalItems).toBe(totalItems);
                    }
                )
            );
        });
    });

    describe('Selection toggle invariants', () => {
        it('toggling all items should result in all selected', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 50 }),
                    (totalItems) => {
                        const items = Array.from({ length: totalItems }, (_, i) => `item-${i}`);
                        const selectedItems = new Set();
                        
                        // Toggle all items on
                        items.forEach(item => selectedItems.add(item));
                        
                        const state = validateSelectionState(selectedItems, totalItems);
                        expect(state.isAllSelected).toBe(true);
                    }
                )
            );
        });

        it('toggling all items off should result in none selected', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 50 }),
                    (totalItems) => {
                        const items = Array.from({ length: totalItems }, (_, i) => `item-${i}`);
                        const selectedItems = new Set(items);
                        
                        // Toggle all items off
                        items.forEach(item => selectedItems.delete(item));
                        
                        const state = validateSelectionState(selectedItems, totalItems);
                        expect(state.isNoneSelected).toBe(true);
                    }
                )
            );
        });

        it('adding one item to empty selection should result in partial', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 50 }),
                    (totalItems) => {
                        const selectedItems = new Set(['item-0']);
                        
                        const state = validateSelectionState(selectedItems, totalItems);
                        expect(state.isPartialSelected).toBe(true);
                    }
                )
            );
        });

        it('removing one item from full selection should result in partial', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 2, max: 50 }),
                    (totalItems) => {
                        const items = Array.from({ length: totalItems }, (_, i) => `item-${i}`);
                        const selectedItems = new Set(items);
                        
                        // Remove one item
                        selectedItems.delete('item-0');
                        
                        const state = validateSelectionState(selectedItems, totalItems);
                        expect(state.isPartialSelected).toBe(true);
                    }
                )
            );
        });
    });
});
