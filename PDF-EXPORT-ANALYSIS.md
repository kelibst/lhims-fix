# LHIMS PDF Patient Record Export - Network Analysis

**Analysis Date**: November 8, 2025
**Patient Sample**: VR-A01-AAA2142
**HAR File**: network-captures/patient-pdf-export-2025-11-08.har

---

## Summary

Successfully reverse-engineered the LHIMS PDF patient record export workflow. The system uses a multi-step process to generate and deliver patient PDFs with JWT token authentication.

---

## Complete Workflow

### Step 1: Search for Patient
**Endpoint**: `http://10.10.0.59/lhims_182/searchPatientResult.php`
**Method**: POST
**Purpose**: Find patient by folder number

**POST Parameters**:
```
fnam: (empty - first name search)
pregno: VR-A01-AAA2142 (patient folder number)
InputPatientClinicSrting: (empty)
InputPatientClinic: (empty)
area: (empty)
iPatientID: (empty or patient ID if known)
```

**Response**: Returns patient search results with internal patient ID

---

### Step 2: Load Patient Record Page
**Endpoint**: `http://10.10.0.59/lhims_182/patientRecord.php?patient_id=2239`
**Method**: GET
**Purpose**: Load patient record interface

**URL Parameters**:
- `patient_id`: Internal LHIMS patient ID (e.g., 2239)

**Note**: This page loads multiple AJAX calls to fetch:
- Patient demographics
- All consultations/visits
- IPD admissions
- Lab results
- Prescriptions
- Vital signs
- Attachments
- etc.

---

### Step 3: Request PDF Export
**Endpoint**: `http://10.10.0.59/lhims_182/exportServiceReportsInSinglePDF.php`
**Method**: POST
**Purpose**: Generate PDF from patient consultation data

**POST Parameters** (URL-encoded):
```
_isAjax: true
aConsultationID[]: 538175
aConsultationID[]: 538199
aConsultationID[]: 188980
... (array of all consultation IDs)
aServiceID[]: 332
aServiceID[]: 411
aServiceID[]: 368
... (array of corresponding service IDs)
iStaffClinicID: 2
iLoggedInStaffID: 411
iPatientID: 2239
bPrintAllPrintableEntities: true
```

**Key Parameters Explained**:
- `aConsultationID[]`: Array of consultation/visit IDs for this patient
- `aServiceID[]`: Array of service type IDs (OPD, IPD, etc.) - one per consultation
- `iPatientID`: Internal LHIMS patient ID
- `iStaffClinicID`: Logged-in user's clinic ID
- `iLoggedInStaffID`: Logged-in user's staff ID
- `bPrintAllPrintableEntities`: true = include all visit data in PDF

**Response**: Base64-encoded JWT token
```
ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnRiMlIxYkdVaU9pSkZTRklpLCJzZXNz...
```

**Decoded JWT Token**:
```json
{
  "module": "EHR",
  "session_required": true,
  "session_user_id_required": 411,
  "sPath": "pdf/service/VR-A01-AAA2142_08_11_2025_14f12c551e4cfa83db6c6b7be0ddb5de.pdf",
  "fileName": "VR-A01-AAA2142_08_11_2025_14f12c551e4cfa83db6c6b7be0ddb5de.pdf",
  "iat": 1762610620,
  "nbf": 1762610620,
  "exp": 1762612420
}
```

**Token Expiry**: 30 minutes (1800 seconds)

---

### Step 4: Download PDF
**Endpoint**: `http://10.10.0.59/lhims_182/viewFile.php?token=[JWT_TOKEN]`
**Method**: GET
**Purpose**: Download the generated PDF using the JWT token

**URL Parameters**:
- `token`: The JWT token received from step 3

**Response**: PDF file (binary)

---

## Critical Requirements for Automation

### 1. Must Get Consultation IDs
**Problem**: The PDF export requires ALL consultation IDs for the patient.

**Solution**: These consultation IDs are loaded by the patient record page via AJAX calls. We need to:
1. Navigate to `patientRecord.php?patient_id=[ID]`
2. Intercept the AJAX response that contains consultation data
3. Extract the consultation IDs and service IDs

