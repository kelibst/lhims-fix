# LHIMS IPD Admission Summary Export - Network Analysis

**Analysis Date**: November 8, 2025
**Patient Sample**: VR-A01-AAA2142 (Internal ID: 2239)
**Admissions Captured**: 2 (admit_id: 22362, 657)
**HAR File**: network-captures/patient-pdf-export-2025-11-08.har

---

## Summary

Successfully reverse-engineered the LHIMS IPD admission summary PDF export workflow. Unlike OPD export (which uses JWT tokens), IPD admission exports return **direct PDF files** in a single request.

---

## Complete Workflow

### Step 1: Get All Patient Admissions
**Endpoint**: `http://10.10.0.59/lhims_182/ajaxIPDManager.php?sFlag=patientAllAdmitDetails&_isAjax=true&iPatientID=2239`
**Method**: GET
**Purpose**: Retrieve list of all admissions for a patient

**URL Parameters**:
```
sFlag: patientAllAdmitDetails
_isAjax: true
iPatientID: 2239 (internal LHIMS patient ID)
```

**Response**: JSON array of admission objects

**Sample Response**:
```json
[
  {
    "id": "37128",
    "admit_id": "22362",
    "visit_no": "ADMT-22362",
    "bed_id": "113",
    "admit_date": "2025-08-30",
    "bed_from_date": "2025-08-30 15:17:00",
    "chief_complaint": "LAP, WAIST PAIN",
    "admit_notes": "ADMISSION: Client walked into...",
    ...
  },
  {
    "admit_id": "657",
    "visit_no": "ADMT-657",
    "bed_id": "142",
    "admit_date": "2023-02-25",
    ...
  }
]
```

**Key Fields**:
- `admit_id`: The admission ID needed for PDF export
- `visit_no`: Admission visit number (format: ADMT-[ID])
- `bed_id`: Bed ID at admission
- `admit_date`: Date of admission (YYYY-MM-DD)
- `bed_from_date`: Full admission timestamp (includes time)

---

### Step 2: Export Admission Summary PDF
**Endpoint**: `http://10.10.0.59/lhims_182/exportAdmissionSummaryPDF.php`
**Method**: POST
**Purpose**: Generate and download PDF for a single admission

**POST Parameters** (for all fields selected):
```
idExportAdmissionSummaryAdmitID: 22362
idExportAdmissionSummaryPatientID: 2239
idExportAdmissionSummaryBedID: 113
idExportAdmissionSummaryVisitNo: ADMT-22362
idExportAdmissionSummaryAdmitDate: 30-08-2025
idExportAdmissionSummaryAdmitTime: 15:17:00
idExportAdmissionSummaryTreatmentDetails: 1
idExportAdmissionSummaryRecommendation: 6
idExportAdmissionSummaryPrescription: 3
idExportAdmissionSummaryVitals: 4
idExportAdmissionSummaryDoctorNurseNotes: 7
idExportAdmissionSummaryChiefComplaints: 10
idExportAdmissionSummaryAdditionalServices: 11
idExportAdmissionSummaryDiagnosis: 12
idExportAdmissionSummaryOperations: 13
idExportAdmissionSummaryFluidMonitoring: 14
idExportAdmissionSummaryDiet: 15
idExportAdmissionSummaryClinicalNotes: 16
```

**Parameter Breakdown**:

**Required Parameters** (admission identification):
- `idExportAdmissionSummaryAdmitID`: Admission ID (from step 1)
- `idExportAdmissionSummaryPatientID`: Patient ID
- `idExportAdmissionSummaryBedID`: Bed ID
- `idExportAdmissionSummaryVisitNo`: Visit number (ADMT-XXX)
- `idExportAdmissionSummaryAdmitDate`: Admission date (DD-MM-YYYY format)
- `idExportAdmissionSummaryAdmitTime`: Admission time (HH:MM:SS)

**Field Selection Parameters** (what to include in PDF):
Each field has a numeric ID (seems to be display order):
- `TreatmentDetails`: 1
- `Prescription`: 3
- `Vitals`: 4
- `Recommendation`: 6
- `DoctorNurseNotes`: 7
- `ChiefComplaints`: 10
- `AdditionalServices`: 11
- `Diagnosis`: 12
- `Operations`: 13
- `FluidMonitoring`: 14
- `Diet`: 15
- `ClinicalNotes`: 16

**Response**: Direct PDF file (Content-Type: application/pdf)

---

## Complete Automation Workflow

For each patient, we need to extract **TWO types of PDFs**:

### Type 1: OPD Summary (All Outpatient Visits)
See [PDF-EXPORT-ANALYSIS.md](PDF-EXPORT-ANALYSIS.md) for details.

**Endpoint**: `exportServiceReportsInSinglePDF.php`
**Result**: Single PDF with all OPD consultations
**Filename**: `{PATIENT_NO}_OPD.pdf`

