# Quick Start: Patient JSON Data Extraction

Extract complete patient records as structured JSON files for database import.

---

## What You'll Get

For each patient, the script extracts:
- ✅ **Admissions** (IPD) - All hospital admissions with notes
- ✅ **Consultations** (OPD) - All outpatient visits
- ✅ **Prescriptions** - All medications prescribed
- ✅ **Lab Results** - All laboratory test results
- ✅ **Vaccinations** - Immunization records
- ✅ **Attachments** - Metadata of uploaded files (scans, reports)

**Output**: Structured JSON files ready for database import!

---

## Step 1: Add Patient Numbers

Edit [patient-list.txt](patient-list.txt) and add patient numbers (one per line):

```
VR-A01-AAA2142
VR-A01-AAA2143
VR-A01-AAA2144
VR-A01-AAA2145
```

**Tip**: You can generate this list from your OPD register Excel files.

---

## Step 2: Run the Extraction

```bash
npm run extract:patients
```

That's it! The script will:
1. Login to LHIMS
2. Extract data for each patient
3. Save JSON files to: `data/patient-json/`

---

## What Happens

```
[1/3] Launching browser...
[2/3] Logging into LHIMS...
✓ Login successful

[3/3] Extracting patient data...
======================================================================

[1/4] Patient: VR-A01-AAA2142
  [1/7] Searching patient...
      → Patient ID: 2239
  [2/7] Extracting admissions...
      → 2 admissions
  [3/7] Extracting prescriptions...
      → 15 prescriptions
  [4/7] Extracting lab results...
      → 8 lab results
  [5/7] Extracting vaccinations...
      → 0 vaccinations
  [6/7] Extracting attachments...
      → 0 attachments
  [7/7] Extracting consultations...
      → 12 consultations
✓ Complete: VR-A01-AAA2142

...
```

---

## Output Structure

```
data/patient-json/
├── VR-A01-AAA2142/
│   ├── admissions.json          ← All IPD admissions
│   ├── consultations.json       ← All OPD visits
│   ├── prescriptions.json       ← All medications
│   ├── lab_results.json         ← All lab tests
│   ├── vaccinations.json        ← Immunizations
│   ├── attachments.json         ← File metadata
│   └── _metadata.json           ← Extraction summary
├── VR-A01-AAA2143/
│   └── ...
└── VR-A01-AAA2144/
    └── ...
```

---

## Performance

- **Speed**: ~3-5 seconds per patient
- **1,000 patients**: ~1-1.5 hours
- **Storage**: ~50-100 KB per patient (~100 MB for 1,000 patients)

---

## Sample JSON Output

### admissions.json
```json
[
  {
    "admit_id": "22362",
    "visit_no": "ADMT-22362",
    "patient_id": "2239",
    "bed_id": "113",
    "admit_date": "2025-08-30",
    "bed_from_date": "2025-08-30 15:17:00",
    "chief_complaint": "LAP, WAIST PAIN",
    "admit_notes": "ADMISSION: Client walked into the ward...",
    "attending_doctor": "14",
    "duty_doctor": "1108",
    ...
  }
]
```

### consultations.json
```json
[
  [
    1,
    "30-08-2025",
    "OBSTETRICS AND GYNAECOLOGY",
    "ANTENATAL / POSTNATAL CLINIC",
    ...
  ]
]
```

### prescriptions.json
```json
[
  {
    "prescription_id": "12345",
    "medication": "Paracetamol 500mg",
    "dosage": "2 tablets",
    "frequency": "3 times daily",
    "duration": "7 days",
    ...
  }
]
```

---

## Next Steps: Create Database

Once you have JSON files, you can:

### 1. Import to SQLite Database

```python
import json
import sqlite3

# Load patient data
with open('data/patient-json/VR-A01-AAA2142/admissions.json') as f:
    admissions = json.load(f)

# Insert into database
conn = sqlite3.connect('lhims_patients.db')
for adm in admissions:
    conn.execute("""
        INSERT INTO admissions (admit_id, patient_id, admit_date, chief_complaint)
        VALUES (?, ?, ?, ?)
    """, (adm['admit_id'], adm['patient_id'], adm['admit_date'], adm['chief_complaint']))
conn.commit()
```

### 2. Build Web Interface

Create a Streamlit/Flask app for instant patient lookups:
- Search by patient number
- View complete medical history
- Query by date, diagnosis, medication
- Works completely offline

---

## Troubleshooting

### Error: "Patient not found"
- Check patient number format: `VR-A01-AAANNNN`
- Verify patient exists in LHIMS
- Patient may have different format or clinic code

### Error: "Session expired"
- Script automatically re-logs in
- If it persists, check credentials in script

### Empty JSON files
- Patient may have no data for that category
- Check `_metadata.json` for extraction summary

---

## Advantages Over PDF

| Feature | JSON | PDF |
|---------|------|-----|
| Speed | ✅ 3s/patient | ❌ 15s/patient |
| Size | ✅ 100 KB | ❌ 2 MB |
| Database | ✅ Direct import | ❌ Requires parsing |
| Search | ✅ Any field | ❌ Text only |
| Queries | ✅ Instant | ❌ Slow |

---

## Comparison with Register Extraction

### Register Extraction (Current):
- Extracts Excel files by date range
- All patients in one file
- Monthly files

### Patient JSON Extraction (New):
- Extracts by individual patient
- Complete patient history
- One folder per patient
- Database-ready format

**Both methods are complementary!**
- Use registers for historical data mining
- Use patient JSON for individual patient lookups

---

## Security Notes

⚠️ **Patient data is sensitive!**

The extracted JSON files contain:
- Patient identifiers
- Medical history
- Prescriptions
- Lab results

**Protected by .gitignore**:
- `data/patient-json/` - excluded from git
- `patient-list.txt` - excluded from git

**Never commit**:
- Patient data files
- Patient lists
- Database files

---

## What's Next?

After extracting patient data:

1. **Week 1**: Extract JSON for all patients
2. **Week 2**: Create SQLite database
3. **Week 3**: Build web interface
4. **Week 4**: Deploy offline patient lookup system

**Goal**: Health workers can search patient records instantly when LHIMS is down!

---

## Ready to Start?

1. Add patient numbers to [patient-list.txt](patient-list.txt)
2. Run: `npm run extract:patients`
3. Check output in: `data/patient-json/`

**Estimated time**: 1-1.5 hours for 1,000 patients

Let the extraction begin! 🚀