**Likely AJAX Endpoint** (needs verification):
- `ajaxPatientServices.php?sFlag=fGetServiceForPatient`
- `getDynamicPatientEncounterDetails.php`
- Or similar

### 2. Must Map Patient No. to Internal Patient ID
**Challenge**: We have patient folder numbers (VR-A01-AAA2142), but LHIMS uses internal IDs (2239).

**Solution Options**:
- **Option A**: Search each patient using `searchPatientResult.php` and extract patient_id from response
- **Option B**: Navigate to patient record page and extract from URL/page content
- **Option C**: Use OPD/IPD register data if it contains both folder numbers and internal IDs

### 3. Session Management
The entire workflow requires:
- Valid PHPSESSID cookie
- Active session (verified by JWT token `session_required: true`)
- Session user ID must match logged-in user (411 in this case)

---

## Automation Strategy

### Approach 1: Full Workflow Automation (RECOMMENDED)
Replicate the complete user workflow:

```javascript
1. Login to LHIMS
2. For each patient folder number:
   a. Search patient (searchPatientResult.php)
   b. Extract internal patient_id
   c. Navigate to patientRecord.php?patient_id=[ID]
   d. Wait for page to load all AJAX data
   e. Extract consultation IDs from page/AJAX responses
   f. POST to exportServiceReportsInSinglePDF.php with all consultation IDs
   g. Decode JWT token from response
   h. Download PDF from viewFile.php?token=[TOKEN]
   i. Save PDF to data/patient-pdfs/[PATIENT_NO].pdf
```

**Pros**:
- Most reliable - follows exact user workflow
- Guaranteed to work like manual process
- Handles all edge cases

**Cons**:
- Slower (need to load each patient record page)
- More complex (must extract consultation IDs)

---

### Approach 2: Simplified Workflow (IF POSSIBLE)
Skip patient record page and use fixed parameters:

```javascript
1. Login to LHIMS
2. For each patient:
   a. Search patient (get patient_id)
   b. Try POST to exportServiceReportsInSinglePDF.php with minimal params:
      - iPatientID: [ID]
      - bPrintAllPrintableEntities: true
      - Skip consultation ID arrays?
   c. If successful, download PDF
```

**Pros**:
- Much faster
- Simpler script

**Cons**:
- May not work (consultation IDs might be required)
- Need to test if LHIMS accepts empty consultation arrays

---

## Next Steps

### Immediate (Before Next Capture)
1. Ask user to check Downloads folder for the PDF file
2. Have user move it to: `network-captures/patient-record-VR-A01-AAA2142.pdf`
3. Examine PDF content to understand what data it contains

### Short-term (Script Development)
1. **Test Simplified Approach First**:
   - Create test script that tries PDF export with minimal parameters
   - If it works, great! If not, fall back to full workflow

2. **Implement Full Workflow**:
   - Search patient endpoint
   - Extract internal patient ID
   - Navigate to patient record page
   - Extract consultation IDs (inspect AJAX calls to find which endpoint provides them)
   - Generate PDF
   - Download PDF

3. **Handle Edge Cases**:
   - Patients with no consultations
   - Session timeout during batch processing
   - JWT token expiry (30 min limit)
   - Large PDFs (file size)

---

## Sample Code Structure

```javascript
async function extractPatientPDF(patientNo) {
  // Step 1: Search patient
  const patientId = await searchPatient(patientNo);

  // Step 2: Get consultation IDs (two approaches to try)
  let consultationIds = [];

  // Approach A: Navigate to patient record and scrape
  consultationIds = await getConsultationIdsFromPatientRecord(patientId);

  // Approach B (fallback): Try without consultation IDs
  if (consultationIds.length === 0) {
    console.log('Trying simplified PDF export...');
  }

  // Step 3: Request PDF export
  const jwtToken = await requestPDFExport(patientId, consultationIds);

  // Step 4: Download PDF
  const pdfPath = await downloadPDF(jwtToken, patientNo);

  return pdfPath;
}

async function searchPatient(patientNo) {
  const response = await page.evaluate(async (patientNo) => {
    const formData = new FormData();
    formData.append('pregno', patientNo);
    // ... other params

    const res = await fetch('http://10.10.0.59/lhims_182/searchPatientResult.php', {
      method: 'POST',
      body: formData
    });

    return await res.text();
  }, patientNo);

  // Parse response to extract patient_id
  // This might be in HTML or JSON format - need to inspect actual response
  const patientId = parsePatientIdFromResponse(response);
  return patientId;
}

async function getConsultationIdsFromPatientRecord(patientId) {
  // Navigate to patient record page
  await page.goto(`http://10.10.0.59/lhims_182/patientRecord.php?patient_id=${patientId}`);

  // Wait for AJAX calls to complete
  await page.waitForTimeout(5000);

  // Extract consultation IDs from page or intercept AJAX responses
  // Need to inspect the actual page/AJAX to determine exact method

  return consultationIds;
}