---

### Type 2: IPD Admission Summaries (One per Admission)
**Process**:
1. Get all admissions for patient
2. For each admission, export separate PDF
3. Save with admission ID in filename

**Result**: Multiple PDFs (one per admission)
**Filenames**:
- `{PATIENT_NO}_IPD_{ADMIT_ID}.pdf`
- Example: `VR-A01-AAA2142_IPD_22362.pdf`

---

## Implementation Strategy

```javascript
async function extractAllPatientPDFs(patientNo) {
  console.log(`Extracting PDFs for patient: ${patientNo}`);

  // Step 1: Search patient and get internal ID
  const patientId = await searchPatient(patientNo);
  console.log(`  Internal patient ID: ${patientId}`);

  // Step 2: Export OPD Summary PDF
  console.log(`  Exporting OPD summary...`);
  const opdPdf = await exportOPDSummary(patientId);
  await savePDF(opdPdf, `${patientNo}_OPD.pdf`);
  console.log(`  ✓ OPD summary saved`);

  // Step 3: Get all admissions
  const admissions = await getPatientAdmissions(patientId);
  console.log(`  Found ${admissions.length} admissions`);

  // Step 4: Export each admission summary
  for (const admission of admissions) {
    console.log(`  Exporting admission ${admission.visit_no}...`);
    const ipdPdf = await exportAdmissionSummary(admission);
    await savePDF(ipdPdf, `${patientNo}_IPD_${admission.admit_id}.pdf`);
    console.log(`  ✓ Admission ${admission.admit_id} saved`);
  }

  console.log(`✓ Complete: ${admissions.length + 1} PDFs extracted for ${patientNo}`);
}

async function getPatientAdmissions(patientId) {
  const url = `http://10.10.0.59/lhims_182/ajaxIPDManager.php?sFlag=patientAllAdmitDetails&_isAjax=true&iPatientID=${patientId}`;

  const response = await page.evaluate(async (url) => {
    const res = await fetch(url);
    return await res.json();
  }, url);

  return response; // Array of admission objects
}

async function exportAdmissionSummary(admission) {
  // Extract time from bed_from_date (format: "2025-08-30 15:17:00")
  const admitTime = admission.bed_from_date.split(' ')[1];

  // Convert date from YYYY-MM-DD to DD-MM-YYYY
  const [year, month, day] = admission.admit_date.split('-');
  const admitDate = `${day}-${month}-${year}`;

  // Build POST data with ALL fields selected
  const postData = new URLSearchParams();
  postData.append('idExportAdmissionSummaryAdmitID', admission.admit_id);
  postData.append('idExportAdmissionSummaryPatientID', admission.patient_id || patientId);
  postData.append('idExportAdmissionSummaryBedID', admission.bed_id);
  postData.append('idExportAdmissionSummaryVisitNo', admission.visit_no);
  postData.append('idExportAdmissionSummaryAdmitDate', admitDate);
  postData.append('idExportAdmissionSummaryAdmitTime', admitTime);

  // Add all field selections (include everything)
  postData.append('idExportAdmissionSummaryTreatmentDetails', '1');
  postData.append('idExportAdmissionSummaryRecommendation', '6');
  postData.append('idExportAdmissionSummaryPrescription', '3');
  postData.append('idExportAdmissionSummaryVitals', '4');
  postData.append('idExportAdmissionSummaryDoctorNurseNotes', '7');
  postData.append('idExportAdmissionSummaryChiefComplaints', '10');
  postData.append('idExportAdmissionSummaryAdditionalServices', '11');
  postData.append('idExportAdmissionSummaryDiagnosis', '12');
  postData.append('idExportAdmissionSummaryOperations', '13');
  postData.append('idExportAdmissionSummaryFluidMonitoring', '14');
  postData.append('idExportAdmissionSummaryDiet', '15');
  postData.append('idExportAdmissionSummaryClinicalNotes', '16');

  // Make POST request
  const response = await page.evaluate(async (postDataString) => {
    const res = await fetch('http://10.10.0.59/lhims_182/exportAdmissionSummaryPDF.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postDataString
    });

    // Response is direct PDF, convert to base64 for transfer
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }, postData.toString());

  // Convert base64 back to buffer
  const base64Data = response.split(',')[1];
  return Buffer.from(base64Data, 'base64');
}

