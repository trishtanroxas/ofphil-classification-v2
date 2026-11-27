# Synthetic Data Realism Investigation & Revision Report

- **Original Reference (Unmodified):** `data/raw/tabular/samples/charity-patient.csv`
- **Backup Created:** `data/interim/backups/charity-patient_pre_realism_backup.csv`
- **Revised Experimental Dataset:** `data/processed/charity-patient-realism-revised.csv`
- **Total Field Modifications:** `240` (random_state=42)
- **Eligibility Labels Preserved:** `ELIGIBLE: 500`, `INELIGIBLE: 500` (unchanged)

## Revised `eligibility` x `disability_status`

```
disability_status  NULL   No  Yes   All
eligibility                            
ELIGIBLE            244   90  166   500
INELIGIBLE           35  430   35   500
All                 279  520  201  1000
```

## Revised `eligibility` x `sectoral_membership`

```
sectoral_membership  4Ps Beneficiary  Indigent  ...  Senior Citizen / PWD   All
eligibility                                     ...                            
ELIGIBLE                          51        94  ...                    72   500
INELIGIBLE                         3        13  ...                    10   500
All                               54       107  ...                    82  1000

[3 rows x 8 columns]
```
