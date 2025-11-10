# LHIMS Patient-Centric Database System - COMPLETE IMPLEMENTATION PLAN

**Status**: ✅ APPROVED
**Start Date**: November 8, 2025
**Estimated Completion**: 6-9 weeks
**Priority**: CRITICAL (Data extraction must complete before facility lockout)

---

## Executive Summary

This plan creates an **offline patient database system** that organizes all LHIMS data by patient folder number, enabling health workers to access complete patient records (including PDF exports with nurses/doctors notes) when LHIMS is unavailable.

**Key Innovation**: Capturing LHIMS PDF patient record export feature to get **complete patient histories** including visits, nurses notes, and doctors notes - data that may not be available in Excel register exports.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   LHIMS OFFLINE PATIENT SYSTEM                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATA SOURCES:                                                  │
│  ┌────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Excel Registers    │  │ PDF Patient Records              │  │
│  │ (12 types)         │  │ (Complete patient history)       │  │
│  │ - OPD              │  │ - All visits (OPD/IPD)          │  │
│  │ - IPD              │  │ - Nurses notes                  │  │
│  │ - ANC              │  │ - Doctors notes                 │  │
│  │ - Consulting Room  │  │ - Prescriptions                 │  │
│  │ - Medical Lab      │  │ - Lab results                   │  │
│  │ - Maternity        │  │ - Vital signs                   │  │
│  │ - + 6 more         │  │ - Complete health data          │  │
│  └────────────────────┘  └──────────────────────────────────┘  │
│           │                           │                         │
│           ├───────────┬───────────────┘                         │
│           ▼           ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         SQLite Patient Database                         │   │
│  │  - Master patient list                                  │   │
│  │  - 12+ tables (one per register)                       │   │
│  │  - PDF metadata table                                  │   │
│  │  - Linked by Patient No. (VR-A01-AAANNNN)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Web-Based Patient Lookup Interface              │   │
│  │  - Search by folder number                             │   │
│  │  - View complete patient timeline                      │   │
│  │  - Access PDF patient records                          │   │
│  │  - Export patient summaries                            │   │
│  │  - Works OFFLINE on hospital network                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│            ┌──────────────────────────────┐                     │
│            │   Health Workers Access      │                     │
│            │   - OPD workstations         │                     │
│            │   - Consulting room          │                     │
│            │   - Records office           │                     │
│            │   - Nursing station          │                     │
│            └──────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Data Extraction (WEEK 1 - CRITICAL)

### Phase 1A: Complete Register Extraction
**Timeline**: Days 1-5
**Priority**: CRITICAL

#### Already Completed (5/12 registers):
✅ OPD Register (30 files, ~1,188 records/month)
✅ IPD Morbidity & Mortality (31 files, ~2 records/month)
✅ ANC Register (33 files, ~73 records/month)
✅ Consulting Room (34 files, ~369 records/month)
✅ Medical Laboratory (34 files, ~4 records/month)

#### Remaining Registers (7/12):
Priority order for capture:

1. **Maternity Ward** (HIGH PRIORITY)
   - Deliveries, complications, outcomes
   - Links to ANC records

2. **Admission & Discharge** (HIGH PRIORITY)
   - All admissions/discharges
   - May overlap with IPD but more comprehensive

3. **Post Natal Care Mother** (MEDIUM)
   - Postnatal follow-up for mothers
   - Links to maternity records

4. **Post Natal Care Child** (MEDIUM)
   - Postnatal follow-up for newborns
   - Links to maternity records

5. **General Ward** (MEDIUM)
   - General ward admissions
   - May overlap with IPD/Admission

6. **Family Planning** (MEDIUM)
   - Contraception, counseling
   - Reproductive health services

7. **Child Welfare Clinic** (MEDIUM)
   - Child immunizations
   - Growth monitoring

#### Extraction Steps (for each register):
1. **Capture network traffic**:
   - Open browser with DevTools Network tab
   - Navigate to register in LHIMS
   - Select date range (one month)
   - Click "Export to Excel"
   - Save HAR file with capture

2. **Analyze endpoint**:
   - Extract export URL
   - Identify required parameters
   - Document data format

