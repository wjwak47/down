/**
 * Property-Based Tests for Progress Parser
 * 
 * **Feature: media-downloader-enhancement, Property 3: Progress Parsing Accuracy**
 * **Validates: Requirements 3.3, 3.4, 3.5**
 * 
 * For any yt-dlp output string containing progress information, the progress parser 
 * SHALL correctly extract the percentage (0-100), and if speed/ETA information is 
 * present, it SHALL be formatted in human-readable units (MB/s, HH:MM:SS).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseProgress, formatSpeed, formatSize } from './progressParser.js';

describe('Progress Parser - Property Tests', () => {
    /**
     * Property 3: Progress Parsing Accuracy
     * For any yt-dlp output string containing progress information, the progress parser 
     * SHALL correctly extract the percentage (0-100), and if speed/ETA information is 
     * present, it SHALL be formatted in human-readable units (MB/s, HH:MM:SS).
     */
    describe('Property 3: Progress Parsing Accuracy', () => {
        
        // Generator for valid percentage values (0-100)
        const percentageArb = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true });
        
        // Generator for valid speed values
        const speedValueArb = fc.float({ min: Math.fround(0.01), max: Math.fround(9999), noNaN: true });
        const speedUnitArb = fc.constantFrom('KiB', 'MiB', 'GiB');
        
        // Generator for valid ETA formats
        const etaArb = fc.tuple(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
        ).map(([h, m, s]) => {
            if (h > 0) {
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        });

        // Generator for yt-dlp progress output strings
        const ytDlpProgressOutputArb = fc.record({
            percent: percentageArb,
            speedValue: speedValueArb,
            speedUnit: speedUnitArb,
            eta: etaArb,
            downloadedValue: speedValueArb,
            downloadedUnit: speedUnitArb,
            totalValue: speedValueArb,
            totalUnit: speedUnitArb
        }).map(({ percent, speedValue, speedUnit, eta, downloadedValue, downloadedUnit, totalValue, totalUnit }) => {
            // Generate a realistic yt-dlp output string
            return `[download]  ${percent.toFixed(1)}% of ${totalValue.toFixed(2)}${totalUnit} at ${speedValue.toFixed(2)}${speedUnit}/s ETA ${eta}`;
        });

        it('should correctly extract percentage from any valid yt-dlp output', () => {
            fc.assert(
                fc.property(percentageArb, (percent) => {
                    const output = `[download]  ${percent.toFixed(1)}% of 100MiB`;
                    const result = parseProgress(output);
                    
                    // Percentage should be extracted and be within valid range
                    expect(result.percent).not.toBeNull();
                    expect(result.percent).toBeGreaterThanOrEqual(0);
                    expect(result.percent).toBeLessThanOrEqual(100);
                    // Should be close to the input (accounting for floating point)
                    expect(Math.abs(result.percent - percent)).toBeLessThan(0.1);
                }),
                { numRuns: 100 }
            );
        });

        it('should correctly extract and format speed from any valid yt-dlp output', () => {
            fc.assert(
                fc.property(speedValueArb, speedUnitArb, (value, unit) => {
                    const output = `[download]  50.0% at ${value.toFixed(2)}${unit}/s`;
                    const result = parseProgress(output);
                    
                    // Speed should be extracted and formatted in MB/s
                    expect(result.speed).not.toBeNull();
                    expect(result.speed).toMatch(/[\d.]+ MB\/s/);
                }),
                { numRuns: 100 }
            );
        });

        it('should correctly extract ETA from any valid yt-dlp output', () => {
            fc.assert(
                fc.property(etaArb, (eta) => {
                    const output = `[download]  50.0% ETA ${eta}`;
                    const result = parseProgress(output);
                    
                    // ETA should be extracted and match the input format
                    expect(result.eta).not.toBeNull();
                    expect(result.eta).toBe(eta);
                }),
                { numRuns: 100 }
            );
        });

        it('should correctly parse complete yt-dlp progress output', () => {
            fc.assert(
                fc.property(ytDlpProgressOutputArb, (output) => {
                    const result = parseProgress(output);
                    
                    // All fields should be extracted
                    expect(result.percent).not.toBeNull();
                    expect(result.speed).not.toBeNull();
                    expect(result.eta).not.toBeNull();
                    
                    // Percentage should be in valid range
                    expect(result.percent).toBeGreaterThanOrEqual(0);
                    expect(result.percent).toBeLessThanOrEqual(100);
                    
                    // Speed should be formatted in MB/s
                    expect(result.speed).toMatch(/[\d.]+ MB\/s/);
                    
                    // ETA should be in time format
                    expect(result.eta).toMatch(/\d+:\d+/);
                }),
                { numRuns: 100 }
            );
        });

        it('should handle empty or invalid input gracefully', () => {
            fc.assert(
                fc.property(fc.oneof(
                    fc.constant(''),
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.string().filter(s => !s.includes('%'))
                ), (input) => {
                    const result = parseProgress(input);
                    
                    // Should return null for all fields when no valid data
                    expect(result.percent).toBeNull();
                    expect(result.speed).toBeNull();
                    expect(result.eta).toBeNull();
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('formatSpeed - Unit Tests', () => {
        it('should convert KiB/s to MB/s correctly', () => {
            expect(formatSpeed(1024, 'kib')).toBe('1.00 MB/s');
            expect(formatSpeed(512, 'kib')).toBe('0.50 MB/s');
        });

        it('should keep MiB/s as MB/s', () => {
            expect(formatSpeed(1.5, 'mib')).toBe('1.50 MB/s');
            expect(formatSpeed(10, 'mib')).toBe('10.00 MB/s');
        });

        it('should convert GiB/s to MB/s correctly', () => {
            expect(formatSpeed(1, 'gib')).toBe('1024.00 MB/s');
            expect(formatSpeed(0.5, 'gib')).toBe('512.00 MB/s');
        });
    });

    describe('formatSize - Unit Tests', () => {
        it('should format KiB values correctly', () => {
            expect(formatSize(512, 'kib')).toBe('512.0 KB');
            expect(formatSize(2048, 'kib')).toBe('2.0 MB');
        });

        it('should format MiB values correctly', () => {
            expect(formatSize(0.5, 'mib')).toBe('512.0 KB');
            expect(formatSize(100, 'mib')).toBe('100.0 MB');
            expect(formatSize(2048, 'mib')).toBe('2.00 GB');
        });

        it('should format GiB values correctly', () => {
            expect(formatSize(1, 'gib')).toBe('1.00 GB');
            expect(formatSize(0.001, 'gib')).toBe('1.0 MB');
        });
    });

    describe('parseProgress - Real yt-dlp Output Examples', () => {
        it('should parse typical YouTube download progress', () => {
            const output = '[download]  45.3% of 100.50MiB at 2.34MiB/s ETA 00:23';
            const result = parseProgress(output);
            
            expect(result.percent).toBeCloseTo(45.3, 1);
            expect(result.speed).toBe('2.34 MB/s');
            expect(result.eta).toBe('00:23');
        });

        it('should parse progress with approximate size', () => {
            const output = '[download]  12.5% of ~500.00MiB at 5.00MiB/s ETA 01:30';
            const result = parseProgress(output);
            
            expect(result.percent).toBeCloseTo(12.5, 1);
            expect(result.speed).toBe('5.00 MB/s');
            expect(result.eta).toBe('01:30');
        });

        it('should parse progress with KiB speed', () => {
            const output = '[download]  99.9% of 10.00MiB at 512.00KiB/s ETA 00:01';
            const result = parseProgress(output);
            
            expect(result.percent).toBeCloseTo(99.9, 1);
            expect(result.speed).toBe('0.50 MB/s');
            expect(result.eta).toBe('00:01');
        });

        it('should parse 100% completion', () => {
            const output = '[download] 100% of 250.00MiB in 00:45';
            const result = parseProgress(output);
            
            expect(result.percent).toBe(100);
        });
    });
});