async function savePDF(pdfBuffer, filename) {
  const pdfPath = path.join(__dirname, '..', 'data', 'patient-pdfs', filename);
  fs.writeFileSync(pdfPath, pdfBuffer);
  return pdfPath;
}
```

---

## Expected Output Structure

For a patient with 2 admissions:

```
data/patient-pdfs/
├── VR-A01-AAA2142_OPD.pdf              (all OPD visits)
├── VR-A01-AAA2142_IPD_22362.pdf        (admission 1)
└── VR-A01-AAA2142_IPD_657.pdf          (admission 2)
```

For 1,000 patients (average 1.5 admissions per patient):

```
data/patient-pdfs/
├── 1,000 OPD PDFs (~500 KB - 2 MB each)
├── 1,500 IPD PDFs (~200 KB - 1 MB each)
└── Total: 2,500 PDFs, ~2-4 GB storage
```

---

## Key Differences: OPD vs IPD Exports

| Feature | OPD Summary | IPD Admission Summary |
|---------|-------------|------------------------|
| Endpoint | `exportServiceReportsInSinglePDF.php` | `exportAdmissionSummaryPDF.php` |
| Response | JWT token → download PDF | Direct PDF |
| Scope | All OPD visits | Single admission |
| Per Patient | 1 PDF | Multiple PDFs (1 per admission) |
| Field Selection | Automatic (all visits) | Manual (checkboxes/params) |
| Date Format | N/A | DD-MM-YYYY (convert from YYYY-MM-DD) |

---

## Automation Advantages

### OPD Export:
- **Pro**: Single PDF per patient (fewer files)
- **Con**: Two-step process (get token → download PDF)
- **Con**: JWT expires in 30 minutes

### IPD Export:
- **Pro**: Direct PDF download (simpler)
- **Pro**: No token expiry issues
- **Con**: Multiple PDFs per patient (more files)
- **Con**: Need to loop through all admissions

---

## Critical Requirements

### 1. Date Format Conversion
**Input** (from JSON): `2025-08-30` (YYYY-MM-DD)
**Output** (for POST): `30-08-2025` (DD-MM-YYYY)

```javascript
const [year, month, day] = admission.admit_date.split('-');
const formattedDate = `${day}-${month}-${year}`;
```

### 2. Time Extraction
**Input** (from JSON): `2025-08-30 15:17:00`
**Output** (for POST): `15:17:00`

```javascript
const admitTime = admission.bed_from_date.split(' ')[1];
```

### 3. Field Selection
Always include ALL fields (16 parameters) to get complete admission summary:
- TreatmentDetails (1)
- Prescription (3)
- Vitals (4)
- Recommendation (6)
- DoctorNurseNotes (7)
- ChiefComplaints (10)
- AdditionalServices (11)
- Diagnosis (12)
- Operations (13)
- FluidMonitoring (14)
- Diet (15)
- ClinicalNotes (16)

**Note**: The numeric values (1, 3, 4, 6, 7, etc.) appear to be display order IDs, not boolean flags.

---

## Error Handling

### Patient with No Admissions
```javascript
const admissions = await getPatientAdmissions(patientId);
if (admissions.length === 0) {
  console.log(`  No IPD admissions found for patient ${patientNo}`);
  // Skip IPD export, only export OPD PDF
}
```

### Session Timeout
- Use same session management as register extraction
- Auto re-login if session expires
- Implement retry logic with backoff

### Large PDFs
- Some admission PDFs may be large (multiple operations, long notes)
- Implement timeout handling (increase from default 30s to 60s for PDF generation)

---

## Performance Estimates

**Per Patient**:
- Search patient: 1-2 seconds
- Get admissions: 1 second
- Export OPD PDF: 3-5 seconds
- Export each IPD PDF: 2-3 seconds
- **Total**: ~8-15 seconds per patient (depending on number of admissions)

**Batch Processing (1,000 patients)**:
- Estimated time: 2-4 hours
- Average: 10 seconds × 1,000 = ~3 hours
- With session refresh and retries: ~4 hours

**Storage**:
- OPD PDFs: 1,000 × 1 MB = 1 GB
- IPD PDFs: 1,500 × 500 KB = 750 MB
- **Total**: ~2 GB for 1,000 patients

---

## Next Steps

1. **Create extraction script**: `scripts/extract-patient-pdfs.js`
2. **Test with 5-10 patients** to verify:
   - PDF quality and completeness
   - All fields are included
   - Filenames are correct
   - Session management works
3. **Run full extraction** for priority patients
4. **Verify PDFs** can be opened and contain expected data

---

## Sample Patient Data (VR-A01-AAA2142)

**Internal ID**: 2239

**Admissions**:
1. **Admission 22362**:
   - Visit: ADMT-22362
   - Date: August 30, 2025 at 15:17:00
   - Bed: 113
   - Complaint: LAP, WAIST PAIN

2. **Admission 657**:
   - Visit: ADMT-657
   - Date: February 25, 2023 at 23:34:27
   - Bed: 142
   - Complaint: lower abdominal pain

**Expected PDFs**:
- `VR-A01-AAA2142_OPD.pdf`
- `VR-A01-AAA2142_IPD_22362.pdf`
- `VR-A01-AAA2142_IPD_657.pdf`

---

**Status**: Ready for script implementation
**Next Action**: Create combined OPD + IPD PDF extraction script