3. **Create extraction script**:
   ```bash
   # Copy existing script as template
   cp scripts/extract-opd-data.js scripts/extract-maternity-data.js
   # Update endpoint and parameters
   ```

4. **Run extraction**:
   ```bash
   node scripts/extract-maternity-data.js
   ```

**Deliverable**: All 12 registers extracted (Jan 2023 - current)

---

### Phase 1B: PDF Patient Record Extraction
**Timeline**: Days 2-4
**Priority**: CRITICAL

This is the **key innovation** - capturing complete patient records including nurses/doctors notes.

#### Step 1: Capture PDF Export Workflow (YOU DO THIS)

**Instructions for capturing PDF export**:

1. **Prepare for capture**:
   - Open Chrome/Edge browser
   - Press F12 to open Developer Tools
   - Click "Network" tab
   - Check "Preserve log" checkbox

2. **Perform PDF export**:
   - Login to LHIMS
   - Navigate to patient search/lookup
   - Search for a patient by folder number (e.g., VR-A01-AAA1193)
   - Click "Print" or "Export PDF" or "Patient Record" button
   - Wait for PDF to generate/download

3. **Save capture**:
   - Right-click in Network tab → "Save all as HAR with content"
   - Save as: `network-captures/patient-pdf-export-PATIENTNO.har`
   - Save the downloaded PDF as: `network-captures/sample-patient-record-PATIENTNO.pdf`

4. **Repeat for 2-3 patients** to confirm pattern consistency

5. **Share with me**:
   - Upload HAR files to: `network-captures/` folder
   - Upload sample PDFs to: `network-captures/` folder

**What I'm looking for in the capture**:
- PDF generation endpoint URL
- Required parameters (patient number, date range?, etc.)
- POST vs GET request
- Response type (direct PDF download or URL?)
- File size and format
- Session/authentication requirements

#### Step 2: Analyze PDF Export Endpoint (I DO THIS)

Once you share HAR files, I will:
1. Analyze request/response patterns
2. Identify PDF generation endpoint
3. Document parameters and authentication
4. Test with sample patient numbers

#### Step 3: Create PDF Extraction Script (I DO THIS)

```javascript
/**
 * scripts/extract-patient-pdfs.js
 *
 * Extracts complete patient record PDFs from LHIMS
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  // LHIMS connection
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',

  // Login credentials
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },

  // PDF export endpoint (to be discovered from capture)
  pdfEndpoint: 'http://10.10.0.59/lhims_182/printPatientRecord.php', // EXAMPLE

  // List of patient numbers to extract
  // Will be populated from master patient list
  patientNumbers: [],

  // Output directory
  outputDir: path.join(__dirname, '..', 'data', 'patient-pdfs'),

  // Delay between requests
  delayBetweenRequests: 5000, // 5 seconds (slower to be safe)

  // Browser settings
  headless: false,
  timeout: 600000, // 10 minutes per PDF (may take longer than registers)

  // Resume settings
  skipExisting: true,
  minFileSize: 5000, // 5KB minimum for valid PDF

  // Session management
  sessionRefreshInterval: 5, // Refresh every 5 PDFs (slower than registers)
  maxRetries: 2,
  reloginDelay: 2000,
};

async function extractPatientPDF(page, patientNo, retryCount = 0) {
  try {
    // Navigate to patient search or directly to PDF endpoint
    // (Implementation depends on HAR analysis)

    const pdfUrl = `${CONFIG.pdfEndpoint}?patientNo=${patientNo}`;

    const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

    await page.goto(pdfUrl, { timeout: CONFIG.timeout, waitUntil: 'commit' });

    const download = await downloadPromise;

    const filename = `${patientNo}.pdf`;
    const savePath = path.join(CONFIG.outputDir, filename);
    await download.saveAs(savePath);

    // Verify PDF
    const stats = fs.statSync(savePath);
    if (stats.size < CONFIG.minFileSize) {
      throw new Error(`PDF too small (${stats.size} bytes)`);
    }

    return true;
  } catch (error) {
    // Retry logic similar to register extraction
    if (retryCount < CONFIG.maxRetries) {
      console.log(`      Retry ${retryCount + 1}/${CONFIG.maxRetries}...`);
      await relogin(page);
      return await extractPatientPDF(page, patientNo, retryCount + 1);
    }
    throw error;
  }
}

// ... (rest of script similar to register extraction)
```

