# Phase 1: Excel Data Import - Quick Start Guide

## Overview

Phase 1 creates a searchable patient database from existing Excel files (~70,000 patients, ~867,000 records) in **hours** instead of waiting 10 days for detailed JSON extraction.

**What You Get Immediately:**
- Patient master list with demographics
- Complete visit history across all departments
- ICD-10 coded diagnoses
- Medication lists (prescribed and dispensed)
- Lab test orders
- Admission/discharge records

**What Phase 2 Will Add Later:**
- Lab test RESULTS (not just orders)
- Detailed vital signs
- Clinical notes
- Allergies and adverse reactions
- Surgical procedure details

---

## Prerequisites

**Required:**
- Node.js installed
- Existing Excel files in `data/` directory:
  - `data/consulting-room/` (34 files)
  - `data/ipd-morbidity-mortality/` (31 files)
  - `data/opd-register/` (34 files)
  - `data/medical-laboratory/` (34 files)
  - `data/anc-register/` (33 files)

**Node Modules Needed:**
```bash
npm install xlsx sqlite3
```

---

## Quick Start

### Option 1: Automated (Recommended)

Double-click `phase1-setup.bat` - it will:
1. Initialize the database
2. Import all Excel files
3. Show statistics

### Option 2: Manual Step-by-Step

**Step 1: Initialize Database**
```bash
node scripts/init-database.js
```

Expected output:
```
✓ Database file created
✓ All 100+ statements executed successfully
📊 Database Structure:
   Tables: 25
   Views: 5
   Triggers: 10
```

**Step 2: Import Excel Files**
```bash
node scripts/import-excel-data.js
```

Expected output:
```
📁 Category: Consulting (34 files)
   ✓ Completed: 10,234 imported, 12 skipped, 0 failed
📁 Category: IPD (31 files)
   ✓ Completed: 723 imported, 3 skipped, 0 failed
...
📊 Final Statistics:
   Files processed: 166
   Unique patients: 68,423
   Visit records: 867,496
   Diagnosis records: 145,234
   Medication records: 89,756
   Lab order records: 165,330
⏱ Total time: 18.5 minutes
```

---

## What Gets Imported

### 1. Consulting Room Files (Priority 1 - Best Data)
**Source:** `data/consulting-room/Consulting_Room_YYYY_MMM.xlsx`

**Extracted:**
- Patient demographics (Patient No., Name, NHIS, Phone, Address)
- Visit dates and consultation history
- **ICD-10 Diagnoses** (Principal + Additional, for New/Old/Recurring cases)
- **Medications** (Prescribed AND Dispensed lists)
- Pregnancy status
- Referral tracking

**Why First:** Most comprehensive clinical data with contact information

### 2. IPD Morbidity & Mortality (Priority 2)
**Source:** `data/ipd-morbidity-mortality/IPD_Morbidity_Mortality_YYYY_MMM.xlsx`

**Extracted:**
- Admission/discharge dates
- **ICD-10 Diagnoses** (Principal, Additional, Provisional)
- Outcome of discharge (including mortality)
- Specialty and department
- Surgical procedure (Yes/No flag)
- Cost of treatment

**Why Second:** Rich diagnosis data for admitted patients

### 3. OPD Register (Priority 3)
**Source:** `data/opd-register/OPD_Register_YYYY_MMM.xlsx`

**Extracted:**
- Outpatient attendance dates
- Patient status (New/Old)
- NHIS enrollment
- Referral diagnosis (limited)

**Why Third:** High volume but minimal clinical detail

### 4. Medical Laboratory (Priority 4)
**Source:** `data/medical-laboratory/*.xlsx`

**Extracted:**
- Lab test orders (NOT results - Phase 2 will get results)
- Test type and specimen
- Sample collection date/time
- Requesting clinician
- Pathology barcode

**Why Fourth:** Tracks what tests were ordered

### 5. ANC Register (Priority 5)
**Source:** `data/anc-register/ANC_Register_YYYY_MMM.xlsx`

**Extracted:**
- Antenatal care visit dates
- Pregnancy data (parity, EDD, fundal height)
- Blood pressure readings
- Preventive interventions (TT, IPT, ITN)
- Blood group and screening tests

**Why Last:** Specialized for pregnancy care only

---

## Database Structure

### Core Patient Table
```sql
patients (patient_id, patient_no, full_name, gender, age_years,
         nhis_number, mobile_phone, address, ...)
```
**Source:** Consulting Room files (best demographics)

### Phase 1 Data Tables

**excel_visits** - All patient encounters
- 867K+ visit records from all files
- Links to source Excel file and row number

**excel_diagnoses** - ICD-10 coded diagnoses
- ~145K diagnosis records
- Extracted from Consulting Room + IPD files
- Includes ICD-10 codes (e.g., "A09 - Diarrhoea")

**excel_medications** - Medication lists
- ~90K medication records
- Extracted from Consulting Room
- Prescribed AND dispensed medications

**excel_lab_orders** - Lab test orders
- ~165K lab orders
- Test requested, specimen type, clinician

**import_log** - Tracks which files have been imported
**patient_enhancement_status** - Tracks Phase 2 progress per patient

---

## Querying the Database

### Using SQLite Command Line

```bash
sqlite3 data/database/patient-care-system.db
```

### Sample Queries

**Find a patient:**
```sql
SELECT * FROM patients WHERE patient_no = 'VR-A01-AAA2142';
```

