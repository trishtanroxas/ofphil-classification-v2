# LLM Manual Setup & Execution Guide

**Project**: `ofphil-classification-v2`  
**Target Environment**: Windows 11 / PowerShell / JupyterLab (`ofphil-v2`)  
**Inference Runtime**: Ollama (Local Daemon)

---

## 1. Prerequisites & Ollama Installation

### A. Download & Install Ollama on Windows
1. Download the Windows installer from the official portal:
   `https://ollama.com/download/windows`
2. Run the installer (`OllamaSetup.exe`). It installs the Ollama CLI and system tray background service.
3. Open a new PowerShell terminal and verify installation:
   ```powershell
   ollama --version
   ```
   *(Expected output: `ollama version is 0.5.13` or later)*

### B. Verify Ollama Local Service Availability
Ollama typically starts automatically upon installation. To check its status:
```powershell
curl http://localhost:11434/api/tags
```
If the service is not running, start it manually:
```powershell
ollama serve
```

---

## 2. Managing Candidate Model Weights Locally

To download and manage the four candidate models without internet dependencies during notebook execution:

### Model Candidates Priority:
1. **`qwen3:4b`**: Initial testing candidate (~2.5 GB download)
2. **`phi4-mini`**: Lightweight comparison (~2.5 GB download)
3. **`qwen3:8b`**: Higher-capacity comparison (~5.2 GB download)
4. **`gemma3:12b`**: Optional heavy comparison (~8.2 GB download)

### A. Download (Pull) Candidate Models
Run the following commands in PowerShell when connected to the internet:

```powershell
# 1. Initial Testing Candidate (Qwen3 4B, ~2.5GB)
ollama pull qwen3:4b

# 2. Lightweight Comparison (Phi-4-mini 3.8B, ~2.5GB)
ollama pull phi4-mini

# 3. Higher-Capacity Comparison (Qwen3 8B, ~5.2GB)
ollama pull qwen3:8b

# 4. Optional Heavy Comparison (Gemma 3 12B, ~8.2GB)
ollama pull gemma3:12b
```

### B. List Locally Installed Models
Verify which models are available on your machine:
```powershell
ollama list
```

### C. Quick Terminal Test (Interactive CLI)
Test a model directly from PowerShell before running JupyterLab:
```powershell
# Test initial testing candidate
ollama run qwen3:4b "Kumusta po, ano po ang maitutulong ko sa inyo?"

# Test lightweight comparison candidate
ollama run phi4-mini "Hello, please confirm you are working."
```
Type `/bye` to exit the CLI chat session.

### D. Stop a Running Model
Ollama unloads models from GPU/RAM automatically after 5 minutes of inactivity. To unload immediately:
```powershell
ollama stop qwen3:4b
ollama stop phi4-mini
ollama stop qwen3:8b
ollama stop gemma3:12b
```

### E. Remove (Delete) a Model to Reclaim Disk Space
If you need to free up storage space:
```powershell
ollama rm gemma3:12b
```

---

## 3. JupyterLab Notebook Execution Workflow

Once the models are pulled, launch JupyterLab and open:
`experiments/notebooks/05_model_selection_and_training/06_llm_interview_assistant/`

Execute the five notebooks in sequence:

1. **`01_llm_model_selection_and_setup.ipynb`**:
   - Run the cells to verify that Ollama is online and inspect the model registry.
2. **`02_interview_prompt_engineering.ipynb`**:
   - Review and format the MSW Interview Assistant system prompt and multi-domain intake starter questions.
3. **`03_interview_conversation_and_followup_generation.ipynb`**:
   - Test the dialogue state tracking engine and simulate follow-up question suggestions.
4. **`04_structured_response_extraction_and_validation.ipynb`**:
   - Test Pydantic JSON extraction, verbatim quote tracing, and missing-information validation.
5. **`05_llm_interview_assistant_evaluation.ipynb`**:
   - Run the 4 standardized synthetic evaluation scenarios across all four candidate models and record the benchmark findings into the schema.