#### Step 4: Determine Extraction Strategy

**Option A: Extract ALL patients** (Comprehensive)
- Extract PDF for every unique patient in database
- **Pros**: Complete coverage
- **Cons**: Very time-consuming (could be 5,000+ patients × 5 seconds = 7+ hours)

**Option B: Extract HIGH-PRIORITY patients** (Recommended)
- Patients with visits in last 12 months (active patients)
- Patients with multiple register entries (complex cases)
- Patients with IPD admissions (serious cases)
- **Pros**: Faster, focuses on clinically relevant records
- **Cons**: May miss some patient data
- **Estimated**: ~1,000-2,000 patients × 5 seconds = 1.5-3 hours

**Option C: On-Demand extraction** (Most flexible)
- Create script that can extract PDF for any patient on request
- Health workers can request PDFs for specific patients
- **Pros**: Very efficient, only extract when needed
- **Cons**: Not comprehensive, requires manual requests

**RECOMMENDATION**:
- **Phase 1B**: Extract **Option B** (high-priority patients) immediately
- **Phase 4**: Provide **Option C** (on-demand) in web interface
- **Phase 7**: Run **Option A** (all patients) during maintenance

#### Step 5: Run PDF Extraction

Once script is ready:

```bash
# Extract PDFs for high-priority patients
node scripts/extract-patient-pdfs.js --mode=high-priority

# Or extract specific patients
node scripts/extract-patient-pdfs.js --patients=VR-A01-AAA1193,VR-A01-AAA1194

# Or extract ALL patients (long-running)
node scripts/extract-patient-pdfs.js --mode=all
```

**Deliverable**:
- PDF extraction script
- 1,000-2,000 patient PDFs (high-priority patients)
- Sample PDFs for testing

---

## PHASE 2: Data Consolidation (WEEK 2-3)

### Phase 2A: Excel Register Data Consolidation

#### Task 1: Create Master Patient List

```python
# scripts/create-master-patient-list.py

import pandas as pd
import glob
from pathlib import Path

# Read all register files
registers = {
    'opd': 'data/opd-register/*.xlsx',
    'ipd': 'data/ipd-morbidity-mortality/*.xlsx',
    'anc': 'data/anc-register/*.xlsx',
    # ... all 12 registers
}

all_patients = []

for register_name, pattern in registers.items():
    files = glob.glob(pattern)
    for file in files:
        # Read Excel with appropriate skiprows
        if register_name == 'anc':
            df = pd.read_excel(file, skiprows=8)
        elif register_name in ['opd', 'ipd', 'consulting', 'lab']:
            df = pd.read_excel(file, skiprows=5)
        # ... other registers

        # Extract patient info
        if 'Patient No.' in df.columns:
            patients = df[['Patient No.', 'Patient Name', 'Age', 'Gender',
                          'Locality']].copy()
            patients['source_register'] = register_name
            all_patients.append(patients)

# Combine all patients
combined = pd.concat(all_patients, ignore_index=True)

# Remove duplicates, keep most recent info
master_list = combined.drop_duplicates(subset='Patient No.', keep='last')

# Clean patient names (remove extra spaces)
master_list['Patient Name'] = master_list['Patient Name'].str.strip()
master_list['Patient Name'] = master_list['Patient Name'].str.replace(r'\s+', ' ', regex=True)

# Save master list
master_list.to_excel('data/master_patient_list.xlsx', index=False)
print(f"Total unique patients: {len(master_list)}")
```

Run:
```bash
python scripts/create-master-patient-list.py
```

**Output**: `data/master_patient_list.xlsx`

#### Task 2: Data Quality Report

