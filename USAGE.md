# LHIMS Data Extraction - Quick Start Guide

## Overview

This project helps you extract data from LHIMS before your facility loses access. It works by capturing network traffic from your browser to discover API endpoints, then automating data downloads.

## Prerequisites

1. **Node.js installed** (version 16 or higher)
   - Check by running: `node --version`
   - Download from: https://nodejs.org if needed

2. **Access to LHIMS** (http://10.10.0.59/lhims_182)
   - Must be on hospital local network
   - Valid LHIMS login credentials

3. **Network setup**
   - Disconnect from external network
   - Connect to hospital network (10.10.0.59)

## Installation

Open a terminal/command prompt in this directory and run:

```bash
npm install
```

This will install Playwright and other dependencies.

## Step-by-Step Process

### Phase 1: Capture Network Traffic

This step records all HTTP requests when you manually download a report.

**1. Connect to hospital network**
   - Disconnect from external internet
   - Connect to local hospital network (10.10.0.59)
   - Verify LHIMS is accessible in your browser

**2. Run the capture script:**

```bash
npm run capture
```

Or:

```bash
node scripts/playwright-har-capture.js
```

**3. A browser window will open automatically:**
   - Log into LHIMS with your credentials
   - Navigate to: Reports → OPD Morbidity Report
   - Select options:
     - Frequency: Monthly
     - Department: All Departments
     - Month: Any recent month (e.g., October 2025)
   - Click "Export to Excel" or "Download"
   - Wait for the file to download
   - **Do NOT close the browser yet**

**4. After the file downloads:**
   - Return to the terminal window
   - Press `Ctrl+C` to stop recording
   - The script will save a HAR file (network traffic log)

**5. Expected output:**
   ```
   ✓ HAR file saved successfully!
   File location: data/captures/lhims-session_2025-11-07_14-30-00.har
   ```

### Phase 2: Analyze Network Traffic

This step examines the HAR file to find the API endpoint that generates Excel reports.

**1. Run the analysis script:**

```bash
npm run analyze
```

Or if you have multiple HAR files:

```bash
node scripts/analyze-requests.js lhims-session_2025-11-07_14-30-00.har
```

**2. Review the output carefully**

Look for the section: **"2. EXCEL/FILE DOWNLOADS (OPD MORBIDITY REPORTS)"**

Example output:
```
[1] GET REQUEST
    URL: http://10.10.0.59/lhims_182/reports/opd_morbidity.php?month=10&year=2025&dept=all&format=excel
    Status: 200
    Content-Type: application/vnd.ms-excel
    File Size: 45.23 KB
    Query Parameters:
      - month: 10
      - year: 2025
      - dept: all
      - format: excel
```

**3. Key information to note:**
   - **URL**: The endpoint that generates the report
   - **Method**: GET or POST
   - **Parameters**: month, year, department, format, etc.
   - **Cookies**: Authentication cookies required
   - **Headers**: Any special headers needed

**4. The analysis is also saved to:**
   ```
   analysis/analysis_2025-11-07T14-30-00.json
   ```

### Phase 3: Build Automation Script

Based on the discovered endpoint, we'll create a script to download historical data.

**Example automation script** (to be created after analysis):

```javascript
// scripts/extract-opd-morbidity.js
// This will be customized based on your actual endpoint

const { chromium } = require('playwright');

async function extractOPDData(startMonth, startYear, endMonth, endYear) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login to LHIMS
  await page.goto('http://10.10.0.59/lhims_182');
  await page.fill('#username', 'YOUR_USERNAME');
  await page.fill('#password', 'YOUR_PASSWORD');
  await page.click('#login-button');

  // Loop through months
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      // Skip if outside range
      if (year === startYear && month < startMonth) continue;
      if (year === endYear && month > endMonth) break;

      // Download report for this month
      const downloadUrl = `http://10.10.0.59/lhims_182/reports/opd_morbidity.php?month=${month}&year=${year}&dept=all&format=excel`;

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.goto(downloadUrl)
      ]);

      // Save file
      const filename = `OPD_Morbidity_${year}_${String(month).padStart(2, '0')}_AllDepts.xlsx`;
      await download.saveAs(`data/opd-morbidity/${filename}`);

      console.log(`✓ Downloaded: ${filename}`);

      // Wait between requests (be respectful)
      await page.waitForTimeout(2000);
    }
  }

  await browser.close();
}

