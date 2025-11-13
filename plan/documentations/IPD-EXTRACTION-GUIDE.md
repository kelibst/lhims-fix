# IPD-Only Extraction Guide

## What This Does

Extracts **ONLY IPD (Inpatient) admission PDFs** for all patients.

- ✅ **IPD PDFs**: All admission summaries extracted
- ❌ **OPD PDFs**: Completely skipped (not extracted)

## Why IPD-Only?

The OPD extraction has a session conflict bug that causes wrong patient data. Until that's fixed, we're extracting IPD separately since IPD extraction works correctly.

## Files Created

### New Script
- **`scripts/extract-ipd-only.js`** - IPD-only extraction script
- Based on the working concurrent script
- All safety features included (auto-resume, browser restart, etc.)

### Run Script
- **`run-ipd-extraction.bat`** - Double-click to start IPD extraction

### Progress Files
- **`ipd-extraction-progress.json`** - Tracks completed patients (separate from OPD)
- **`ipd-extraction-stats.json`** - Statistics for IPD extraction
- **`ipd-extraction-errors.log`** - Error log for IPD extraction

## How to Run

### Method 1: Double-Click (Easy)
```
Double-click: run-ipd-extraction.bat
```

### Method 2: Command Line
```bash
node scripts/extract-ipd-only.js master-patient-list.txt 3
```

## What to Expect

**Duration**: ~10-15 hours

**Output**:
- Processes all 70,068 patients in master list
- Extracts IPD PDFs for patients who have admissions
- Skips patients with no IPD data (outpatients only)

**Console Output**:
```
[1/70068] Patient: VR-A01-AAA0001 (Worker 0)
  [1/3] Searching...
      → ID: 12345
  [2/3] Fetching admissions...
      → 3 admissions
  [3/3] Downloading IPD PDFs...
      → IPD: ✓
✓ VR-A01-AAA0001 (15.2s) - OPD: 0, IPD: 3
```

**For patients with no admissions**:
```
[2/70068] Patient: VR-A01-AAA0002 (Worker 1)
  [1/3] Searching...
      → ID: 12346
  [2/3] Fetching admissions...
      → 0 admissions
  [3/3] Downloading IPD PDFs...
✓ VR-A01-AAA0002 (5.3s) - OPD: 0, IPD: 0
```

## Safety Features

### Auto-Resume
- Progress saved after each patient
- If stopped (Ctrl+C), can resume later
- Won't re-process completed patients

### Won't Overwrite
- Skips existing IPD PDFs
- Safe to run multiple times
- Only downloads missing PDFs

### Browser Restart
- Restarts every 500 patients
- Prevents memory crashes
- Auto re-authenticates

### Separate Progress
- Uses `ipd-extraction-progress.json`
- Independent from OPD extraction
- Can run IPD and OPD extractions separately

## Expected Results

### Statistics
```
Total patients:     70,068
Processed:          70,068
Successful:         ~25,000 (patients with IPD data)
Failed:             minimal
No IPD data:        ~45,000 (outpatients only)

IPD PDFs created:   ~30,000-40,000 (multiple admissions per patient)
```

### File Structure
```
data/patient-pdfs/
├── VR-A01-AAA0001/
│   ├── VR-A01-AAA0001-IPD-ADMISSION-123.pdf
│   ├── VR-A01-AAA0001-IPD-ADMISSION-456.pdf
│   └── VR-A01-AAA0001-IPD-ADMISSION-789.pdf
├── VR-A01-AAA0002/
│   └── (no IPD PDFs if patient has no admissions)
└── ...
```

## Notes

### OPD Extraction
- OPD extraction is SKIPPED in this script
- This is intentional due to session conflict bug
- OPD extraction needs to be done separately (after bug fix)

### IPD Data Quality
- IPD extraction works correctly (no session conflicts)
- Each admission gets its own PDF
- Patient ID matches correctly in IPD PDFs

### Monitoring
- Stats shown every 10 patients
- Browser restart logged every 500 patients
- Can check progress anytime by looking at console

## Troubleshooting

### High "No IPD data" count
- **Normal**: Many patients are outpatients only (~60-65%)
- Only inpatients have IPD data

### Failures
- Check `ipd-extraction-errors.log`
- Most failures are "Patient not found" or network timeouts
- Acceptable failure rate: <5%

### Browser crash
- Script automatically restarts browser every 500 patients
- Should not crash like previous 8.5-hour run

## After Completion

### What You'll Have
- ✅ IPD PDFs for all inpatients
- ❌ No OPD PDFs (need separate extraction)

### Next Steps
1. **Verify IPD PDFs** - Check a few random patients to confirm correct data
2. **OPD Extraction** - Wait for OPD session bug fix, then extract OPD separately
3. **Complete Dataset** - Eventually you'll have both OPD + IPD for all patients

---

## Quick Start

1. Connect to hospital network
2. Double-click `run-ipd-extraction.bat`
3. Wait ~10-15 hours
4. Done!

**Questions?** Check `ipd-extraction-errors.log` or monitor console output.