```python
# scripts/data-quality-report.py

import pandas as pd

master = pd.read_excel('data/master_patient_list.xlsx')

report = {
    'total_patients': len(master),
    'patients_with_name': master['Patient Name'].notna().sum(),
    'patients_with_age': master['Age'].notna().sum(),
    'patients_with_gender': master['Gender'].notna().sum(),
    'patients_with_locality': master['Locality'].notna().sum(),

    'gender_distribution': master['Gender'].value_counts().to_dict(),
    'age_distribution': {
        '0-5': ((master['Age'] >= 0) & (master['Age'] <= 5)).sum(),
        '6-17': ((master['Age'] >= 6) & (master['Age'] <= 17)).sum(),
        '18-59': ((master['Age'] >= 18) & (master['Age'] <= 59)).sum(),
        '60+': (master['Age'] >= 60).sum(),
    },

    'top_localities': master['Locality'].value_counts().head(10).to_dict(),
}

# Save report
pd.DataFrame([report]).to_excel('data/data_quality_report.xlsx')
```

**Output**: `data/data_quality_report.xlsx`

---

### Phase 2B: PDF Analysis

#### Task 1: Analyze Sample PDFs

Manual review of 5-10 sample PDFs to understand:
1. **Document structure**:
   - Header (patient demographics)
   - Visit history section
   - Nurses notes section
   - Doctors notes section
   - Lab results section
   - Medications section

2. **Data fields**:
   - What fields are included?
   - Are there fields NOT in Excel registers?
   - How are dates formatted?
   - How are notes structured?

3. **PDF format**:
   - Text-based PDF (can extract text)?
   - Image-based PDF (would need OCR)?
   - Mixed format?

#### Task 2: PDF Text Extraction (Optional)

If PDFs are text-based and we want to extract structured data:

```python
# scripts/extract-pdf-text.py

import PyPDF2
import pdfplumber
import re
from pathlib import Path

def extract_patient_pdf_data(pdf_path):
    """Extract structured data from patient PDF"""

    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text()

    # Parse patient info
    patient_no_match = re.search(r'Patient No[.:]?\s*([VR\-A01\-AAA\d]+)', full_text)
    patient_no = patient_no_match.group(1) if patient_no_match else None

    # Parse visits (example pattern)
    visits = re.findall(r'(\d{2}-\d{2}-\d{4})\s+([A-Z\s]+)\s+([A-Z][\w\s,]+)', full_text)

    # Parse notes (example pattern)
    nurses_notes = re.findall(r'Nurse Note:\s*([^\n]+)', full_text)
    doctors_notes = re.findall(r'Doctor Note:\s*([^\n]+)', full_text)

    return {
        'patient_no': patient_no,
        'visits': visits,
        'nurses_notes': nurses_notes,
        'doctors_notes': doctors_notes,
        'full_text': full_text
    }

# Test on sample PDFs
sample_pdfs = Path('data/patient-pdfs').glob('*.pdf')
for pdf in list(sample_pdfs)[:5]:  # Test first 5
    data = extract_patient_pdf_data(pdf)
    print(f"\n{pdf.name}:")
    print(f"  Patient: {data['patient_no']}")
    print(f"  Visits: {len(data['visits'])}")
    print(f"  Nurses notes: {len(data['nurses_notes'])}")
    print(f"  Doctors notes: {len(data['doctors_notes'])}")
```

**Decision Point**:
- If PDF extraction works well → Parse all PDFs and import to database
- If PDF extraction is difficult → Store PDFs as-is, provide viewing in interface

**Deliverable**:
- PDF structure documentation
- Sample extracted data
- Decision on PDF processing approach

---

## PHASE 3: SQLite Database Creation (WEEK 3-4)

### Database Schema