async function requestPDFExport(patientId, consultationIds) {
  const postData = new URLSearchParams();
  postData.append('_isAjax', 'true');
  postData.append('iPatientID', patientId);
  postData.append('bPrintAllPrintableEntities', 'true');
  postData.append('iStaffClinicID', '2');
  postData.append('iLoggedInStaffID', '411');

  // Add consultation IDs if available
  consultationIds.forEach(id => {
    postData.append('aConsultationID[]', id);
  });

  const response = await page.evaluate(async (postData) => {
    const res = await fetch('http://10.10.0.59/lhims_182/exportServiceReportsInSinglePDF.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postData
    });
    return await res.text();
  }, postData.toString());

  // Decode base64 to get JWT token
  const jwtToken = Buffer.from(response, 'base64').toString('utf8');
  return jwtToken;
}

async function downloadPDF(jwtToken, patientNo) {
  const downloadUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${jwtToken}`;
  const pdfPath = path.join(__dirname, '..', 'data', 'patient-pdfs', `${patientNo}.pdf`);

  // Download PDF file
  const download = await page.goto(downloadUrl);
  const buffer = await download.buffer();

  fs.writeFileSync(pdfPath, buffer);
  return pdfPath;
}
```

---

## Open Questions

1. **Consultation IDs Source**: Which AJAX endpoint provides the consultation IDs?
   - Need to inspect network traffic on patient record page
   - Or scrape from the patient record page HTML

2. **Can We Skip Consultation IDs?**: Does the endpoint accept `bPrintAllPrintableEntities=true` without explicit consultation ID arrays?
   - Needs testing with a simple script

3. **Patient ID Mapping**: What's the best way to map patient folder numbers to internal IDs?
   - Search endpoint response format?
   - Database table available?
   - Extract from OPD/IPD register data?

4. **Batch Processing Limits**:
   - How many PDFs can we generate before session times out?
   - JWT tokens expire in 30 minutes - do we need to download immediately?
   - Should we generate all PDFs first, then download? Or generate+download one at a time?

---

## Security Notes

**JWT Token Details**:
- Algorithm: HS256 (HMAC with SHA-256)
- Expiry: 30 minutes from generation
- Session validation: Requires matching user ID (411)
- File path embedded in token

**Implications for Automation**:
- Must maintain active session throughout batch processing
- Must download PDFs within 30 minutes of generating token
- Cannot reuse tokens across sessions or users

---

## Files Generated

**Expected Output Structure**:
```
data/patient-pdfs/
├── VR-A01-AAA2142.pdf
├── VR-A01-AAA2143.pdf
├── VR-A01-AAA2144.pdf
└── ... (1,000-2,000 PDFs)
```

**PDF Filename Pattern** (server-side):
```
VR-A01-AAA2142_08_11_2025_14f12c551e4cfa83db6c6b7be0ddb5de.pdf
[PATIENT_NO]_[DATE]_[HASH].pdf
```

**Our Naming** (client-side):
```
VR-A01-AAA2142.pdf
[PATIENT_NO].pdf
```

---

## Success Metrics

After implementation, we should achieve:
- 95%+ success rate for PDF generation
- 1 PDF every 5-10 seconds (accounting for page loads)
- Complete dataset: 1,000-2,000 patient PDFs in 2-4 hours
- File size: ~500 KB - 2 MB per PDF (estimated)
- Total storage: 500 MB - 4 GB (estimated)

---

**Status**: Ready for script implementation
**Next Action**: Create `scripts/extract-patient-pdfs.js` with automated PDF extraction
