# LHIMS Extraction - Quick Reference Card

## 🚀 Commands

```bash
# Step 1: Capture network traffic
npm run capture

# Step 2: Analyze captured traffic
npm run analyze

# Or specify a HAR file
node scripts/analyze-requests.js lhims-session_2025-11-07_14-30-00.har

# Step 3: Run extraction (after creating script)
node scripts/extract-opd-morbidity.js
```

## 📋 Workflow Checklist

### Before You Start
- [ ] Disconnect from external internet
- [ ] Connect to hospital network (10.10.0.59)
- [ ] Verify LHIMS works in browser: http://10.10.0.59/lhims_182
- [ ] Have your LHIMS login credentials ready

### Phase 1: Capture (First Time Only)
- [ ] Run: `npm run capture`
- [ ] Browser opens automatically
- [ ] Log into LHIMS
- [ ] Navigate: Reports → OPD Morbidity
- [ ] Select: Monthly, All Departments, Recent month
- [ ] Click: Export to Excel / Download
- [ ] Wait for download to complete
- [ ] Press Ctrl+C in terminal
- [ ] Note the HAR filename shown

### Phase 2: Analysis (First Time Only)
- [ ] Run: `npm run analyze`
- [ ] Or: `node scripts/analyze-requests.js <har-filename>`
- [ ] Look for section: "EXCEL/FILE DOWNLOADS"
- [ ] Copy the URL, method, and parameters
- [ ] Note any authentication requirements
- [ ] Save the endpoint information

### Phase 3: Automation (After Discovery)
- [ ] Create/modify: `scripts/extract-opd-morbidity.js`
- [ ] Add discovered endpoint to script
- [ ] Test with single month first
- [ ] Run full extraction for all months
- [ ] Verify downloaded files in `data/opd-morbidity/`

## 📁 Important Files

| File | Purpose |
|------|---------|
| `@CLAUDE.md` | Project memory - update with findings |
| `USAGE.md` | Detailed instructions |
| `README.md` | Project overview |
| `data/captures/*.har` | Captured network traffic |
| `analysis/*.json` | Analysis results |
| `data/opd-morbidity/*.xlsx` | Downloaded reports |

## 🔍 What to Look For in Analysis

```
2. EXCEL/FILE DOWNLOADS (OPD MORBIDITY REPORTS)
----------------------------------------------------------------------
[1] GET REQUEST                           ← The method (GET or POST)
    URL: http://10.10.0.59/lhims_182/reports/opd_morbidity.php?month=10&year=2025&dept=all&format=excel
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         This is the endpoint you need!

    Query Parameters:                     ← Parameters to change for different months
      - month: 10                         ← Change this for each month
      - year: 2025                        ← Change this for each year
      - dept: all                         ← Department selector
      - format: excel                     ← Output format
```

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to LHIMS" | • Check hospital network connection<br>• Verify 10.10.0.59 is reachable<br>• Try browser first |
| "No Excel downloads found" | • Did you actually download a file?<br>• Wait for download to complete<br>• Try capture again |
| "npm: command not found" | • Install Node.js from nodejs.org<br>• Restart terminal after install |
| "playwright not found" | • Run: `npm install`<br>• Make sure you're in project directory |
| Browser doesn't open | • Check if Playwright installed<br>• Run: `npx playwright install chromium` |

## 📊 Data Priority

1. **OPD Morbidity** ← Start here
2. Laboratory Reports
3. Pharmacy Records
4. NHIS Claims
5. Patient Demographics
6. Appointment Schedules

## ⚠️ Security Reminders

- **NEVER share HAR files** - contain session cookies
- **NEVER commit patient data to git** - already in .gitignore
- **DELETE HAR files** after analysis - security risk
- **BACKUP extracted data** to multiple locations
- **ENCRYPT sensitive data** if possible

## 🎯 Success Criteria

After each phase, you should have:

**Phase 1 Complete:**
- ✅ HAR file in `data/captures/`
- ✅ File size > 100 KB
- ✅ Excel file downloaded to your Downloads folder

**Phase 2 Complete:**
- ✅ Analysis JSON in `analysis/`
- ✅ Excel download endpoint identified
- ✅ Parameters documented

**Phase 3 Complete:**
- ✅ Multiple Excel files in `data/opd-morbidity/`
- ✅ Files named by month/year
- ✅ Historical data from 2023-present

## 💡 Tips

1. **Start small**: Test with one month before bulk extraction
2. **Be patient**: Add delays between requests (2-5 seconds)
3. **Save often**: The HAR file is precious - back it up
4. **Document everything**: Update @CLAUDE.md with findings
5. **Test manually**: Verify endpoint works in browser first

## 🔗 Quick Links

- LHIMS URL: http://10.10.0.59/lhims_182
- Project folder: `c:\Users\Kelib\Desktop\projects\lhims-fix`
- Captures folder: `c:\Users\Kelib\Desktop\projects\lhims-fix\data\captures`
- Analysis folder: `c:\Users\Kelib\Desktop\projects\lhims-fix\analysis`

## 📞 When to Ask for Help

- HAR file is empty or very small (< 10 KB)
- Analysis shows no Excel downloads
- Endpoint requires complex authentication
- Automation script doesn't work
- Need to extract different report types

---

**Remember**: Time is critical. Extract data as soon as possible before facility lockout!