```sql
-- Master patient table
CREATE TABLE patients (
    patient_no TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    locality TEXT,
    contact_no TEXT,
    nhis_no TEXT,
    blood_group TEXT,
    first_visit_date DATE,
    last_visit_date DATE,
    total_visits INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OPD visits
CREATE TABLE opd_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    schedule_date DATE,
    patient_status TEXT, -- New/Old Patient
    referral_diagnosis TEXT,
    patient_clinic_status TEXT,
    nhis_status TEXT,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- IPD admissions
CREATE TABLE ipd_admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    date_admission DATE,
    date_discharge DATE,
    specialty TEXT,
    outcome_discharge TEXT,
    principal_diagnosis TEXT,
    additional_diagnosis TEXT,
    surgical_procedure TEXT,
    cost_treatment REAL,
    nhis_status TEXT,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- ANC records
CREATE TABLE anc_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    date_registration DATE,
    parity TEXT,
    blood_pressure TEXT,
    height REAL,
    weight REAL,
    expected_delivery_date DATE,
    blood_group TEXT,
    sickling_status TEXT,
    arv_status TEXT,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- Consultations (Consulting Room)
CREATE TABLE consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    schedule_date DATE,
    contact_no TEXT,
    procedures_requested TEXT,
    tests_requested TEXT,
    test_results TEXT,
    provisional_diagnosis TEXT,
    principal_diagnosis TEXT,
    additional_diagnosis TEXT,
    medicines_prescribed TEXT,
    medicines_dispensed TEXT,
    patient_clinic_status TEXT,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- Lab tests
CREATE TABLE lab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    visit_no TEXT,
    schedule_date DATE,
    clinician_name TEXT,
    diagnosis TEXT,
    specimen_type TEXT,
    test_requested TEXT,
    date_sample_collection DATE,
    pathology_number TEXT,
    nhis_status TEXT,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- ... (Similar tables for 7 remaining registers)

-- PDF records (metadata)
CREATE TABLE patient_pdf_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    pdf_filename TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    file_size_kb REAL,
    extraction_date DATE,
    notes TEXT,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- Clinical notes (if extracting from PDFs)
CREATE TABLE clinical_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT NOT NULL,
    visit_date DATE,
    note_type TEXT, -- 'nurse', 'doctor', 'prescription'
    note_text TEXT,
    author TEXT,
    extracted_from_pdf BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (patient_no) REFERENCES patients(patient_no)
);

-- Create indexes for fast lookups
CREATE INDEX idx_opd_patient ON opd_visits(patient_no);
CREATE INDEX idx_ipd_patient ON ipd_admissions(patient_no);
CREATE INDEX idx_anc_patient ON anc_records(patient_no);
CREATE INDEX idx_consultations_patient ON consultations(patient_no);
CREATE INDEX idx_lab_patient ON lab_tests(patient_no);
CREATE INDEX idx_pdf_patient ON patient_pdf_records(patient_no);
CREATE INDEX idx_notes_patient ON clinical_notes(patient_no);

-- Create view for complete patient history
CREATE VIEW patient_complete_history AS
SELECT
    p.patient_no,
    p.patient_name,
    'OPD' as source,
    o.schedule_date as event_date,
    o.referral_diagnosis as description
FROM patients p
LEFT JOIN opd_visits o ON p.patient_no = o.patient_no
UNION ALL
SELECT
    p.patient_no,
    p.patient_name,
    'IPD' as source,
    i.date_admission as event_date,
    i.principal_diagnosis as description
FROM patients p
LEFT JOIN ipd_admissions i ON p.patient_no = i.patient_no
UNION ALL
SELECT
    p.patient_no,
    p.patient_name,
    'Consultation' as source,
    c.schedule_date as event_date,
    c.principal_diagnosis as description
FROM patients p
LEFT JOIN consultations c ON p.patient_no = c.patient_no
UNION ALL
SELECT
    p.patient_no,
    p.patient_name,
    'Lab Test' as source,
    l.schedule_date as event_date,
    l.test_requested as description
FROM patients p
LEFT JOIN lab_tests l ON p.patient_no = l.patient_no
ORDER BY event_date DESC;
```

### Database Creation Script

```python
# scripts/create-database.py

import sqlite3
from pathlib import Path

DB_PATH = 'data/database/lhims_patients.db'

# Create database directory
Path('data/database').mkdir(parents=True, exist_ok=True)

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Read and execute schema SQL
with open('scripts/database-schema.sql', 'r') as f:
    schema_sql = f.read()
    cursor.executescript(schema_sql)

conn.commit()
conn.close()

print(f"✓ Database created: {DB_PATH}")
```

### Data Import Script

