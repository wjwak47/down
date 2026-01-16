/**
 * PassGPT Password Generator (Python-based)
 * Uses Python subprocess to run PassGPT model directly with PyTorch
 * 
 * This is a fallback implementation when ONNX conversion fails.
 * It's slower than ONNX but more reliable.
 * 
 * Model: javirandor/passgpt-10characters
 * Speed: ~1,000-5,000 passwords/second (depending on hardware)
 * Max length: 10 characters
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PassGPTGeneratorPython {
    constructor() {
        this.modelLoaded = false;
        this.maxLength = 10;
        this.pythonPath = 'python'; // or 'python3'
    }
    
    /**
     * Check if model is available
     */
    async loadModel() {
        if (this.modelLoaded) {
            console.log('[PassGPT-Python] Model already loaded');
            return true;
        }
        
        try {
            console.log('[PassGPT-Python] Checking model availability...');
            
            // Check if Python script exists
            const scriptPath = this.getScriptPath();
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Python script not found: ${scriptPath}`);
            }
            
            // Check if model is downloaded
            const modelCache = path.join(
                process.env.HOME || process.env.USERPROFILE,
                '.cache', 'huggingface', 'hub', 'models--javirandor--passgpt-10characters'
            );
            
            if (!fs.existsSync(modelCache)) {
                throw new Error('PassGPT model not downloaded. Run: python scripts/download_passgpt.py');
            }
            
            console.log('[PassGPT-Python] Model available');
            this.modelLoaded = true;
            return true;
            
        } catch (err) {
            console.error('[PassGPT-Python] Model check failed:', err.message);
            this.modelLoaded = false;
            return false;
        }
    }
    
    /**
     * Get Python script path
     */
    getScriptPath() {
        return path.join(process.cwd(), 'scripts', 'passgpt_inference.py');
    }
    
    /**
     * Generate passwords using PassGPT model
     * @param {number} count - Number of passwords to generate
     * @param {number} temperature - Sampling temperature (0.8-1.2, higher = more diverse)
     * @param {number} topK - Top-K sampling (0 = disabled, 50 = default)
     * @returns {Promise<string[]>} - Array of generated passwords
     */
    async generatePasswords(count = 10000, temperature = 1.0, topK = 50) {
        if (!this.modelLoaded) {
            const loaded = await this.loadModel();
            if (!loaded) {
                throw new Error('Failed to load PassGPT model');
            }
        }
        
        console.log(`[PassGPT-Python] Generating ${count} passwords (temp=${temperature}, topK=${topK})...`);
        const startTime = Date.now();
        
        try {
            const passwords = await this.runPythonInference(count, temperature, topK);
            
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = Math.round(passwords.length / elapsed);
            console.log(`[PassGPT-Python] Generation complete: ${passwords.length} passwords in ${elapsed.toFixed(2)}s (${speed} pwd/s)`);
            
            return passwords;
            
        } catch (err) {
            console.error('[PassGPT-Python] Generation failed:', err.message);
            throw err;
        }
    }
    
    /**
     * Run Python inference script
     */
    runPythonInference(count, temperature, topK) {
        return new Promise((resolve, reject) => {
            const scriptPath = this.getScriptPath();
            const args = {
                count: count,
                temperature: temperature,
                top_k: topK,
                max_length: this.maxLength
            };
            
            // Write args to temporary file in system temp directory
            // This avoids path issues and ensures the file is accessible
            const tempArgsFile = path.join(os.tmpdir(), `passgpt_args_${Date.now()}.json`);
            
            try {
                fs.writeFileSync(tempArgsFile, JSON.stringify(args), { encoding: 'utf8', flag: 'w' });
                // Verify file was written
                if (!fs.existsSync(tempArgsFile)) {
                    throw new Error('File was not created');
                }
                console.log(`[PassGPT-Python] Args file written to: ${tempArgsFile}`);
                console.log(`[PassGPT-Python] File exists: ${fs.existsSync(tempArgsFile)}`);
            } catch (err) {
                reject(new Error(`Failed to write args file: ${err.message}`));
                return;
            }
            
            console.log(`[PassGPT-Python] Running: ${this.pythonPath} ${scriptPath} --args-file ${tempArgsFile}`);
            console.log(`[PassGPT-Python] Args:`, args);
            
            const python = spawn(this.pythonPath, [scriptPath, '--args-file', tempArgsFile]);
            
            let stdout = '';
            let stderr = '';
            
            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                const msg = data.toString();
                stderr += msg;
                // Log progress messages from Python
                if (msg.includes('[PassGPT]')) {
                    console.log('[PassGPT-Python]', msg.trim());
                }
            });
            
            python.on('close', (code) => {
                console.log(`[PassGPT-Python] Process exited with code ${code}`);
                
                // Clean up temp file
                try {
                    if (fs.existsSync(tempArgsFile)) {
                        fs.unlinkSync(tempArgsFile);
                    }
                } catch (err) {
                    console.warn('[PassGPT-Python] Failed to delete temp args file:', err.message);
                }
                
                if (code !== 0) {
                    console.error('[PassGPT-Python] Python error:', stderr);
                    reject(new Error(`Python process exited with code ${code}: ${stderr}`));
                    return;
                }
                
                try {
                    // Parse JSON output
                    const result = JSON.parse(stdout);
                    
                    if (result.error) {
                        reject(new Error(result.error));
                        return;
                    }
                    
                    if (!result.passwords || !Array.isArray(result.passwords)) {
                        reject(new Error('Invalid response from Python script'));
                        return;
                    }
                    
                    resolve(result.passwords);
                    
                } catch (err) {
                    console.error('[PassGPT-Python] Failed to parse output:', stdout.substring(0, 200));
                    reject(new Error(`Failed to parse Python output: ${err.message}`));
                }
            });
            
            python.on('error', (err) => {
                // Clean up temp file on error
                try {
                    if (fs.existsSync(tempArgsFile)) {
                        fs.unlinkSync(tempArgsFile);
                    }
                } catch (e) {}
                reject(new Error(`Failed to start Python process: ${err.message}`));
            });
        });
    }
    
    /**
     * Release model resources
     */
    async dispose() {
        console.log('[PassGPT-Python] Releasing resources...');
        this.modelLoaded = false;
    }
    
    /**
     * Check if model is available
     */
    isAvailable() {
        const scriptPath = this.getScriptPath();
        const modelCache = path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.cache', 'huggingface', 'hub', 'models--javirandor--passgpt-10characters'
        );
        
        return fs.existsSync(scriptPath) && fs.existsSync(modelCache);
    }
}

export default PassGPTGeneratorPython;
