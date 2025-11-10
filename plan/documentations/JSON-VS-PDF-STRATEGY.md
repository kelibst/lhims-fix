# Patient Data Extraction Strategy: JSON vs PDF

**Date**: November 8, 2025
**Decision**: Choose between extracting raw JSON data vs PDF files

---

## Executive Summary

**RECOMMENDATION**: Use a **HYBRID approach**:
1. **Extract JSON data** where available (faster, structured, database-ready)
2. **Extract PDFs as backup** for visual records and data not in JSON
3. **Prioritize JSON extraction** for database creation

---

## Comparison: JSON vs PDF

| Aspect | JSON Data | PDF Files |
|--------|-----------|-----------|
| **Speed** | ✅ Fast (no PDF generation) | ❌ Slower (PDF rendering) |
| **File Size** | ✅ Small (~10-50 KB/patient) | ❌ Large (~500 KB - 2 MB/patient) |
| **Database Import** | ✅ Direct import | ❌ Requires PDF parsing |
| **Searchability** | ✅ Instant queries | ❌ Full-text search only |
| **Data Structure** | ✅ Structured fields | ❌ Unstructured text |
| **Visual Format** | ❌ No formatting | ✅ Human-readable format |
| **Print/Share** | ❌ Not print-ready | ✅ Ready to print/share |
| **Completeness** | ⚠️ May miss some fields | ✅ Complete visual record |
| **Offline Access** | ✅ Works in database | ✅ Standalone files |

---

## Available JSON Data Endpoints

Based on network capture analysis, LHIMS provides JSON data for:

### 1. **Patient Admissions** (IPD)
**Endpoint**: `ajaxIPDManager.php?sFlag=patientAllAdmitDetails&iPatientID={id}`
**Returns**: Complete admission records with:
```json
{
  "admit_id": "22362",
  "visit_no": "ADMT-22362",
  "bed_id": "113",
  "admit_date": "2025-08-30",
  "bed_from_date": "2025-08-30 15:17:00",
  "chief_complaint": "LAP, WAIST PAIN",
  "admit_notes": "ADMISSION: Client walked into...",
  "attending_doctor": "14",
  "duty_doctor": "1108",
  "is_operation_theatre": "No",
  "discharge_reason": "",
  "transfer_status": "0",
  ...
}
```

**Database Tables**:
- `admissions` (main admission record)
- `admission_notes` (admit_notes, chief_complaint)

---

### 2. **Patient Encounters/Consultations** (OPD)
**Endpoint**: `getDynamicPatientEncounterDetails.php` (POST)
**Returns**: List of all patient consultations
**Format**: DataTables JSON (array of arrays with HTML)

**Issue**: Response contains HTML mixed with data - needs parsing
**Alternative**: Use the data from `exportServiceReportsInSinglePDF` request which has clean consultation IDs

---

### 3. **Lab Results**
**Endpoint**: `ajaxEhr.php?sFlag=getLabParameterResultDetails`
**Returns**: Lab test results
**POST Required**: Need to specify parameters

---

### 4. **Prescriptions**
**Endpoint**: `ajaxIPDManager.php?sFlag=getAllPrescriptionListForPatient&iAdmitID={id}&iPatientID={id}`
**Returns**: All prescriptions for patient/admission

---

### 5. **Vital Signs**
**Endpoint**: Related to IPD vitals
**Data**: Blood pressure, temperature, pulse, etc.

---

### 6. **Patient Attachments**
**Endpoint**: `ajaxfunExternalReports.php?sFlag=getPatientAttachments&iPatientID={id}`
**Returns**: List of uploaded files (scans, reports, etc.)

---

### 7. **Vaccinations**
**Endpoint**: `ajaxEhr.php?sFlag=getPatientVaccinationChart&iPatientID={id}`
**Returns**: Vaccination records

---

## Recommended Hybrid Strategy

### Phase 1: JSON Extraction (PRIMARY)
Extract structured JSON data for:

```
data/patient-json/
├── VR-A01-AAA2142/
│   ├── patient_info.json          (demographics, basic info)
│   ├── admissions.json             (all IPD admissions)
│   ├── consultations.json          (all OPD visits)
│   ├── prescriptions.json          (all prescriptions)
│   ├── lab_results.json            (all lab tests)
│   ├── vitals.json                 (vital signs history)
│   ├── vaccinations.json           (immunization records)
│   └── attachments.json            (metadata of uploaded files)
```

**Advantages**:
- ✅ **10-50x faster** than PDF generation
- ✅ **Database-ready** - direct JSON to SQL import
- ✅ **Smaller storage** - ~100 KB vs 2 MB per patient
- ✅ **Easy queries** - can filter, search, analyze
- ✅ **Complete data** - all fields available

