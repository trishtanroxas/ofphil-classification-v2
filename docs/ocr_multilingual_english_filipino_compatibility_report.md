# Multilingual English-Filipino-Taglish Compatibility Report for Document Processing

**Project:** `ofphil-classification-v2`  
**Phase:** 04 — Document Processing and OCR  
**Date:** November 24, 2026  

---

## 1. Context and Linguistic Environment

OFPHIL clinical intakes and Medical Social Work evaluations are characterized by trilingual and code-switched documentation:
1. **Clinical & Administrative English:** Medical diagnoses (e.g. *Senile Cataract*, *Pterygium*), official department titles (*Medical Social Service*), and billing terminology (*PhilHealth*, *Charity Classification*).
2. **Standard Tagalog / Filipino:** Formal social intake assessments (e.g., *Nangungupahan sa barong-barong*, *Walang permanenteng hanapbuhay*).
3. **Colloquial Code-Switched Taglish:** Informal patient remarks recorded verbatim by case workers (e.g., *May PhilHealth pero hindi active*, *Naka-confine sa ward*, *Nanghihingi ng medical assistance*).

---

## 2. Orthographic Challenges in PaddleOCR

### 2.1 Character Inclusions
The standard English recognition dictionary (`en_dict.txt`) lacks certain Latin diacritics sometimes found in Filipino legal names and borrowed medical terms (e.g., `ñ`, `Ñ`). The newly prepared dictionary (`data/external/paddleocr/dictionaries/character/character_dictionary.txt`) incorporates all 114 required characters, including uppercase and lowercase `Ñ`/`ñ`, currency symbol `₱`, and checkbox indicators.

### 2.2 Hyphenation and Particle Splitting
In Tagalog, hyphenation is morphologically crucial (e.g., `barong-barong`, `mag-asawa`, `ika-3`). Generic OCR engines frequently fragment hyphenated words or misread the hyphen as stray noise or underline artifacts. The domain dictionary ensures that hyphenated Tagalog root forms are retained as single coherent lexical units.

### 2.3 Checkbox & Indicator Glyphs
Filipino intake forms frequently combine checkbox symbols with Filipino status terms (e.g., `[✓] May Asawa`, `[ ] Walang Trabaho`). The post-processing engine maps checkbox visual variants into standardized tokens (`[CHECKED]`, `[UNCHECKED]`) before linguistic analysis.
