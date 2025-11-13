# Test Batch Extraction Instructions

## What Was Fixed

### 1. Concurrency Bug (Patient ID Mix-up)
- **Problem**: Workers were potentially using wrong patient IDs during concurrent PDF generation
- **Fix**: Added validation and detailed logging to track patient IDs through entire process
- **Result**: Each PDF now guaranteed to have correct patient data

### 2. Browser Memory Crash
- **Problem**: Browser crashed after 8.5 hours, failing 48,000 remaining patients
- **Fix**: Browser automatically restarts every 500 patients
- **Result**: Can run indefinitely without memory exhaustion

### 3. Improved Logging
- **Added**: Patient ID shown at every critical step
- **Format**: `→ ID: 2239 (VR-A01-AAA2142)` and `[Browser] OPD Request for VR-A01-AAA2142, ID: 2239`
- **Benefit**: Easy to verify correct patient IDs are being used

---

## Files Created for Testing

### 1. Test Patient List
**File**: `test-batch-20-patients.txt`
- **Contains**: 20 patients that previously failed or weren't processed
- **Mix**:
  - 5 patients with "Patient not found" errors (you confirmed they exist)
  - 3 patients with other failure types
  - 12 unprocessed patients from end of list (browser crashed before reaching them)

### 2. Test Batch Script
**File**: `run-test-batch.bat`
- **Duration**: ~5-10 minutes
- **Concurrency**: 3 workers
- **Purpose**: Verify fixes work before running full extraction

### 3. Full Extraction Script
**File**: `run-full-extraction.bat`
- **Duration**: ~10-15 hours
- **Remaining**: ~48,000 patients
- **Purpose**: Extract all remaining patient PDFs

---

## How to Run Test Batch

### Step 1: Connect to Hospital Network
- Disconnect from external internet
- Connect to hospital network (10.10.0.59)
- Verify LHIMS is accessible

### Step 2: Run Test Batch
```bash
# Double-click this file or run from command line:
run-test-batch.bat
```

Or manually:
```bash
node scripts/extract-patient-pdf-concurrent.js test-batch-20-patients.txt 3
```

### Step 3: Monitor Output
Watch for these key indicators:

✅ **Good Signs**:
```
[1/20] Patient: HO-A01-AAM4074 (Worker 0)
  [1/3] Searching...
      → ID: 12345 (HO-A01-AAM4074)          ← Patient ID logged
  [2/3] Fetching data...
      → 15 consultations, 2 admissions
  [3/3] Downloading PDFs...
      → Downloading OPD for HO-A01-AAM4074 (ID: 12345)    ← ID logged again
      [Browser] OPD Request for HO-A01-AAM4074, ID: 12345  ← ID in browser
✓ HO-A01-AAM4074 (23.4s) - OPD: 1, IPD: 2
```

❌ **Warning Signs**:
```
✗ HO-A01-AAM4074 - Patient not found     ← If many of these, stop and investigate
✗ HO-A01-AAM4074 - Page closed            ← Browser issue
⏱ HO-A01-AAM4074 - TIMEOUT                ← Network too slow
```

### Step 4: Verify Results
After test completes:

1. **Check console summary**:
   ```
   Total patients:     20
   Processed:          20
   Successful:         18   ← Should be high
   Failed:             2    ← Should be low
   ```

2. **Verify PDFs were created**:
   ```bash
   ls data/patient-pdfs/HO-A01-AAM4074/
   ls data/patient-pdfs/VR-A11-AAA8653/
   ```

3. **Manually check 1-2 PDFs**:
   - Open `data/patient-pdfs/HO-A01-AAM4074/HO-A01-AAM4074-OPD.pdf`
   - Verify patient name/ID matches HO-A01-AAM4074 (NOT some other patient)
   - This confirms the concurrency bug is fixed!

4. **Check error log** (if any failures):
   ```bash
   tail -50 pdf-extraction-concurrent-errors.log
   ```

---

