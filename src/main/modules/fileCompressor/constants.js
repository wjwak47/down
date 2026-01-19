/**
 * Password Cracker Constants
 * 
 * Centralized configuration for password cracking phases and patterns.
 * Used by index.js and other cracking modules.
 */

// ============ GPU Attack Phases Definition ============
export const GPU_ATTACK_PHASES = {
    0: { name: 'Top10K', method: 'Hashcat GPU Top 10K', description: 'Top 10K Common Passwords' },
    0.5: { name: 'Context', method: 'Context Attack (Smart)', description: 'Social Engineering + Date + Keyboard Walk' },
    1: { name: 'Keyboard', method: 'Hashcat GPU Keyboard', description: 'Keyboard Patterns' },
    2: { name: 'ShortBrute', method: 'Hashcat GPU Short Bruteforce', description: 'Short Bruteforce (1-6 chars)' },
    2.5: { name: 'ExtendedBrute', method: 'Hashcat GPU Extended Bruteforce', description: 'Extended Bruteforce (7-8 chars)' },
    3: { name: 'AI', method: 'PassGPT AI Generator', description: 'AI Password Generation (PassGPT)' },
    4: { name: 'Dictionary', method: 'Hashcat GPU Dictionary', description: 'Full Dictionary (14M)' },
    5: { name: 'Rule', method: 'Hashcat GPU Rule Attack', description: 'Rule Transform' },
    6: { name: 'Mask', method: 'Hashcat GPU Smart Mask', description: 'Smart Mask' },
    7: { name: 'Hybrid', method: 'Hashcat GPU Hybrid', description: 'Hybrid Attack' },
    8: { name: 'CPU', method: 'CPU Smart Dictionary', description: 'CPU Fallback' }
};

// ============ Smart Masks ============
export const SMART_MASKS = [
    // 6字符模式
    { mask: '?d?d?d?d?d?d', desc: '6-digit PIN' },
    { mask: '?l?l?l?l?l?l', desc: '6 lowercase' },

    // 7字符模式
    { mask: '?l?l?l?l?d?d?d', desc: '4lower+3digit' },
    { mask: '?l?l?l?l?l?d?d', desc: '5lower+2digit' },
    { mask: '?l?l?l?d?d?d?d', desc: '3lower+4digit' },
    { mask: '?d?d?d?d?d?d?d', desc: '7-digit' },
    { mask: '?l?l?l?l?l?l?l', desc: '7 lowercase' },

    // 8字符模式
    { mask: '?l?l?l?l?l?l?d?d', desc: '6lower+2digit' },
    { mask: '?u?l?l?l?l?l?d?d', desc: 'Cap+5lower+2digit' },
    { mask: '?l?l?l?l?d?d?d?d', desc: '4lower+4digit' },
    { mask: '?d?d?d?d?d?d?d?d', desc: '8-digit' },
    { mask: '?l?l?l?l?l?l?l?l', desc: '8 lowercase' },

    // 9-10字符复杂模式
    { mask: '?u?l?l?l?l?l?l?l?d', desc: 'Cap+7lower+1digit' },        // Password1
    { mask: '?u?l?l?l?l?l?l?l?d?d', desc: 'Cap+7lower+2digit' },      // Password12
    { mask: '?u?l?l?l?l?l?d?d?d?s', desc: 'Cap+5lower+3digit+sym' },  // Admin123!
    { mask: '?l?l?l?l?l?l?l?l?l?d', desc: '9lower+1digit' },          // qwertyui1
    { mask: '?d?d?d?d?d?d?d?d?d?d', desc: '10-digit' },               // 1234567890
    { mask: '?u?l?l?l?l?l?l?l?l?d', desc: 'Cap+8lower+1digit' },      // Iloveyou1
    { mask: '?u?l?l?l?l?l?l?l?s?d', desc: 'Cap+7lower+sym+digit' },   // Welcome!1

    // 年份后缀模式
    { mask: '?l?l?l?l?l?l?d?d?d?d', desc: '6lower+year' },
    { mask: '?u?l?l?l?l?l?d?d?d?d', desc: 'Cap+5lower+year' },
    { mask: '?u?l?l?l?l?l?l?d?d?d?d', desc: 'Cap+6lower+year' },
    { mask: '?u?l?l?l?l?l?l?l?d?d?d?d', desc: 'Cap+7lower+year' }
];