---

### Phase 2: PDF Export (BACKUP/REFERENCE)
Export PDFs for:
1. **OPD Summary** - visual record of all visits
2. **IPD Admission Summaries** - formatted clinical summaries
3. **Selected high-priority patients** - not all 1,000 patients

```
data/patient-pdfs/
├── VR-A01-AAA2142_OPD.pdf
├── VR-A01-AAA2142_IPD_22362.pdf
└── VR-A01-AAA2142_IPD_657.pdf
```

**Use PDFs for**:
- ✅ Printable patient summaries
- ✅ Sharing with external facilities
- ✅ Visual reference when offline
- ✅ Backup in case JSON data incomplete

---

## Implementation Plan

### Script 1: `extract-patient-json.js` (PRIORITY 1)

```javascript
async function extractPatientJSON(patientNo) {
  console.log(`Extracting JSON data for ${patientNo}...`);

  // Step 1: Search and get patient ID
  const patientId = await searchPatient(patientNo);

  // Create patient folder
  const patientDir = path.join(__dirname, '..', 'data', 'patient-json', patientNo);
  fs.mkdirSync(patientDir, { recursive: true });

  // Step 2: Get admissions
  const admissions = await getAdmissions(patientId);
  saveJSON(path.join(patientDir, 'admissions.json'), admissions);
  console.log(`  ✓ Admissions: ${admissions.length} records`);

  // Step 3: Get consultations
  const consultations = await getConsultations(patientId);
  saveJSON(path.join(patientDir, 'consultations.json'), consultations);
  console.log(`  ✓ Consultations: ${consultations.length} records`);

  // Step 4: Get prescriptions
  const prescriptions = await getPrescriptions(patientId);
  saveJSON(path.join(patientDir, 'prescriptions.json'), prescriptions);
  console.log(`  ✓ Prescriptions: ${prescriptions.length} records`);

  // Step 5: Get lab results
  const labResults = await getLabResults(patientId);
  saveJSON(path.join(patientDir, 'lab_results.json'), labResults);
  console.log(`  ✓ Lab Results: ${labResults.length} records`);

  // Step 6: Get vaccinations
  const vaccinations = await getVaccinations(patientId);
  saveJSON(path.join(patientDir, 'vaccinations.json'), vaccinations);
  console.log(`  ✓ Vaccinations: ${vaccinations.length} records`);

  console.log(`✓ Complete: All JSON data extracted for ${patientNo}`);
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}
```

**Performance**:
- ~3-5 seconds per patient
- 1,000 patients in 1-1.5 hours
- ~100 MB total storage

---

### Script 2: `extract-patient-pdfs.js` (PRIORITY 2)

Only for selected patients or as backup:
- High-priority patients (active admissions, complex cases)
- Reference copies for health workers
- ~100-200 patients instead of 1,000

---

## Database Schema (SQLite)

With JSON data, we can create proper database schema:

```sql
-- Master patient table
CREATE TABLE patients (
    patient_id INTEGER PRIMARY KEY,
    patient_no VARCHAR(20) UNIQUE,
    name TEXT,
    age INTEGER,
    gender VARCHAR(10),
    phone TEXT,
    address TEXT,
    created_at DATETIME
);

-- Admissions
CREATE TABLE admissions (
    id INTEGER PRIMARY KEY,
    admit_id INTEGER UNIQUE,
    patient_id INTEGER,
    visit_no VARCHAR(20),
    bed_id INTEGER,
    admit_date DATE,
    admit_time TIME,
    discharge_date DATE,
    discharge_time TIME,
    chief_complaint TEXT,
    admit_notes TEXT,
    attending_doctor INTEGER,
    duty_doctor INTEGER,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Consultations
CREATE TABLE consultations (
    id INTEGER PRIMARY KEY,
    consultation_id INTEGER UNIQUE,
    patient_id INTEGER,
    service_id INTEGER,
    consultation_date DATE,
    consultation_time TIME,
    clinic_name TEXT,
    service_name TEXT,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Prescriptions
CREATE TABLE prescriptions (
    id INTEGER PRIMARY KEY,
    prescription_id INTEGER,
    patient_id INTEGER,
    consultation_id INTEGER,
    admit_id INTEGER,
    medication TEXT,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    prescribed_date DATE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Lab Results
CREATE TABLE lab_results (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER,
    test_name TEXT,
    test_date DATE,
    result_value TEXT,
    unit TEXT,
    reference_range TEXT,
    status TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Vaccinations
CREATE TABLE vaccinations (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER,
    vaccine_name TEXT,
    vaccine_date DATE,
    dose_number INTEGER,
    batch_number TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
```

