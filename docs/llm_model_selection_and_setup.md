# LLM Model Selection & Setup Specification

**Project**: `ofphil-classification-v2`  
**Phase**: Phase 05 – Model Selection and Training (`06_llm_interview_assistant`)  
**Track**: Stage 2 MSW Interview Assistant  
**Status**: **CONFIGURED & STAGED FOR LOCAL MANUAL EXECUTION**  
**Local Runtime**: Ollama Local Inference Engine (`http://localhost:11434`)

---

## 1. Executive Summary & Purpose

The OFPHIL Stage 2 Medical Social Work (MSW) Interview Assistant is an interactive copilot designed to support licensed social workers during patient intake for surgical and clinical eye care subsidies. The system acts as a conversational partner and structured information organizer.

### Core Boundaries & Clinical Safety Directives
- **Zero Decision-Making Authority**: The LLM does not approve, reject, or assign subsidy tiers.
- **Zero Hallucination Tolerance**: The LLM must not invent unstated income, family members, or bills. Missing items are recorded as `null` / unclarified.
- **Supportive Follow-Up Generation**: The assistant detects ambiguities and suggests respectful follow-up questions in English and Filipino/Taglish.
- **Human Caseworker Supremacy**: Final intake assessment and subsidy authorization remain exclusively with the licensed Medical Social Worker.

---

## 2. Pre-Trained Model Candidates Specification

We have configured four candidate instruct models in [`experiments/config/llm_model_registry.json`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/config/llm_model_registry.json) with updated priority, verified published sizes, context windows, and licensing terms:

| Priority | Model Candidate | Ollama Tag | Params | Quantization & Published Size | Native Context Window | License & Source | Intended Role & Rationale |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Initial Testing Candidate** | Qwen3 4B Instruct | `qwen3:4b` | ~4.0B | Q4_K_M (~2.5 GB download) | 32k (up to 128k supported) | Apache 2.0 / Qwen Community License | **Initial testing candidate**: Primary model for rapid local pipeline verification, prompt engineering, multi-turn state tracking, and JSON schema extraction. |
| **Lightweight Comparison** | Phi-4-mini Instruct | `phi4-mini` | 3.8B | Q4_K_M (~2.5 GB download) | 128k (Ollama 0.5.13+) | MIT License | **Lightweight comparison**: Compact reasoning candidate with strong mathematical/logic capabilities and native function calling. |
| **Higher-Capacity Comparison** | Qwen3 8B Instruct | `qwen3:8b` | ~8.2B | Q4_K_M (~5.2 GB download) | 32k (up to 128k supported) | Apache 2.0 / Qwen Community License | **Higher-capacity comparison**: Advanced candidate for conversational nuance, rich Tagalog/English code-switching, and multi-entity extraction under hybrid offloading. |
| **Optional Heavy Comparison** | Gemma 3 12B Instruct | `gemma3:12b` | ~12.0B | Q4_K_M (~8.2 GB download) | 128k | Gemma Terms of Use (NOT Apache 2.0) | **Optional heavy comparison**: Multimodal-capable dense model for deep reasoning benchmarks; requires heavy host RAM offloading. |

> [!IMPORTANT]
> **Licensing Clarification for Gemma 3**: Gemma 3 is released under Google's custom open-weights **Gemma Terms of Use** (and accompanying Prohibited Use Policy), **not** an Apache 2.0 open-source license. Commercial use is permitted subject to specific attribution, acceptable use compliance, and synthetic data / derivative terms.

---

## 3. Local Runtime Configuration

Runtime settings are centralized in [`experiments/config/llm_runtime_config.json`](file:///c:/Users/ASUS%20TUF/Desktop/Project%20in%20Program/Thesis%20Project/ofphil-classification-v2/experiments/config/llm_runtime_config.json):

- **Local Endpoint**: `http://localhost:11434`
- **Default Model**: `qwen3:4b` (Initial testing candidate; alternative comparison models: `phi4-mini`, `qwen3:8b`, `gemma3:12b`)
- **Generation Parameters**:
  - `temperature`: `0.2` (Conversational follow-ups) / `0.0` (Deterministic structured extraction)
  - `top_p`: `0.9`
  - `max_tokens`: `1024` (Follow-up generation) / `1536` (JSON extraction)
  - `format`: `"json"` (For schema-constrained entity extraction)
- **Execution Policy**:
  - `auto_download`: `false` (Zero automatic background downloads)
  - `allow_external_cloud_calls`: `false` (Strictly local offline execution)
  - `require_manual_user_trigger`: `true`

---

## 4. Multi-Notebook Workflow Mapping

The five notebooks in `experiments/notebooks/05_model_selection_and_training/06_llm_interview_assistant/` correspond to the following stages:

1. **`01_llm_model_selection_and_setup.ipynb`**: Local runtime connectivity, environment checks, and model registry inspection.
2. **`02_interview_prompt_engineering.ipynb`**: MSW Interview Assistant system prompt, safety guardrails, and bilingual domain prompt templates.
3. **`03_interview_conversation_and_followup_generation.ipynb`**: Multi-turn dialogue state tracking (`InterviewSessionState`), conversation history management, and follow-up suggestion client.
4. **`04_structured_response_extraction_and_validation.ipynb`**: Schema-constrained Pydantic extraction (`SocioeconomicExtractionDossier`), verbatim quote verification, and missing data null-handling.
5. **`05_llm_interview_assistant_evaluation.ipynb`**: Standardized qualitative and operational evaluation rubric across 9 dimensions on identical synthetic interview scenarios across all candidates.
