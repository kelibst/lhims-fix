# LHIMS Patient PDF Extraction Guide

## Overview

This script automatically extracts PDF records for all patients in your master patient list. The PDFs can be attached to patient biodata and accessed via clickable links in your patient lookup system.

## Quick Start

### Option 1: Extract All Patients (Recommended)

```bash
node scripts/extract-patient-pdf.js
```

This will extract PDFs for all patients in `master-patient-list.txt`.

### Option 2: Extract Test Patients First

```bash
node scripts/extract-patient-pdf.js test-pdf-extraction.txt
```

This uses the test patient list (3 patients) to verify everything works.

### Option 3: Use Batch File (Windows)

Double-click `run-pdf-extraction.bat` or run:

```bash
run-pdf-extraction.bat
```

## What the Script Does

For each patient in your list, the script will:

1. **Login to LHIMS** using your credentials
2. **Search for the patient** by their patient number
3. **Navigate to their patient record page**
4. **Generate and download the PDF** of their complete record
5. **Save the PDF** as `data/patient-pdfs/[PATIENT-NO].pdf`
6. **Track progress** so you can resume if interrupted
7. **Log any errors** to `pdf-extraction-errors.log`

## Output Structure

```
data/patient-pdfs/
├── VR-A01-AAA0001.pdf
├── VR-A01-AAA0002.pdf
├── VR-A01-AAA2142.pdf
├── AB-A01-AAB9293.pdf
└── ... (70,000+ patient PDFs)
```

Each PDF is named with the exact patient number, making it easy to reference.

## Resume Capability

The script automatically tracks progress in `pdf-extraction-progress.json`:

```json
{
  "completed": ["VR-A01-AAA0001", "VR-A01-AAA0002"],
  "failed": ["VR-A01-AAA9999"],
  "lastUpdate": "2025-11-10T10:30:00.000Z"
}
```

**Benefits:**
- If the script crashes or you stop it, running it again will skip already-extracted patients
- Failed patients are tracked and can be retried
- You can monitor progress in real-time

## Integration with Patient Biodata

Once PDFs are extracted, you can reference them in your patient lookup system:

### Example HTML Integration

```html
<a href="file:///c:/Users/Kelib/Desktop/projects/lhims-fix/data/patient-pdfs/VR-A01-AAA0001.pdf" target="_blank">
  View Patient PDF
</a>
```

### Example Database Integration

```sql
-- Add PDF path to patient records
UPDATE patients
SET pdf_path = 'data/patient-pdfs/' || patient_no || '.pdf'
WHERE patient_no IS NOT NULL;

-- Query to generate PDF link
SELECT
  patient_no,
  patient_name,
  'data/patient-pdfs/' || patient_no || '.pdf' as pdf_link
FROM patients;
```

### Example JavaScript/Node.js Integration

```javascript
function getPatientPDFPath(patientNo) {
  const pdfPath = path.join(__dirname, 'data', 'patient-pdfs', `${patientNo}.pdf`);

  if (fs.existsSync(pdfPath)) {
    return pdfPath;
  }

  return null; // PDF not available
}

// Check if patient has PDF
const pdfPath = getPatientPDFPath('VR-A01-AAA0001');
if (pdfPath) {
  console.log(`PDF available: ${pdfPath}`);
}
```

## Monitoring Progress

### Check How Many PDFs Extracted

```bash
# Windows (Command Prompt)
dir /b data\patient-pdfs\*.pdf | find /c ".pdf"

# Windows (PowerShell)
(Get-ChildItem data\patient-pdfs\*.pdf).Count
```

### View Extraction Progress

```bash
type pdf-extraction-progress.json
```

### Check for Errors

```bash
type pdf-extraction-errors.log
```

### Watch Progress in Real-Time

The script shows live progress in the console:

```
[1/70068] Patient: VR-A01-AAA0001
  [1/4] Searching patient...
      → Patient ID: 1
  [2/4] Opening patient record...
  [3/4] Generating PDF...
      → Using browser print-to-PDF
  [4/4] Verifying download...
      → PDF saved: 245.67 KB
✓ Complete: VR-A01-AAA0001
```

## Handling Errors

### Common Errors and Solutions

#### 1. Session Expired
```
✗ Error: VR-A01-AAA1234 - Login failed
  ⚠ Session expired, re-logging in...
```
**Solution:** Script automatically re-logs in. No action needed.

#### 2. Patient Not Found
```
✗ Error: VR-A01-AAA9999 - Patient not found
```
**Solution:** Patient may not exist in LHIMS. Check patient number.

#### 3. PDF Generation Failed
```
✗ Error: VR-A01-AAA5678 - Failed to generate PDF
```
**Solution:**
- Check if patient record page loaded correctly
- Verify patient has data to generate PDF
- Retry by running script again

#### 4. Browser Crashed
```
✗ FATAL ERROR: browser has been closed
```
**Solution:**
- Restart the script - it will resume from where it stopped
- Check if computer has enough resources (RAM, CPU)

### Retry Failed Extractions

Simply run the script again:

```bash
node scripts/extract-patient-pdf.js
```

The script will:
- Skip all successfully extracted patients
- Retry failed patients
- Continue until all patients are processed

## Configuration

You can modify settings in [scripts/extract-patient-pdf.js](scripts/extract-patient-pdf.js):

