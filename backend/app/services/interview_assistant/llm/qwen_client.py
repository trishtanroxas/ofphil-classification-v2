from typing import Dict, Any, Optional
import json
from app.shared.logging.logger import get_logger

logger = get_logger("QwenClient")

class QwenInterviewClient:
    """
    Client interface for Qwen3-4B-Instruct-2507 via local Ollama or llama.cpp runtime.
    
    CRITICAL SAFETY RESTRICTIONS:
      - Does NOT determine charity eligibility.
      - Does NOT approve or reject applicants.
      - Does NOT diagnose medical conditions or assign risk scores.
      - Focuses strictly on conversational assistance and follow-up formulation.
    """

    def __init__(self, endpoint_url: str = "http://localhost:11434", model_tag: str = "qwen3:4b-instruct-2507"):
        self.endpoint_url = endpoint_url
        self.model_tag = model_tag

    def generate_followup_question(self, dialogue_history: str, current_response: str) -> str:
        """
        Formulates a polite, clinically relevant follow-up question in English or Tagalog/Filipino.
        """
        system_prompt = (
            "You are an intake interview assistant for a hospital Medical Social Work department in the Philippines. "
            "You help interview charity applicants by clarifying household size, income sources, and living arrangements. "
            "Never approve, reject, or determine eligibility. Keep responses polite and empathetic in Filipino or English."
        )
        logger.info("Generating interview follow-up question via Qwen3-4B interface.")
        # In runtime: calls Ollama API /api/generate
        # Scaffold response:
        return "Maaari po ba ninyong maipaliwanag kung sino-sino pa ang kasama ninyo sa bahay na may sariling hanapbuhay?"
