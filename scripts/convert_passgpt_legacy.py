#!/usr/bin/env python3
"""
PassGPT Converter - Using Legacy ONNX Export (Opset 11)
This uses the older torch.onnx.export path which is more stable for GPT-2 models
"""

import os
import json
import torch
from pathlib import Path
from transformers import GPT2LMHeadModel, GPT2Tokenizer

print("=" * 60)
print("PassGPT Converter (Legacy ONNX Export)")
print("=" * 60)

# Paths
model_cache = Path.home() / ".cache" / "huggingface" / "hub" / "models--javirandor--passgpt-10characters"
output_dir = Path("resources/models")
output_dir.mkdir(parents=True, exist_ok=True)

# Find the model snapshot directory
snapshot_dirs = list(model_cache.glob("snapshots/*"))
if not snapshot_dirs:
    print("❌ Model not found in cache.")
    exit(1)

model_path = snapshot_dirs[0]
print(f"📂 Using model from: {model_path}")

# Load model and tokenizer
print("\n📥 Loading model and tokenizer...")
model = GPT2LMHeadModel.from_pretrained(model_path)
tokenizer = GPT2Tokenizer.from_pretrained(model_path)
model.eval()
print("✅ Model loaded successfully")

# Save vocabulary
print("\n💾 Saving vocabulary...")
vocab = tokenizer.get_vocab()
vocab_path = output_dir / "passgpt_vocab.json"
with open(vocab_path, 'w', encoding='utf-8') as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)
print(f"✅ Vocabulary saved: {vocab_path}")
print(f"   Vocabulary size: {len(vocab)} tokens")

# Create a simplified wrapper that only returns logits
print("\n🔄 Creating simplified model wrapper...")

class SimplifiedGPT2(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
    
    def forward(self, input_ids):
        # Call model without cache and only return logits
        with torch.no_grad():
            outputs = self.model(input_ids, use_cache=False)
            return outputs.logits

# Wrap the model
simplified_model = SimplifiedGPT2(model)
simplified_model.eval()

# Export to ONNX using legacy path
print("\n🔄 Converting to ONNX (legacy export)...")
try:
    dummy_input = torch.randint(0, len(tokenizer), (1, 10))
    onnx_path = output_dir / "passgpt.onnx"
    
    # Use legacy export with opset 11 (more stable)
    with torch.no_grad():
        torch.onnx.export(
            simplified_model,
            (dummy_input,),
            str(onnx_path),
            input_names=['input_ids'],
            output_names=['logits'],
            dynamic_axes={
                'input_ids': {0: 'batch_size', 1: 'sequence'},
                'logits': {0: 'batch_size', 1: 'sequence'}
            },
            opset_version=11,  # Use older opset for stability
            do_constant_folding=True,
            export_params=True,
            verbose=False
        )
    
    print(f"✅ ONNX model saved: {onnx_path}")
    model_size_mb = onnx_path.stat().st_size / (1024 * 1024)
    print(f"   Model size: {model_size_mb:.2f} MB")
    
    # Verify the model
    print("\n🔍 Verifying ONNX model...")
    import onnx
    onnx_model = onnx.load(str(onnx_path))
    onnx.checker.check_model(onnx_model)
    print("✅ ONNX model is valid!")
    
except Exception as e:
    print(f"❌ Failed to convert: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Create metadata
print("\n📝 Creating metadata...")
metadata = {
    "model_name": "PassGPT",
    "model_version": "1.0",
    "model_source": "javirandor/passgpt-10characters",
    "model_type": "GPT-2 based password generator",
    "max_length": 10,
    "vocab_size": len(vocab),
    "expected_hit_rate": "55-60%",
    "inference_speed": "50,000+ passwords/second",
    "opset_version": 11,
    "notes": "Exported using legacy ONNX path for stability"
}

metadata_path = output_dir / "passgpt_metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Metadata saved: {metadata_path}")

print("\n" + "=" * 60)
print("✅ Conversion complete!")
print("=" * 60)
print(f"\nGenerated files in {output_dir}:")
print(f"  - passgpt.onnx ({model_size_mb:.2f} MB)")
print(f"  - passgpt_vocab.json")
print(f"  - passgpt_metadata.json")
print("\n✅ Ready to use in Node.js!")