**Get patient visit history:**
```sql
SELECT visit_date, source_category, age, gender, locality
FROM excel_visits
WHERE patient_no = 'VR-A01-AAA2142'
ORDER BY visit_date DESC;
```

**Get diagnoses for a patient:**
```sql
SELECT visit_date, diagnosis_type, icd10_code, diagnosis_text
FROM excel_diagnoses
WHERE patient_no = 'VR-A01-AAA2142'
ORDER BY visit_date DESC;
```

**Get medications for a patient:**
```sql
SELECT visit_date, medication_type, medication_text
FROM excel_medications
WHERE patient_no = 'VR-A01-AAA2142'
ORDER BY visit_date DESC;
```

**Get lab orders for a patient:**
```sql
SELECT schedule_date, test_requested, specimen_type, clinician_name
FROM excel_lab_orders
WHERE patient_no = 'VR-A01-AAA2142'
ORDER BY schedule_date DESC;
```

**Patient summary (using view):**
```sql
SELECT * FROM v_phase1_patient_summary
WHERE patient_no = 'VR-A01-AAA2142';
```

**Top diagnoses in hospital:**
```sql
SELECT icd10_code, diagnosis_text, COUNT(*) as frequency
FROM excel_diagnoses
WHERE icd10_code IS NOT NULL
GROUP BY icd10_code
ORDER BY frequency DESC
LIMIT 20;
```

**Patient count by locality:**
```sql
SELECT locality, COUNT(DISTINCT patient_no) as patient_count
FROM excel_visits
WHERE locality IS NOT NULL AND locality != 'NA'
GROUP BY locality
ORDER BY patient_count DESC
LIMIT 20;
```

---

## Verification Steps

After import completes, verify data:

### 1. Check Patient Count
```sql
SELECT COUNT(*) FROM patients;
-- Expected: ~70,000
```

### 2. Check Visit Records
```sql
SELECT source_category, COUNT(*) as records
FROM excel_visits
GROUP BY source_category;
```

Expected output:
```
Consulting   | 352,432
OPD          | 295,256
Lab          |       0  (Lab orders are in separate table)
IPD          |  22,413
ANC          |  32,065
```

### 3. Check Import Log
```sql
SELECT source_category,
       COUNT(*) as files,
       SUM(records_imported) as total_records,
       SUM(records_failed) as failures
FROM import_log
GROUP BY source_category;
```

### 4. Find Test Patient
```sql
-- Search for a known patient
SELECT p.patient_no, p.full_name, p.mobile_phone,
       COUNT(DISTINCT ev.visit_id) as total_visits
FROM patients p
LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
WHERE p.patient_no LIKE '%AAA2142%'
GROUP BY p.patient_id;
```

---

## Troubleshooting

### Error: "Module 'xlsx' not found"
**Solution:**
```bash
npm install xlsx sqlite3
```

### Error: "Database file is locked"
**Solution:**
- Close any open database connections
- Close DB Browser or other SQLite tools
- Restart the import

### Error: "Schema file not found"
**Solution:**
- Ensure `database-schema.sql` exists in project root
- Run from project root directory

### Import is very slow
**Normal:** Importing 867K records takes 15-30 minutes
**If stuck:**
- Check console for error messages
- Verify Excel files are not corrupted
- Check disk space (database will be ~500MB-1GB)

### Missing Excel files
**Solution:**
- Script will skip missing folders
- Ensure Excel files are in correct folders:
  - `data/consulting-room/*.xlsx`
  - `data/ipd-morbidity-mortality/*.xlsx`
  - `data/opd-register/*.xlsx`
  - `data/medical-laboratory/*.xlsx`
  - `data/anc-register/*.xlsx`

---

## File Sizes

**Database:** ~500MB-1GB (depends on data volume)
**Import Time:** 15-30 minutes
**Disk Space Required:** 2GB minimum (database + temp files)

---

## Next Steps After Phase 1

### Option 1: Use Phase 1 Data Immediately
- Build web search interface
- Query patient data
- Generate reports
- Export patient lists

### Option 2: Start Phase 2 Enhancement
Phase 2 will run in background for 10 days, gradually adding:
- Lab test RESULTS (not just orders)
- Detailed vital signs
- Complete clinical notes
- Allergies and adverse reactions
- Surgical procedure details

**Start Phase 2:**
```bash
# Use existing extract-patient-json.js with master patient list
node scripts/extract-patient-json.js --patient-list master-patient-list.txt
```

Phase 2 will update existing patient records with enhanced data as extraction completes.

---

## Support

**Common Issues:**
- Excel date format errors: Dates in unexpected format (script handles DD-MM-YYYY and Excel serial)
- Patient number variations: Script cleans and normalizes patient numbers
- Missing data: Script logs skipped records - check console output

**Database Location:**
```
data/database/patient-care-system.db
```

**Import Logs:**
Query `import_log` table for detailed import statistics per file

---

## Summary

**Phase 1 Goal:** Get 70,000 patients searchable FAST with basic clinical data

**What You Have:**
✅ Patient demographics (name, NHIS, phone, address)
✅ Complete visit history
✅ ICD-10 coded diagnoses
✅ Medication lists
✅ Lab test orders
✅ Admission/discharge records

**What Phase 2 Will Add:**
⏳ Lab test RESULTS
⏳ Detailed vital signs
⏳ Clinical notes
⏳ Allergies
⏳ Surgical procedure details

**Time Saved:** Phase 1 completes in <1 hour vs. 10 days for Phase 2
