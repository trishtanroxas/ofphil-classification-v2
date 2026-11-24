"""
OCR Correction and Domain-Assisted Post-Processing Module
ofphil-classification-v2
Phase 04: Document Processing and OCR

Provides dictionary lookup, character confusion candidate generation, and
conservative post-OCR text correction while strictly respecting protected field
blacklists (names, monetary figures, identification numbers).
"""

import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from src.document_processing.ocr_evaluation import compute_levenshtein_distance, normalize_text


class AssistedDomainCorrector:
    """Post-OCR correction engine supporting raw, suggestions, and conservative modes."""

    def __init__(self, dict_base_path: Optional[Path] = None):
        if dict_base_path is None:
            dict_base_path = Path("data/external/paddleocr/dictionaries")
        self.dict_base_path = Path(dict_base_path)

        self.vocabulary: Set[str] = set()
        self.domain_terms: Dict[str, Dict[str, Any]] = {}
        self.abbreviations: Dict[str, str] = {}
        self.confusion_map: Dict[str, List[str]] = {}
        self.rules: Dict[str, Any] = {}
        self.thresholds: Dict[str, Any] = {}

        self._load_dictionaries()

    def _load_dictionaries(self) -> None:
        """Load vocabulary, domain, correction, and abbreviation files if they exist."""
        # 1. Vocabulary
        vocab_dir = self.dict_base_path / "vocabulary"
        if vocab_dir.exists():
            for txt_file in vocab_dir.glob("*.txt"):
                with open(txt_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            self.vocabulary.add(line.lower())

        # 2. Domain Dictionary
        domain_json = self.dict_base_path / "domain" / "ofphil_domain_dictionary.json"
        if domain_json.exists():
            with open(domain_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data.get("entries", []):
                    term = item.get("canonical_term", "")
                    if term:
                        self.domain_terms[term.lower()] = item
                        self.vocabulary.add(term.lower())

        # 3. Abbreviations
        abbrev_csv = self.dict_base_path / "domain" / "approved_abbreviations.csv"
        if abbrev_csv.exists():
            import csv
            with open(abbrev_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    abbr = row.get("abbreviation", "").strip()
                    expansion = row.get("expansion", "").strip()
                    if abbr:
                        self.abbreviations[abbr.upper()] = expansion

        # 4. Correction rules & confusion map
        rules_path = self.dict_base_path / "correction" / "correction_rules.json"
        if rules_path.exists():
            with open(rules_path, "r", encoding="utf-8") as f:
                self.rules = json.load(f)

        confusion_path = self.dict_base_path / "correction" / "character_confusion_map.json"
        if confusion_path.exists():
            with open(confusion_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.confusion_map = data.get("single_char_substitutions", {})

        thresh_path = self.dict_base_path / "correction" / "confidence_thresholds.json"
        if thresh_path.exists():
            with open(thresh_path, "r", encoding="utf-8") as f:
                self.thresholds = json.load(f)

    def is_protected(self, token: str, field_name: Optional[str] = None) -> bool:
        """Check if token or field belongs to protected blacklist (names, money, IDs)."""
        if field_name:
            blacklist = self.rules.get("protected_fields_blacklist", [])
            if any(term in field_name.lower() for term in blacklist):
                return True

        regex_patterns = self.rules.get("protected_regex_patterns", [
            r"^\d+$",
            r"^\d{2}/\d{2}/\d{4}$",
            r"^PHP\s*[0-9,.]+$",
            r"^P\s*[0-9,.]+$",
        ])

        for pat in regex_patterns:
            if re.match(pat, token.strip(), re.IGNORECASE):
                return True

        return False

    def get_suggestions(
        self,
        token: str,
        max_distance: int = 2,
        top_k: int = 3,
    ) -> List[Tuple[str, int]]:
        """Return top-k candidate suggestions from domain vocabulary based on edit distance."""
        clean_tok = token.strip().lower()
        if not clean_tok or len(clean_tok) < 3:
            return []

        candidates = []
        for word in self.vocabulary:
            # Quick length filter
            if abs(len(word) - len(clean_tok)) > max_distance:
                continue
            dist = compute_levenshtein_distance(clean_tok, word)
            if dist <= max_distance:
                candidates.append((word, dist))

        candidates.sort(key=lambda x: x[1])
        return candidates[:top_k]

    def correct_text(
        self,
        text: str,
        confidence: float = 1.0,
        field_name: Optional[str] = None,
        mode: str = "conservative",
    ) -> Dict[str, Any]:
        """Process OCR recognized text through the domain-assisted correction policy.

        Args:
            text: Raw predicted text string from OCR.
            confidence: PaddleOCR recognition confidence score [0.0 - 1.0].
            field_name: Name of semantic field (e.g. 'patient_name', 'clinical_diagnosis').
            mode: 'raw', 'suggestions', or 'conservative'.

        Returns:
            Dictionary containing processed text, applied corrections, mode, and audit notes.
        """
        result: Dict[str, Any] = {
            "input_text": text,
            "output_text": text,
            "confidence": confidence,
            "mode": mode,
            "field_name": field_name,
            "is_protected": self.is_protected(text, field_name),
            "corrections_applied": [],
            "suggestions": {},
        }

        if mode == "raw" or result["is_protected"]:
            return result

        # Check confidence routing: if confidence >= 0.90, do not modify
        if confidence >= 0.90:
            result["audit_note"] = "High confidence (>= 0.90). Raw text preserved."
            return result

        tokens = text.split()
        modified_tokens = []

        for token in tokens:
            if self.is_protected(token, field_name):
                modified_tokens.append(token)
                continue

            clean_token = normalize_text(token, case_fold=True, strip_punctuation=True)
            suggestions = self.get_suggestions(clean_token, max_distance=2, top_k=3)

            if suggestions:
                result["suggestions"][token] = suggestions

            if mode == "conservative":
                # Only correct if exactly 1 distance away, token >= 4 chars, and confidence between 0.60 and 0.89
                if 0.60 <= confidence < 0.90 and suggestions:
                    best_word, dist = suggestions[0]
                    if dist == 1 and len(clean_token) >= 4 and best_word in self.vocabulary:
                        # Match original casing style
                        corrected_token = best_word.capitalize() if token.istitle() else best_word
                        result["corrections_applied"].append({
                            "original": token,
                            "corrected": corrected_token,
                            "distance": dist,
                        })
                        modified_tokens.append(corrected_token)
                        continue

            modified_tokens.append(token)

        result["output_text"] = " ".join(modified_tokens)
        return result
