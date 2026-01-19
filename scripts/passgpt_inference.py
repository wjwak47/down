#!/usr/bin/env python3
"""
PassGPT Inference Script - Direct PyTorch Inference
This script runs PassGPT model inference using PyTorch directly,
bypassing the ONNX conversion issues.
"""

import sys
import json
import torch
from pathlib import Path
from transformers import GPT2LMHeadModel, GPT2Tokenizer

def load_model():
    """Load PassGPT model and tokenizer"""
    model_cache = Path.home() / ".cache" / "huggingface" / "hub" / "models--javirandor--passgpt-10characters"
    snapshot_dirs = list(model_cache.glob("snapshots/*"))
    
    if not snapshot_dirs:
        return None, None
    
    model_path = snapshot_dirs[0]
    model = GPT2LMHeadModel.from_pretrained(model_path)
    tokenizer = GPT2Tokenizer.from_pretrained(model_path)
    model.eval()
    
    return model, tokenizer

def generate_passwords(model, tokenizer, count=1000, temperature=1.0, top_k=50, max_length=10):
    """Generate passwords using PassGPT model"""
    passwords = []
    seen = set()
    
    # Print progress to stderr (so it doesn't interfere with JSON output)
    print(f"[PassGPT] Starting generation of {count} passwords...", file=sys.stderr, flush=True)
    
    # Generate in larger batches for better performance
    batch_size = 50
    max_attempts = count * 3  # Prevent infinite loop
    attempts = 0
    
    with torch.no_grad():
        while len(passwords) < count and attempts < max_attempts:
            attempts += 1
            
            # Progress update every 10 batches
            if attempts % 10 == 0:
                print(f"[PassGPT] Progress: {len(passwords)}/{count} passwords generated (attempt {attempts})", file=sys.stderr, flush=True)
            
            # Start with BOS token
            input_ids = torch.tensor([[tokenizer.bos_token_id]] * batch_size)
            
            # Generate tokens
            for _ in range(max_length):
                outputs = model(input_ids)
                logits = outputs.logits[:, -1, :] / temperature
                
                # Top-K sampling
                if top_k > 0:
                    top_k_logits, top_k_indices = torch.topk(logits, top_k)
                    probs = torch.softmax(top_k_logits, dim=-1)
                    next_token_idx = torch.multinomial(probs, num_samples=1)
                    next_token = torch.gather(top_k_indices, 1, next_token_idx)
                else:
                    probs = torch.softmax(logits, dim=-1)
                    next_token = torch.multinomial(probs, num_samples=1)
                
                input_ids = torch.cat([input_ids, next_token], dim=1)
                
                # Check if all sequences ended
                if (next_token == tokenizer.eos_token_id).all():
                    break
            
            # Decode passwords
            for seq in input_ids:
                if len(passwords) >= count:
                    break
                    
                # Remove BOS/EOS tokens
                tokens = seq[1:].tolist()  # Skip BOS
                if tokenizer.eos_token_id in tokens:
                    tokens = tokens[:tokens.index(tokenizer.eos_token_id)]
                
                password = tokenizer.decode(tokens, skip_special_tokens=True)
                password = password.strip()
                
                # Only add if unique and valid
                if password and len(password) <= max_length and password not in seen:
                    passwords.append(password)
                    seen.add(password)
    
    print(f"[PassGPT] Generation complete: {len(passwords)} unique passwords (took {attempts} batches)", file=sys.stderr, flush=True)
    return passwords

def main():
    """Main entry point"""
    try:
        # Print startup message
        print("[PassGPT] Starting inference script...", file=sys.stderr, flush=True)
        
        # Read arguments from file or command line
        if '--args-file' in sys.argv:
            # Read from file
            args_file_idx = sys.argv.index('--args-file')
            if args_file_idx + 1 < len(sys.argv):
                args_file = sys.argv[args_file_idx + 1]
                print(f"[PassGPT] Reading args from file: {args_file}", file=sys.stderr, flush=True)
                with open(args_file, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
                    args = json.load(f)
            else:
                raise ValueError("--args-file requires a file path")
        elif len(sys.argv) >= 2:
            print(f"[PassGPT] Reading args from command line: {sys.argv[1][:100]}...", file=sys.stderr, flush=True)
            args = json.loads(sys.argv[1])
        else:
            # Read from stdin
            print("[PassGPT] Reading args from stdin...", file=sys.stderr, flush=True)
            args_str = sys.stdin.read()
            args = json.loads(args_str)
        
        count = args.get('count', 1000)
        temperature = args.get('temperature', 1.0)
        top_k = args.get('top_k', 50)
        max_length = args.get('max_length', 10)
        
        print(f"[PassGPT] Config: count={count}, temp={temperature}, top_k={top_k}, max_len={max_length}", file=sys.stderr, flush=True)
        
        # Load model
        print("[PassGPT] Loading model...", file=sys.stderr, flush=True)
        model, tokenizer = load_model()
        if model is None:
            print("[PassGPT] ERROR: Model not found", file=sys.stderr, flush=True)
            print(json.dumps({"error": "Model not found"}))
            sys.exit(1)
        
        print("[PassGPT] Model loaded successfully", file=sys.stderr, flush=True)
        
        # Generate passwords
        passwords = generate_passwords(model, tokenizer, count, temperature, top_k, max_length)
        
        # Output results
        print(json.dumps({"passwords": passwords, "count": len(passwords)}))
        
    except Exception as e:
        print(f"[PassGPT] ERROR: {str(e)}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
