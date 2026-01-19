# File Compressor Module

Password cracking and archive compression/decompression module.

## Module Structure

```
fileCompressor/
├── index.js                    # Main entry point, IPC handlers, cracking pipeline
├── constants.js                # Centralized constants (masks, patterns, phases)
├── smartCracker.js             # CPU-based smart password generation
├── statsCollector.js           # Progress statistics and ETA estimation
├── sessionManager.js           # Cracking session state management
├── batchTestManager.js         # Batch password testing
├── crackWorker.js              # Worker thread for CPU cracking
│
├── # GPU Attack Modules
├── OptimizedGPUEngine.js       # GPU-accelerated hashcat wrapper
├── hashExtractor.js            # Hash extraction from archives
│
├── # Advanced Attack Modes
├── AdvancedAttackModeManager.js  # Orchestrates all advanced attacks
├── SocialEngineeringAttackMode.js # Context-based password generation
├── DateRangeAttackMode.js        # Date pattern password generation
├── KeyboardWalkAttackMode.js     # Keyboard layout password generation
│
├── # Strategy & Optimization
├── EnhancedStrategyManager.js  # Dynamic strategy selection
├── DynamicPhaseSkipper.js      # Skip inefficient phases
├── SuccessProbabilityEstimator.js # Bayesian success estimation
├── strategySelector.js         # Initial strategy selection
│
├── # Performance & Resources
├── ResourceManager.js          # System resource management
├── PerformanceMonitor.js       # Performance monitoring
├── CandidatePasswordCache.js   # Password candidate caching
├── WorkStealingQueue.js        # Load balancing for workers
│
├── # AI Integration
├── ai/
│   ├── passgptGeneratorPython.js  # Python-based PassGPT
│   └── ...
│
└── # Tests
    └── *.test.js
```

## Attack Pipeline

```
Phase 0:   Top 10K Common Passwords (30-40% hit rate)
Phase 0.5: Advanced Context Attack (NEW)
           ├── Social Engineering (file path context)
           ├── Date Range (year/date patterns)
           └── Keyboard Walk (keyboard patterns)
Phase 1:   Keyboard Patterns (10-15% hit rate)
Phase 2:   Short Bruteforce 1-6 chars (exhaustive)
Phase 2.5: Extended Bruteforce 7-8 chars (alphanumeric)
Phase 3:   AI Generation (PassGPT)
Phase 4a:  Chinese Dictionary (NEW)
Phase 4b:  Full Dictionary (14M passwords)
Phase 5:   Rule Attack (dive.rule → best64.rule → ...)
Phase 6:   Smart Mask Attack
Phase 7:   Hybrid Attack (word + digits)
Phase 8:   CPU Fallback
```

## Key Features

### 1. Multi-Strategy Attack
- GPU acceleration via Hashcat
- CPU fallback with worker threads
- AI-powered password generation

### 2. Smart Optimization
- Dynamic phase skipping based on efficiency
- Bayesian success probability estimation
- Exponential weighted moving average for ETA

### 3. Session Management
- Pause/Resume support
- State persistence
- Recovery from interruption

### 4. Chinese Password Support
- Pinyin name patterns
- Romantic phrases (520, 1314, etc.)
- Chinese city names
- Lucky number patterns

## Usage

```javascript
import { registerFileCompressor } from './fileCompressor/index.js';

// Register IPC handlers
registerFileCompressor();

// Frontend can then call:
// ipcRenderer.invoke('zip:start-crack', { id, filePath, options })
// ipcRenderer.invoke('zip:stop-crack', { id })
// ipcRenderer.invoke('zip:pause-crack', { id })
// ipcRenderer.invoke('zip:resume-crack', { id })
```

## Configuration

See `constants.js` for:
- Attack phase definitions
- Smart mask patterns
- Keyboard patterns
- Hash mode mappings
- Rule file priorities