```python
# scripts/import-excel-data.py

import pandas as pd
import sqlite3
import glob
from pathlib import Path
from datetime import datetime

DB_PATH = 'data/database/lhims_patients.db'
conn = sqlite3.connect(DB_PATH)

def import_opd_data():
    """Import OPD register data"""
    files = glob.glob('data/opd-register/*.xlsx')
    total_records = 0

    for file in files:
        print(f"Importing {Path(file).name}...")
        df = pd.read_excel(file, skiprows=5)

        # Clean data
        df['Patient No.'] = df['Patient No.'].str.strip()
        df['Patient Name'] = df['Patient Name'].str.strip().str.replace(r'\s+', ' ', regex=True)

        # Insert into database
        for _, row in df.iterrows():
            cursor.execute('''
                INSERT OR IGNORE INTO opd_visits
                (patient_no, schedule_date, patient_status, referral_diagnosis, nhis_status)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                row['Patient No.'],
                row['Schedule Date'],
                row['Patient Status'],
                row['Referral Diagnosis'],
                row['NHIS Status']
            ))
            total_records += 1

    conn.commit()
    print(f"✓ Imported {total_records} OPD records")

def import_ipd_data():
    """Import IPD register data"""
    # Similar to OPD import
    pass

def import_anc_data():
    """Import ANC register data"""
    # Similar to OPD import
    pass

# ... (import functions for all 12 registers)

def import_pdf_metadata():
    """Import PDF metadata"""
    pdf_files = glob.glob('data/patient-pdfs/*.pdf')

    for pdf_path in pdf_files:
        filename = Path(pdf_path).name
        patient_no = filename.replace('.pdf', '')
        file_size = Path(pdf_path).stat().st_size / 1024  # KB

        cursor.execute('''
            INSERT OR IGNORE INTO patient_pdf_records
            (patient_no, pdf_filename, pdf_path, file_size_kb, extraction_date)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            patient_no,
            filename,
            pdf_path,
            file_size,
            datetime.now().date()
        ))

    conn.commit()
    print(f"✓ Imported {len(pdf_files)} PDF records")

def update_patient_master_table():
    """Consolidate patient info from all registers"""
    cursor.execute('''
        INSERT OR REPLACE INTO patients (patient_no, patient_name, first_visit_date, last_visit_date, total_visits)
        SELECT
            patient_no,
            patient_name,
            MIN(event_date) as first_visit,
            MAX(event_date) as last_visit,
            COUNT(*) as total_visits
        FROM patient_complete_history
        GROUP BY patient_no
    ''')
    conn.commit()
    print("✓ Updated master patient table")

# Run all imports
if __name__ == '__main__':
    import_opd_data()
    import_ipd_data()
    import_anc_data()
    # ... all other imports
    import_pdf_metadata()
    update_patient_master_table()

    conn.close()
    print("\n✓ All data imported successfully!")
```

Run:
```bash
python scripts/create-database.py
python scripts/import-excel-data.py
```

**Deliverable**: `data/database/lhims_patients.db`

---

## PHASE 4: Web Interface (WEEK 4-5)

### Technology: Streamlit (Recommended)

Streamlit is simpler than Flask and perfect for this use case.

