# OFPHIL Overall Integrated Data Pipeline

## 1. End-to-End Multimodal Integration Workflow

The OFPHIL architecture couples document screening, structured conversational intake, and tabular eligibility modeling via an explicit data validation barrier.

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient / Applicant
    actor MSW as Medical Social Worker
    participant TrackA as Track A: Document Fraud Screening
    participant TrackB as Track B: Interview Assistant
    participant Barrier as Validation Barrier & Patient Record
    participant TrackC as Track C: Eligibility Classification
    actor Admin as Hospital Approving Authority

    %% Track A Flow
    Patient->>TrackA: Upload Document (Indigency Cert, Quotation, ID)
    TrackA->>TrackA: OpenCV Enhance & Deskew
    TrackA->>TrackA: YOLO11s Detect Regions (Fields, Stamps, Signatures)
    TrackA->>TrackA: PaddleOCR Extract Text & Values
    TrackA->>TrackA: ORB/SIFT & CMFD Screen for Splicing/Copy-Move
    TrackA->>MSW: Deliver Document Screening Report (Flags & OCR Text)
    MSW->>Barrier: Confirm / Authorize Verified Document Data

    %% Track B Flow
    Patient->>MSW: Patient Intake Dialogue (Filipino / English)
    MSW->>TrackB: Interactive Dialogue & Responses
    TrackB->>TrackB: Qwen3-4B Formulate Follow-ups & Extract Structured JSON
    TrackB->>MSW: Review Structured Household & Income Profile
    MSW->>Barrier: Confirm & Commit Patient Assessment Record

    %% Track C Flow
    Barrier->>TrackC: Feed Validated Assessment Features
    TrackC->>TrackC: Preprocessing Pipeline & Calibration
    TrackC->>TrackC: Predict Grant Tier (RF, CatBoost, EBM)
    TrackC->>TrackC: Generate EBM Feature Importance & Explanations
    TrackC->>MSW: Present Decision-Support Tier & Explanations
    MSW->>Admin: Submit Final Assessment Recommendation
    Admin->>Patient: Issue Authorized Charity Grant Decision
```

---

## 2. Information Exchange Boundaries

1. **Document Screening $\rightarrow$ Assessment Record:**
   - Visual inspection flags (e.g. high CMFD score, missing stamp) do not abort the intake. They are logged as inspection indicators for the MSW to review original hard copies.
   - Verified quotation totals, endorsing doctor names, and barangay details populate the pending assessment record once confirmed.

2. **Patient Interview $\rightarrow$ Assessment Record:**
   - Raw chat transcripts are converted to standardized JSON schemas (household size, total monthly income, dependents, housing type).
   - The MSW reviews and commits the data. Unconfirmed LLM output is never forwarded directly to Track C.

3. **Assessment Record $\rightarrow$ Eligibility Classification:**
   - Track C receives normalized numerical and categorical vectors.
   - Classification output (Eligible/Ineligible, Subsidy Tier 25%-100%) and feature explanations are provided as decision aids.