---

## Data Import Process

### Python Script: `import-json-to-database.py`

```python
import json
import sqlite3
from pathlib import Path

def import_patient_data(db_path, json_dir):
    conn = sqlite3.connect(db_path)

    # Iterate through patient folders
    for patient_dir in Path(json_dir).iterdir():
        if not patient_dir.is_dir():
            continue

        patient_no = patient_dir.name

        # Import admissions
        admissions_file = patient_dir / 'admissions.json'
        if admissions_file.exists():
            with open(admissions_file) as f:
                admissions = json.load(f)
                for adm in admissions:
                    conn.execute("""
                        INSERT OR IGNORE INTO admissions
                        (admit_id, patient_id, visit_no, bed_id, admit_date,
                         chief_complaint, admit_notes, attending_doctor)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (adm['admit_id'], adm.get('patient_id'),
                          adm['visit_no'], adm['bed_id'], adm['admit_date'],
                          adm['chief_complaint'], adm['admit_notes'],
                          adm['attending_doctor']))

        # Import consultations, prescriptions, lab results, etc.
        # ... similar process for each JSON file

    conn.commit()
    conn.close()
```

---

## Storage Comparison

### JSON Approach (1,000 patients):
```
data/patient-json/
├── 1,000 patient folders
├── ~6-8 JSON files per patient
├── ~50-100 KB per patient
└── Total: ~100 MB
```

### PDF Approach (1,000 patients):
```
data/patient-pdfs/
├── 1,000 OPD PDFs (~1 MB each)
├── 1,500 IPD PDFs (~500 KB each)
└── Total: ~2-3 GB
```

**Storage Savings**: 20-30x smaller with JSON!

---

## Speed Comparison

### JSON Extraction:
- No PDF rendering needed
- Direct AJAX calls
- ~3-5 seconds per patient
- **1,000 patients: 1-1.5 hours**

### PDF Extraction:
- PDF generation + rendering
- Multiple PDFs per patient
- ~10-15 seconds per patient
- **1,000 patients: 3-4 hours**

**Time Savings**: 2-3x faster with JSON!

---

## Recommended Workflow

### Week 1: JSON Extraction (PRIORITY)
1. Create `extract-patient-json.js`
2. Test with 10 patients
3. Run full extraction for all patients
4. **Result**: Complete structured database

### Week 2: Database Creation
1. Create SQLite database schema
2. Import all JSON data
3. Build web interface for queries
4. **Result**: Offline patient lookup system

### Week 3: PDF Extraction (Optional)
1. Extract PDFs for high-priority patients only (~100-200 patients)
2. Use as visual reference and printable summaries
3. **Result**: Backup PDF records

---

## Decision Matrix

| Requirement | JSON | PDF | Winner |
|-------------|------|-----|--------|
| Create searchable database | ✅ Perfect | ❌ Hard | **JSON** |
| Fast extraction | ✅ 1 hour | ❌ 4 hours | **JSON** |
| Small storage | ✅ 100 MB | ❌ 3 GB | **JSON** |
| Printable summaries | ❌ No | ✅ Yes | **PDF** |
| Visual reference | ❌ No | ✅ Yes | **PDF** |
| Data completeness | ⚠️ Most data | ✅ All data | **PDF** |
| Query performance | ✅ Instant | ❌ Slow | **JSON** |
| Offline system | ✅ Database | ✅ Files | **Both** |

**WINNER**: **JSON for primary data, PDF for reference**

---

## Final Recommendation

### Priority 1: JSON Extraction ⭐⭐⭐
- Extract all patient data as JSON
- Create SQLite database
- Build web interface
- **Timeline**: Week 1-2

### Priority 2: Database System ⭐⭐⭐
- Import JSON to database
- Create patient lookup interface
- Enable offline searches
- **Timeline**: Week 2-3

### Priority 3: PDF Backup (Optional) ⭐
- Extract PDFs for ~100-200 high-priority patients
- Use for printing and sharing
- **Timeline**: Week 3-4

---

## Next Steps

1. **Create `extract-patient-json.js`** script
2. **Test with 5-10 patients** to verify data completeness
3. **Compare JSON vs PDF** - check if any data missing in JSON
4. **Run full extraction** if JSON data is complete
5. **Build database** from JSON files
6. **Create web interface** for patient lookups

---

**Question for you**: Should I proceed with creating the JSON extraction script first, or would you like to verify the JSON data completeness by comparing with the actual PDF content first?