// Example: Extract from January 2023 to October 2025
extractOPDData(1, 2023, 10, 2025);
```

### Phase 4: Run Extraction

Once the automation script is created:

**1. Connect to hospital network** (if not already)

**2. Run the extraction:**

```bash
node scripts/extract-opd-morbidity.js
```

**3. Monitor progress:**
   - Script will log each downloaded file
   - Files saved to: `data/opd-morbidity/`
   - Script will pause between downloads (respectful rate limiting)

**4. Verify downloads:**

```bash
dir data\opd-morbidity
```

or on Mac/Linux:

```bash
ls data/opd-morbidity/
```

## Troubleshooting

### "Cannot connect to LHIMS"
- Verify you're on hospital network (10.10.0.59)
- Try opening LHIMS in regular browser first
- Check if LHIMS is online

### "No Excel downloads found in HAR file"
- Make sure you actually downloaded a file during capture
- Wait for download to complete before pressing Ctrl+C
- Try capture again and download a different report

### "Authentication failed"
- Check username/password in script
- Session may have timed out
- Login manually in browser first to test credentials

### "Script stops unexpectedly"
- Check network connection
- LHIMS may have rate limiting
- Increase delay between requests
- Run script in smaller batches

## File Structure

```
lhims-fix/
├── @CLAUDE.md                          # Project memory and documentation
├── USAGE.md                            # This file
├── package.json                        # Node.js dependencies
│
├── scripts/
│   ├── playwright-har-capture.js       # Step 1: Capture network traffic
│   ├── analyze-requests.js             # Step 2: Analyze HAR file
│   └── extract-opd-morbidity.js        # Step 3: Automated extraction (to be created)
│
├── data/
│   ├── captures/                       # Saved HAR files
│   ├── opd-morbidity/                  # Downloaded OPD Excel files
│   ├── laboratory/                     # Lab data (future)
│   └── pharmacy/                       # Pharmacy data (future)
│
└── analysis/
    └── analysis_*.json                 # Saved analysis results
```

## What to Extract (Priority Order)

1. **OPD Morbidity Reports** (Current focus)
   - Monthly reports for all departments
   - Historical data back to 2023 (or as far as available)

2. **Laboratory Reports** (Next)
   - Test results
   - Department summaries

3. **Pharmacy Reports**
   - Dispensing records
   - Drug usage statistics

4. **NHIS Claims**
   - Submitted claims
   - Approved/rejected claims

5. **Patient Data** (if accessible via reports)
   - Demographics
   - Visit summaries
   - Appointment lists

## Security Notes

- **Do NOT commit sensitive data to git**
- **Do NOT share HAR files** (contain session cookies)
- **Keep extracted data secure** (contains patient information)
- **Delete HAR files** after analysis (security risk)
- **Use strong passwords** for any databases created

## Getting Help

1. Check [@CLAUDE.md](@CLAUDE.md) for project documentation
2. Review analysis JSON files for endpoint details
3. Check LHIMS manually to verify data availability
4. Contact project maintainer if issues persist

## Next Steps After OPD Extraction

Once OPD data extraction is successful:

1. Apply same technique to other reports
2. Build SQLite database to consolidate data
3. Create offline search interface
4. Train staff on backup system
5. Establish regular backup procedures

## Important Reminders

- **Time is critical** - facilities are being locked out
- **Extract data in priority order** - most critical first
- **Multiple backups** - save to USB, external drive, cloud
- **Test extractions** - verify data before assuming success
- **Document everything** - update @CLAUDE.md with findings

---

**Last Updated**: November 7, 2025
**Status**: Initial setup complete, ready for first capture