// ============ Hybrid Suffixes ============
export const HYBRID_SUFFIXES = [
    '?d?d?d?d',      // 4 digits
    '?d?d?d?d?s',    // 4 digits + symbol
    '?d?d?d',        // 3 digits
    '?d?d?d?s',      // 3 digits + symbol
    '?d?d?s',        // 2 digits + symbol
    '?s'             // single symbol
];

// ============ Keyboard Patterns ============
export const KEYBOARD_PATTERNS = [
    // QWERTY rows
    'qwerty', 'qwerty123', 'qwertyuiop', 'qwer1234',
    'asdfgh', 'asdfghjk', 'asdf1234',
    'zxcvbn', 'zxcvbnm',

    // Diagonal patterns
    '1qaz2wsx', 'qazwsx', '1q2w3e4r', 'q1w2e3r4',
    '123qwe', 'qwe123', 'asd123',

    // Numpad patterns
    '147258369', '159357', '741852963',

    // Common passwords
    'password', 'password1', 'password123', 'passw0rd',
    'admin', 'admin123', 'root', 'root123',
    'letmein', 'welcome', 'monkey', 'dragon',
    'master', 'login', 'abc123', 'iloveyou',

    // Number patterns
    '111111', '123123', '666666', '888888',

    // Chinese pinyin
    'woaini', 'woaini520', '5201314', 'aini520'
];

// ============ Hash Mode Mappings ============
export const HASH_MODES = {
    // ZIP formats
    '17200': { name: 'PKZIP (Compressed)', format: 'zip' },
    '17210': { name: 'PKZIP (Uncompressed)', format: 'zip' },
    '17220': { name: 'PKZIP (Compressed Multi)', format: 'zip' },
    '17225': { name: 'PKZIP (Mixed Multi)', format: 'zip' },
    '17230': { name: 'PKZIP (Uncompressed Multi)', format: 'zip' },
    '13600': { name: 'WinZip AES-128', format: 'zip' },
    '13601': { name: 'WinZip AES-192', format: 'zip' },
    '13602': { name: 'WinZip AES-256', format: 'zip' },

    // RAR formats
    '13000': { name: 'RAR5', format: 'rar' },
    '12500': { name: 'RAR3-hp', format: 'rar' },
    '12600': { name: 'RAR3-p-hp', format: 'rar' },
    '23700': { name: 'RAR3-p-compress', format: 'rar' },
    '23800': { name: 'RAR3-p-uncompress', format: 'rar' },

    // 7z formats
    '11600': { name: '7-Zip', format: '7z' }
};

// ============ Rule Files Priority ============
export const RULE_FILES = [
    'dive.rule',
    'best64.rule',
    'rockyou-30000.rule',
    'd3ad0ne.rule',
    'T0XlC.rule',
    'generated.rule'
];

// ============ Dictionary Files Priority ============
export const DICTIONARY_FILES = [
    'chinese_passwords.txt',
    'rockyou.txt',
    'combined_wordlist.txt'
];

// ============ Defaults ============
export const DEFAULTS = {
    maxPasswordLength: 20,
    minPasswordLength: 1,
    batchSize: 100,
    speedHistorySize: 10,
    ewmaAlpha: 0.5,
    numWorkers: 4
};

export default {
    GPU_ATTACK_PHASES,
    SMART_MASKS,
    HYBRID_SUFFIXES,
    KEYBOARD_PATTERNS,
    HASH_MODES,
    RULE_FILES,
    DICTIONARY_FILES,
    DEFAULTS
};