```javascript
const CONFIG = {
  // Show browser window (set to true to hide)
  headless: false,

  // Timeout for operations (in milliseconds)
  timeout: 60000,  // 60 seconds

  // Session refresh interval
  sessionRefreshInterval: 5 * 60 * 1000,  // 5 minutes

  // Download timeout
  downloadTimeout: 30000,  // 30 seconds
};
```

## PDF Generation Methods

The script tries two approaches to generate PDFs:

### Method 1: LHIMS Native PDF Export (Preferred)
If LHIMS has a "Print PDF" or "Export PDF" button, the script uses it.

**Advantages:**
- Uses LHIMS formatting
- Includes all official headers/footers
- Matches LHIMS printed records

### Method 2: Browser Print-to-PDF (Fallback)
If no PDF button exists, the script uses Playwright's print-to-PDF feature.

**Advantages:**
- Always works
- Captures complete page content
- A4 format with margins

**Note:** The script automatically chooses the best method available.

## Estimated Extraction Time

With 70,068 patients:

- **Per patient:** ~10-15 seconds (search, navigate, generate PDF)
- **Total time:** ~194-291 hours (8-12 days continuous)
- **Recommended:** Run overnight or over multiple days

The script can be stopped and resumed anytime without losing progress.

## Disk Space Requirements

Estimate disk space needed:

- **Average PDF size:** ~200-500 KB per patient
- **70,068 patients:** ~14-35 GB total
- **Recommended:** Ensure at least 50 GB free disk space

## Tips for Efficient Extraction

### 1. Test First
Always test with a small patient list before running on all patients:

```bash
node scripts/extract-patient-pdf.js test-pdf-extraction.txt
```

### 2. Run Overnight
Start extraction before leaving for the day:

```bash
node scripts/extract-patient-pdf.js > pdf-extraction.log 2>&1
```

This saves all output to a log file.

### 3. Monitor System Resources
- Close unnecessary programs
- Ensure stable internet connection to hospital network
- Don't put computer to sleep during extraction

### 4. Regular Backups
Periodically backup the `data/patient-pdfs` folder to external storage.

### 5. Batch Processing
Extract in batches if needed:

```bash
# Extract first 1000 patients
head -1000 master-patient-list.txt > batch1.txt
node scripts/extract-patient-pdf.js batch1.txt

# Extract next 1000
head -2000 master-patient-list.txt | tail -1000 > batch2.txt
node scripts/extract-patient-pdf.js batch2.txt
```

## Verification

After extraction completes, verify PDFs:

### 1. Check PDF Count Matches Patient Count

```bash
# Count PDFs
dir /b data\patient-pdfs\*.pdf | find /c ".pdf"

# Count patients in list
find /c /v "" master-patient-list.txt
```

### 2. Spot Check PDFs

Open random PDFs to verify:
- PDF opens correctly
- Contains patient data
- Patient number matches filename

### 3. Check for Empty PDFs

```powershell
# PowerShell: Find PDFs smaller than 10 KB (likely empty)
Get-ChildItem data\patient-pdfs\*.pdf | Where-Object { $_.Length -lt 10KB } | Select-Object Name, Length
```

## Troubleshooting

### Script Won't Start

**Check Node.js is installed:**
```bash
node --version
```

**Check Playwright is installed:**
```bash
npm list playwright
```

**If missing, install:**
```bash
npm install
```

### PDFs Not Being Saved

**Check output directory exists:**
```bash
dir data\patient-pdfs
```

**Check disk space:**
```bash
dir c:\
```

### Script Running Very Slowly

**Causes:**
- Slow hospital network
- LHIMS server overloaded
- Computer low on resources

**Solutions:**
- Run during off-peak hours
- Close unnecessary programs
- Increase timeout in CONFIG

### Can't Access PDFs After Extraction

**Ensure PDFs are in correct location:**
```bash
dir data\patient-pdfs\VR-A01-AAA0001.pdf
```

**Check file permissions:**
- Right-click PDF → Properties → Security
- Ensure you have read access

## Next Steps After PDF Extraction

1. **Build Patient Lookup System**
   - Create web interface to search patients
   - Link each patient to their PDF

2. **Import into Database**
   - Store PDF paths in SQLite database
   - Create indexes for fast lookup

3. **Create Offline System**
   - Bundle PDFs with patient JSON data
   - Build standalone application

4. **Backup Everything**
   - Copy `data/patient-pdfs` to external drive
   - Create redundant backups

## Support

If you encounter issues:

1. Check `pdf-extraction-errors.log` for detailed error messages
2. Review this guide's Troubleshooting section
3. Verify LHIMS is accessible and you can login manually
4. Check hospital network connection

## File Locations Summary

| File/Folder | Purpose |
|-------------|---------|
| `scripts/extract-patient-pdf.js` | Main extraction script |
| `run-pdf-extraction.bat` | Windows batch file to run extraction |
| `test-pdf-extraction.txt` | Test patient list (3 patients) |
| `master-patient-list.txt` | Complete patient list (70,068 patients) |
| `data/patient-pdfs/` | Output folder for PDFs |
| `pdf-extraction-errors.log` | Error log file |
| `pdf-extraction-progress.json` | Progress tracking file |
| `PDF-EXTRACTION-GUIDE.md` | This guide |

---

**Last Updated:** November 10, 2025
**Script Version:** 1.0
**Total Patients:** 70,068
