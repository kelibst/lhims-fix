# 🎉 LHIMS Data Extraction - Ready to Run!

## ✅ What We Discovered

We successfully captured and analyzed the LHIMS API endpoints for both OPD and IPD data:

### 1. **OPD (Outpatient) Register**
- **Endpoint**: `exportDHIMSOutPatientRegisterV1.php`
- **File**: Downloads as `LHIMS_OUT_PATIENT_REGISTER_*.xlsx`
- **Data**: Outpatient visit records

### 2. **IPD (Inpatient) Morbidity & Mortality**
- **Endpoint**: `exportInPatientMorbidityAndMortilityV1.php`
- **File**: Downloads as `LHIMS_IN_PATIENT_MORBIDITY_AND_MORTALITY_*.xlsx`
- **Data**: Inpatient morbidity and mortality records

## 🚀 Ready-to-Run Extraction Scripts

I've created two automated scripts that will download **ALL historical data** from 2023 to November 2025.

### Script 1: OPD Data Extraction
```bash
npm run extract:opd
```

**What it does:**
- Logs into LHIMS automatically
- Downloads OPD register data month-by-month
- Covers: January 2023 to November 2025 (34 months)
- Saves files to: `data/opd-register/`
- Filename format: `OPD_Register_2023_Jan.xlsx`, `OPD_Register_2023_Feb.xlsx`, etc.

**Estimated time:** ~3-4 minutes (with 3 second delays between downloads)

### Script 2: IPD Data Extraction
```bash
npm run extract:ipd
```

**What it does:**
- Logs into LHIMS automatically
- Downloads IPD morbidity & mortality data month-by-month
- Covers: January 2023 to November 2025 (34 months)
- Saves files to: `data/ipd-morbidity-mortality/`
- Filename format: `IPD_Morbidity_Mortality_2023_Jan.xlsx`, etc.

**Estimated time:** ~3-4 minutes (with 3 second delays between downloads)

## 📋 How to Run the Extraction

### **Step 1: Connect to Hospital Network**
- Disconnect from external internet
- Connect to hospital local network (10.10.0.59)

### **Step 2: Choose What to Extract**

#### Option A: Extract OPD Data Only
```bash
npm run extract:opd
```

#### Option B: Extract IPD Data Only
```bash
npm run extract:ipd
```

#### Option C: Extract BOTH (Recommended)
Run them one after another:
```bash
npm run extract:opd
# Wait for it to finish, then:
npm run extract:ipd
```

### **Step 3: Watch the Progress**

You'll see output like this:
```
======================================================================
LHIMS OPD REGISTER DATA EXTRACTION
======================================================================

Configuration:
  LHIMS URL: http://10.10.0.59/lhims_182
  Username: sno-411
  Date Ranges: 34 periods
  Output Directory: data/opd-register
  Delay Between Requests: 3000ms

======================================================================

Launching browser...

[1/3] Logging into LHIMS...
✓ Login successful

[2/3] Extracting OPD data for 34 periods...

[1/34] Extracting 2023_Jan (01-01-2023 to 31-01-2023)...
[1/34] ✓ Successfully downloaded
[1/34] Waiting 3000ms...

[2/34] Extracting 2023_Feb (01-02-2023 to 28-02-2023)...
[2/34] ✓ Successfully downloaded
[2/34] Waiting 3000ms...

... (continues for all months)

[3/3] Extraction Complete

======================================================================
EXTRACTION SUMMARY
======================================================================

✓ Successful: 34
✗ Errors: 0
Total: 34

✓ Files saved to: data/opd-register

======================================================================
```

### **Step 4: Verify Downloaded Files**

Check the output directories:

```bash
# Check OPD files
dir data\opd-register

# Check IPD files
dir data\ipd-morbidity-mortality
```

You should see Excel files named by month/year.

## ⚙️ Configuration Options

Both scripts are pre-configured, but you can customize them if needed:

### 1. **Change Date Range**

Edit the `dateRanges` array in the script:

**File**: `scripts/extract-opd-data.js` or `scripts/extract-ipd-data.js`

```javascript
dateRanges: [
  // Add or remove date ranges as needed
  { fromDate: '01-01-2022', toDate: '31-01-2022', label: '2022_Jan' },
  { fromDate: '01-02-2022', toDate: '28-02-2022', label: '2022_Feb' },
  // ... etc
],
```

### 2. **Change Credentials** (if needed)

```javascript
credentials: {
  username: 'your-username',
  password: 'your-password',
},
```

### 3. **Change Delay Between Requests**

```javascript
delayBetweenRequests: 3000, // 3 seconds (can increase if server is slow)
```

### 4. **Run Headless** (hide browser)

```javascript
headless: true, // Change from false to true
```

## 🔧 Troubleshooting

### Issue: "Login failed"
**Solution:**
- Check username and password in the script
- Verify you're on hospital network
- Test login manually in browser first

### Issue: "File is too small" error
**Solution:**
- LHIMS might not have data for that date range
- The download might be returning an error page
- Check the file manually to see what was downloaded

### Issue: Script stops unexpectedly
**Solution:**
- Check network connection
- Increase timeout value in CONFIG
- Increase delay between requests
- Run extraction for fewer months at a time

### Issue: Some months fail to download
**Solution:**
- The script will continue even if some downloads fail
- Check the error summary at the end
- Re-run the script focusing on failed months only

## 📊 What You'll Get

### OPD Register Files
Each file contains outpatient visit data for that month:
- Patient demographics
- Visit dates and times
- Diagnosis codes
- Treatments provided
- Department information
- Service types

### IPD Morbidity & Mortality Files
Each file contains inpatient data for that month:
- Admission records
- Diagnosis codes (ICD-10)
- Length of stay
- Outcomes (discharged, referred, deceased)
- Morbidity statistics
- Mortality records

## 🎯 Quick Start Summary

```bash
# 1. Connect to hospital network

# 2. Run OPD extraction
npm run extract:opd

# 3. Run IPD extraction (after OPD finishes)
npm run extract:ipd

# 4. Check your files
dir data\opd-register
dir data\ipd-morbidity-mortality

# 5. Backup your data!
# Copy to USB drive, external hard drive, etc.
```

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| OPD extraction (34 months) | ~3-4 minutes |
| IPD extraction (34 months) | ~3-4 minutes |
| **Total for both** | **~6-8 minutes** |

**Note**: Actual time depends on:
- Network speed
- Server response time
- File sizes
- Delay between requests (currently 3 seconds)

## 🔐 Security Reminders

- ✅ Scripts use your existing LHIMS credentials
- ✅ All data stays on your local computer
- ✅ No data sent to external servers
- ✅ Files saved locally in `data/` folder
- ⚠️ **Backup extracted data to multiple locations**
- ⚠️ **Keep data secure** - contains patient information
- ⚠️ **Don't share capture files** - they contain your credentials

## 📦 After Extraction

Once you have all the Excel files:

1. **Backup immediately**
   - Copy to USB drive
   - Copy to external hard drive
   - Consider encrypted backup

2. **Verify data quality**
   - Open a few files randomly
   - Check they contain actual data (not error pages)
   - Verify date ranges are correct

3. **Future steps** (we can work on these later):
   - Consolidate into SQLite database
   - Build offline search interface
   - Create data analysis tools
   - Generate summary reports

## 🎊 You're Ready!

Everything is set up. Just run:

```bash
npm run extract:opd
```

And watch the magic happen! 🚀

---

**Questions or issues? Let me know and I'll help troubleshoot!**
