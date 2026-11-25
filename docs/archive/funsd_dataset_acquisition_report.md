# FUNSD Dataset Acquisition Report

**Project**: `ofphil-classification-v2`  
**Dataset**: FUNSD (Form Understanding in Noisy Scanned Documents)  
**Acquisition Date**: November 24, 2026  
**License Status**: `RESTRICTED_NON_COMMERCIAL_RESEARCH`  
**Dataset Readiness Status**: `AUXILIARY_BENCHMARK_ONLY` (Excluded from primary YOLOv8n training)

---

## 1. Official Source & Download Verification

- **Official Web Portal**: https://guillaumejaume.github.io/FUNSD/
- **Official Terms of Use**: https://guillaumejaume.github.io/FUNSD/work/
- **Official GitHub Repository**: https://github.com/guillaumejaume/FUNSD
- **Direct Download URL**: `https://guillaumejaume.github.io/FUNSD/dataset.zip`
- **Archive Size**: 16,838,830 bytes (~16.06 MB)
- **Archive SHA-256 Checksum**: `c31735649e4f441bcbb4fd0f379574f7520b42286e80b01d80b445649d54761f`
- **File Integrity**: Verified 100% complete and uncorrupted. Downloaded directly from the official portal without mirrors.

---

## 2. Dataset Organization & File Inventory

The dataset was organized into the canonical raw layout under `data/external/yolo_document_detection/raw/funsd/`:

```text
raw/funsd/
├── dataset.zip              # Original verified download archive
├── images/
│   ├── train/               # 149 PNG scanned forms
│   └── test/                # 50 PNG scanned forms
├── annotations/
│   ├── train/               # 149 JSON annotation files
│   └── test/                # 50 JSON annotation files
├── original_metadata/       # archive_metadata.json
└── README.md                # Dataset specification
```

### Actual Verified Inventory Counts:
- **Total Scanned Images**: Exactly **199** (149 training forms, 50 testing forms).
- **Total Annotation Files**: Exactly **199 JSON files** matching image stems (1:1 correspondence).
- **Total Form Entities**: **9,743 entities** (7,411 train, 2,332 test).
- **Total Word Tokens**: **31,485 words** (22,512 train, 8,973 test).
- **Corrupted / Truncated Files**: 0 detected. All images successfully opened and dimension-checked.

---

## 3. License & Legal Restrictions (Corrected)

- **License Category**: `RESTRICTED_NON_COMMERCIAL_RESEARCH`.
- **Governing Terms**: Accessible at `https://guillaumejaume.github.io/FUNSD/work/`.
- **Non-Commercial Restriction**: Strictly permitted for non-commercial academic research and educational evaluation only. Commercial utilization or commercial model training is prohibited under original terms.
- **Underlying Provenance**: Original scanned document images are derived from the RVL-CDIP corpus (sampled from the Truth Tobacco Industry Documents archive at UCSF).
- **Redistribution Restrictions**: Redistribution of raw images and annotations is restricted. Additional copyright permissions, clearances, consents, and releases may be necessary for public redistribution.
- **OFPHIL V2 Governance Decision**: Designated as an **auxiliary benchmark only**. It is **excluded** from primary YOLOv8n production training.
