# LLM Hardware Compatibility & Resource Allocation Report

**Project**: `ofphil-classification-v2`  
**Host Specifications**:
- **GPU**: NVIDIA GeForce RTX 3050 Laptop / Desktop (4GB dedicated GDDR6 VRAM)
- **Host RAM**: 32GB DDR4/DDR5
- **OS**: Windows 11 64-bit
- **Python**: 3.12.10
- **Runtime Environment**: Conda / Virtualenv `ofphil-v2`
- **Inference Server**: Ollama local engine (llama.cpp backend)

---

## 1. Executive Hardware Assessment

Running local instruct LLMs on 4GB VRAM with 32GB host RAM requires distinguishing **raw model file size** from **actual runtime memory requirements**.

### Key Memory Components at Runtime:
1. **Model Weights Footprint**: Static quantized weights loaded into memory.
2. **KV Cache Allocation**: Memory reserved for attention key-value states, scaling with context length and batch size ($2 \times \text{layers} \times \text{heads} \times \text{dim} \times \text{context\_tokens} \times \text{precision}$). For a 4096-token context, this adds roughly 0.5 GB to 1.5 GB.
3. **Runtime & Context Overhead**: CUDA context buffers, scratch buffers, activation memory, and OS/display server allocations (Windows Desktop Window Manager typically claims 0.3 GB – 0.6 GB VRAM).
4. **No Guaranteed 100% GPU Loading**: Because available VRAM is constrained to 4GB, models with ~2.5 GB download size cannot be guaranteed to run 100% on GPU under long contexts or when background applications consume VRAM. Full loading depends on active context tokens and VRAM headroom.

| Model Candidate | Parameter Count | Quantization (Ollama) | Published Download Size | Estimated Weights Memory | Estimated Runtime Memory (Weights + KV Cache + Overhead) | RTX 3050 4GB Full GPU Fit | Primary Memory Location | Hardware Feasibility Assessment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Qwen3 4B** *(Initial Testing)* | 4.0B | Q4_K_M | ~2.5 GB | ~2.5 GB | ~3.3 – 4.0 GB | **Probable Partial / Near-Full** *(Not guaranteed 100%)* | Mostly GPU (spillover to Host RAM if context expands) | **FEASIBLE FOR INITIAL TESTING**: Best fit for 4GB VRAM. Low offload probability during short prompts; 32GB RAM easily absorbs any layer spillover. |
| **Phi-4-mini** *(Lightweight Comp.)* | 3.8B | Q4_K_M | ~2.5 GB | ~2.5 GB | ~3.3 – 3.9 GB | **Probable Partial / Near-Full** *(Not guaranteed 100%)* | Mostly GPU (spillover to Host RAM if context expands) | **FEASIBLE FOR COMPARISON**: Compact 3.8B footprint. High likelihood of substantial GPU layer allocation; buffered by 32GB system RAM. |
| **Qwen3 8B** *(Higher-Capacity Comp.)* | 8.2B | Q4_K_M | ~5.2 GB | ~5.2 GB | ~6.5 – 7.5 GB | **NO (Partial Offload Required)** | Hybrid (approx. 20–24 layers in GPU, remaining layers in Host RAM) | **FEASIBLE VIA HYBRID OFFLOADING**: Model weights exceed total VRAM. Offloaded layers reside in 32GB system RAM without paging. |
| **Gemma 3 12B** *(Optional Heavy Comp.)* | 12.0B | Q4_K_M | ~8.2 GB | ~8.2 GB | ~10.5 – 12.0 GB | **NO (Heavy Offload Required)** | Hybrid (majority in Host RAM, minimal layers on GPU) | **FEASIBLE BUT LATENCY-BOUND**: Requires extensive host RAM offloading (~70%+ on CPU). Viable for offline batch comparison due to 32GB RAM. |

*(Note: Speculative tokens/second generation rates have been removed. Actual token generation speeds depend on memory bandwidth, CPU clocking during offload, PCIe lane width, and thermal throttling on laptop hardware, and must be empirically measured during benchmark execution.)*

---

## 2. Deep Dive: Architectural Memory Fit

### A. Qwen3 4B & Phi-4-mini (Near-Full GPU Execution with Buffer)
- **Model Size vs Runtime**: While quantized weights require ~2.5 GB, a 4096-token active context window and CUDA activation overhead expand total runtime allocation to 3.3 GB – 4.0 GB.
- **Hardware Boundary**: On Windows 11, the desktop compositor and background graphics processes usually reserve 300–600 MB of VRAM. As a result, available VRAM for compute is typically ~3.4–3.7 GB.
- **Offload Dynamics**: These models will run with most or all layers on the GPU for short context inputs. If the dialogue context approaches 4096 tokens, Ollama may offload a small number of layers to system RAM to prevent out-of-memory crashes.
- **System Buffer**: The host machine's **32GB RAM** guarantees that any offloaded layers will fit without triggering disk paging.

### B. Qwen3 8B (Hybrid Offloading Strategy)
- **Model Size vs Runtime**: At ~5.2 GB download size, the static weights alone exceed the 4.0 GB physical VRAM capacity.
- **Ollama Behavior**: Ollama automatically splits transformer layers across compute devices. Approximately 20 to 24 layers reside on the RTX 3050 GPU, while the remaining layers and associated attention caches are processed by the CPU in host RAM.
- **System Impact**: The ~3.5 to 4.5 GB host RAM footprint is easily accommodated by the 32GB system capacity.

### C. Gemma 3 12B (Heavy Host RAM Offloading)
- **Model Size vs Runtime**: With ~8.2 GB download size and ~10.5 GB runtime memory requirement, more than 70% of the model layers must reside in host RAM.
- **Operational Reality**: Memory transfers over PCIe between host RAM and the GPU introduce latency overhead. While fully supported by the 32GB system RAM without stability risks, this candidate is designated strictly as an **optional heavy comparison** model.

---

## 3. Evaluation and Testing Priority Order

1. **Candidate 1: Qwen3 4B (`qwen3:4b`) — Initial Testing Candidate**
   - Validate Ollama service connectivity, MSW prompt templates, multi-turn state tracking, and schema extraction.
2. **Candidate 2: Phi-4-mini (`phi4-mini`) — Lightweight Comparison**
   - Benchmark against Qwen3 4B on identical synthetic cases to evaluate reasoning and JSON structure compliance.
3. **Candidate 3: Qwen3 8B (`qwen3:8b`) — Higher-Capacity Comparison**
   - Benchmark multilingual Taglish nuance and conversational state tracking under hybrid CPU/GPU offload.
4. **Candidate 4: Gemma 3 12B (`gemma3:12b`) — Optional Heavy Comparison**
   - Benchmark deep semantic extraction and reasoning under heavy host memory offloading.