```python
# web-interface/app.py

import streamlit as st
import sqlite3
import pandas as pd
from pathlib import Path

# Page config
st.set_page_config(
    page_title="LHIMS Offline Patient Lookup",
    page_icon="🏥",
    layout="wide"
)

# Database connection
DB_PATH = '../data/database/lhims_patients.db'
conn = sqlite3.connect(DB_PATH)

# Title
st.title("🏥 LHIMS Offline Patient Lookup System")
st.markdown("---")

# Status indicator
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Status", "● OFFLINE MODE")
with col2:
    # Count total patients
    total_patients = pd.read_sql("SELECT COUNT(*) as count FROM patients", conn)['count'][0]
    st.metric("Total Patients", f"{total_patients:,}")
with col3:
    st.metric("Last Updated", "2025-11-07")

st.markdown("---")

# Search section
st.subheader("🔍 Search Patient")

search_type = st.radio("Search by:", ["Folder Number", "Patient Name"], horizontal=True)

if search_type == "Folder Number":
    patient_no = st.text_input("Enter Patient Folder Number (e.g., VR-A01-AAA1193)")

    if st.button("Search") and patient_no:
        # Query patient
        query = "SELECT * FROM patients WHERE patient_no = ?"
        patient = pd.read_sql(query, conn, params=(patient_no,))

        if len(patient) > 0:
            # Display patient info
            st.success(f"✓ Patient found: {patient['patient_name'].iloc[0]}")

            # Patient demographics
            st.subheader("📋 Patient Information")
            col1, col2, col3 = st.columns(3)
            with col1:
                st.write(f"**Name:** {patient['patient_name'].iloc[0]}")
                st.write(f"**Folder No:** {patient['patient_no'].iloc[0]}")
            with col2:
                st.write(f"**Age:** {patient['age'].iloc[0]} years")
                st.write(f"**Gender:** {patient['gender'].iloc[0]}")
            with col3:
                st.write(f"**Locality:** {patient['locality'].iloc[0]}")
                st.write(f"**NHIS No:** {patient['nhis_no'].iloc[0] or 'N/A'}")

            st.markdown("---")

            # Quick actions
            st.subheader("⚡ Quick Actions")
            col1, col2, col3 = st.columns(3)

            with col1:
                # Check if PDF exists
                pdf_query = "SELECT * FROM patient_pdf_records WHERE patient_no = ?"
                pdf_record = pd.read_sql(pdf_query, conn, params=(patient_no,))

                if len(pdf_record) > 0:
                    pdf_path = pdf_record['pdf_path'].iloc[0]
                    with open(pdf_path, "rb") as pdf_file:
                        st.download_button(
                            label="📄 Download Complete PDF Record",
                            data=pdf_file,
                            file_name=f"{patient_no}_record.pdf",
                            mime="application/pdf"
                        )
                else:
                    st.info("📄 PDF record not available")

            with col2:
                st.button("🖨️ Print Patient Summary")

            with col3:
                st.button("📊 Export All Data")

            st.markdown("---")

            # Visit timeline
            st.subheader("📅 Visit Timeline (Last 12 Months)")

            history_query = """
                SELECT * FROM patient_complete_history
                WHERE patient_no = ?
                ORDER BY event_date DESC
                LIMIT 50
            """
            history = pd.read_sql(history_query, conn, params=(patient_no,))

            if len(history) > 0:
                for _, visit in history.iterrows():
                    with st.expander(f"{visit['event_date']} - {visit['source']}: {visit['description']}"):
                        st.write(f"**Date:** {visit['event_date']}")
                        st.write(f"**Source:** {visit['source']}")
                        st.write(f"**Details:** {visit['description']}")

                        # Show nurses/doctors notes if available
                        notes_query = """
                            SELECT * FROM clinical_notes
                            WHERE patient_no = ? AND visit_date = ?
                        """
                        notes = pd.read_sql(notes_query, conn, params=(patient_no, visit['event_date']))

                        if len(notes) > 0:
                            st.markdown("**Clinical Notes:**")
                            for _, note in notes.iterrows():
                                st.info(f"**{note['note_type'].upper()}:** {note['note_text']}")
            else:
                st.info("No visit history found")

            st.markdown("---")

            # Register summary
            st.subheader("📊 Register Summary")

            col1, col2 = st.columns(2)

            with col1:
                # OPD visits
                opd_count = pd.read_sql(
                    "SELECT COUNT(*) as count FROM opd_visits WHERE patient_no = ?",
                    conn, params=(patient_no,)
                )['count'][0]
                st.metric("OPD Visits", opd_count)

                # IPD admissions
                ipd_count = pd.read_sql(
                    "SELECT COUNT(*) as count FROM ipd_admissions WHERE patient_no = ?",
                    conn, params=(patient_no,)
                )['count'][0]
                st.metric("IPD Admissions", ipd_count)

                # ANC records
                anc_count = pd.read_sql(
                    "SELECT COUNT(*) as count FROM anc_records WHERE patient_no = ?",
                    conn, params=(patient_no,)
                )['count'][0]
                st.metric("ANC Records", anc_count)

            with col2:
                # Consultations
                cons_count = pd.read_sql(
                    "SELECT COUNT(*) as count FROM consultations WHERE patient_no = ?",
                    conn, params=(patient_no,)
                )['count'][0]
                st.metric("Consultations", cons_count)

                # Lab tests
                lab_count = pd.read_sql(
                    "SELECT COUNT(*) as count FROM lab_tests WHERE patient_no = ?",
                    conn, params=(patient_no,)
                )['count'][0]
                st.metric("Lab Tests", lab_count)

                # Total records
                total = opd_count + ipd_count + anc_count + cons_count + lab_count
                st.metric("Total Records", total)

        else:
            st.error(f"❌ Patient not found: {patient_no}")

else:
    # Search by name
    patient_name = st.text_input("Enter Patient Name")

    if st.button("Search") and patient_name:
        query = "SELECT * FROM patients WHERE patient_name LIKE ?"
        results = pd.read_sql(query, conn, params=(f"%{patient_name}%",))

        if len(results) > 0:
            st.success(f"✓ Found {len(results)} patient(s)")
            st.dataframe(results[['patient_no', 'patient_name', 'age', 'gender', 'locality']])
        else:
            st.error(f"❌ No patients found matching: {patient_name}")
```