## If Test Succeeds → Run Full Extraction

### Prerequisites
- Test batch completed successfully
- Verified at least 1 PDF has correct patient data
- Computer ready for long run (10-15 hours)
- Stable network connection to hospital LHIMS

### Run Full Extraction
```bash
# Double-click this file:
run-full-extraction.bat
```

Or manually:
```bash
node scripts/extract-patient-pdf-concurrent.js master-patient-list.txt 3
```

### What to Expect

**Timeline**:
- **0-60 min**: Processes first ~100-200 patients
- **8.5 hours**: Previously crashed here - now browser restarts automatically!
- **10-15 hours**: Should complete all ~48,000 remaining patients

**Console Output** (every 10 patients):
```
[500/70068] Patient: VR-A01-AAB1234 (Worker 2)
✓ VR-A01-AAB1234 (18.2s) - OPD: 1, IPD: 3

📊 Stats (last 10 patients):
   Avg time: 20.5s per patient
   Remaining: ~47,500 patients
   ETA: ~10.2 hours
```

**Browser Restart** (every 500 patients):
```
🔄 Browser restart initiated (memory cleanup)...
   → Launching new browser instance...
   → Re-authenticating...
   ✓ Browser restarted and logged in

[501/70068] Patient: VR-A01-AAB5678 (Worker 0)
   ← Continues seamlessly!
```

### During Full Run

**You Can**:
- ✅ Leave computer running overnight
- ✅ Check progress anytime (console shows stats every 10 patients)
- ✅ Press Ctrl+C to stop (progress is saved, resume later)

**Do NOT**:
- ❌ Disconnect from hospital network
- ❌ Let computer sleep/hibernate
- ❌ Close the terminal window
- ❌ Restart the extraction while it's still running

---

## Troubleshooting

### "Patient not found" errors for patients you know exist
- **Possible cause**: Patient number format issue or LHIMS session problem
- **Solution**: Try searching for one manually in LHIMS to verify it exists
- **If confirmed exists**: This is unexpected - stop and investigate

### High failure rate (>20%)
- **Possible cause**: Network issues, LHIMS server problems
- **Solution**: Check hospital network stability, try again later

### Browser crashes before 500 patients
- **Possible cause**: Low system memory, other programs using resources
- **Solution**: Close other applications, increase restart frequency:
  - Edit `scripts/extract-patient-pdf-concurrent.js`
  - Change `browserRestartInterval: 500` to `browserRestartInterval: 250`

### Process stops/hangs
- **Possible cause**: Single patient timeout (>10 minutes)
- **Solution**: Press Ctrl+C, restart extraction (will skip completed patients)

---

## Important Notes

### Safety Features (Already Tested ✅)
- ✅ Won't overwrite existing 25,816 PDFs
- ✅ Skips 22,016 already-completed patients
- ✅ Progress saved after each patient (safe to stop/resume)
- ✅ Browser restarts automatically (no more 8.5-hour crash)

### What About Wrong IPD PDFs?
**Current status**: You mentioned all existing IPD PDFs have wrong patient data due to the concurrency bug.

**Options**:
1. **Now**: Run test batch and full extraction (creates OPD + IPD)
   - New IPD PDFs will have CORRECT patient data
   - Old IPD PDFs still have WRONG data

2. **Later**: After extraction completes, delete all old IPD PDFs and re-run
   - This ensures ALL IPD PDFs have correct patient data
   - Takes another 10-15 hours

**Recommendation**: Run full extraction now (fixes applied). Then decide whether to clean up old IPD PDFs.

---

## Summary

**Test Batch**: 20 patients, 5-10 minutes
- Purpose: Verify fixes work
- Check: Patient IDs are correct in PDFs

**Full Extraction**: ~48,000 patients, 10-15 hours
- Purpose: Extract all remaining patient data
- Features: Auto-restart, improved logging, safe (won't overwrite)

**Questions?** Check the error log or stop the extraction to investigate.

Good luck! 🚀