Run:
```bash
cd web-interface
streamlit run app.py
```

Access at: `http://localhost:8501`

**Deliverable**: Working web-based patient lookup system

---

## IMMEDIATE NEXT STEPS (THIS WEEK)

### For YOU to do:

#### Day 1-2: Capture PDF Export
1. Open LHIMS with network capture (F12 → Network tab)
2. Search for patient (e.g., VR-A01-AAA1193)
3. Click "Print" or "Export PDF" button
4. Save HAR file: `network-captures/patient-pdf-export.har`
5. Save PDF: `network-captures/sample-patient-record.pdf`
6. Repeat for 2-3 patients
7. Share files with me

#### Day 2-5: Capture Remaining 7 Registers
For each register (Maternity Ward, Admission & Discharge, etc.):
1. Open LHIMS with network capture
2. Navigate to register
3. Select date range (one month)
4. Click "Export to Excel"
5. Save HAR file: `network-captures/[register-name]-export.har`
6. Share with me

### For ME to do:

#### Day 2-3: Analyze Captures
1. Analyze PDF export HAR files
2. Identify PDF generation endpoint
3. Create PDF extraction script
4. Test with sample patients

#### Day 3-4: Create Register Scripts
1. Analyze HAR files for 7 new registers
2. Create extraction scripts for each
3. Test scripts

#### Day 4-7: Run Extractions
1. Extract all 7 remaining registers (full history)
2. Extract PDFs for high-priority patients
3. Verify data completeness

---

## Timeline Summary

| Week | Phase | Key Activities | Deliverable |
|------|-------|----------------|-------------|
| 1 | Data Extraction | YOU: Capture PDFs + registers<br>ME: Create scripts<br>WE: Run extractions | All 12 registers + PDFs |
| 2-3 | Data Consolidation | Clean data, create master patient list, analyze PDFs | Clean datasets, quality report |
| 3-4 | Database Creation | Design schema, import all data, create indexes | lhims_patients.db |
| 4-5 | Web Interface | Build patient lookup system with PDF access | Working web app |
| 5-6 | SPSS Analysis | Export to SPSS, create analysis templates | Statistical reports |
| 6-7 | Training & Deployment | Documentation, training, deployment | Operational system |
| Ongoing | Maintenance | Monthly updates, backups, support | Continuously updated system |

---

## Success Criteria

✅ All 12 register types extracted (Jan 2023 - current)
✅ PDF patient records captured for high-priority patients
✅ SQLite database created with all data
✅ Web interface provides <2 second patient lookups
✅ PDF records accessible through interface
✅ System works completely offline
✅ Health workers trained and confident using system
✅ Backup procedures established and documented

---

## Contact & Support

**Project Lead**: [Your Name]
**Technical Support**: Available during implementation
**Health Worker Training**: Week 6-7
**Go-Live Date**: End of Week 7

---

**NEXT ACTION**:

Please capture the PDF export workflow (with network traffic) for 2-3 patients and share the HAR files + sample PDFs so I can analyze and create the extraction script.

**Estimated time**: 30 minutes to capture PDFs

Let me know when you're ready to start!
