# Network Capture Instructions - PDF Export & Remaining Registers

**Purpose**: Capture network traffic to analyze how LHIMS exports PDF patient records and remaining register data.

**Timeline**: Complete THIS WEEK (before facility lockout)

---

## PART 1: Capture PDF Patient Record Export (HIGH PRIORITY)

### What We're Capturing
The **complete patient record PDF** that includes:
- All patient visits (OPD/IPD)
- Nurses notes
- Doctors notes
- Prescriptions
- Lab results
- Vital signs
- Complete health data

This is CRITICAL because it may contain data not available in the Excel registers.

---

### Step-by-Step Instructions

#### Preparation (Do Once)
1. **Create capture folder**:
   - Open File Explorer
   - Navigate to: `C:\Users\Kelib\Desktop\projects\lhims-fix`
   - Create new folder: `network-captures`

2. **Open browser with Developer Tools**:
   - Open Chrome or Edge
   - Press **F12** to open Developer Tools
   - Click **"Network"** tab
   - ✅ Check **"Preserve log"** checkbox (very important!)

#### Capture Process (Repeat for 3 Patients)

**For each patient**:

1. **Start fresh**:
   - Click 🚫 icon in Network tab to clear previous captures
   - ✅ Confirm "Preserve log" is still checked

2. **Navigate to LHIMS**:
   - Go to: `http://10.10.0.59/lhims_182`
   - Login with credentials

3. **Search for patient**:
   - Enter folder number: **VR-A01-AAA1193** (or any patient with many visits)
   - Click Search/Find

4. **Generate PDF**:
   - Look for button: "Print", "Export PDF", "Patient Record", or similar
   - Click the button
   - Wait for PDF to generate/download
   - Save the PDF to: `C:\Users\Kelib\Desktop\projects\lhims-fix\network-captures\patient-record-VR-A01-AAA1193.pdf`

5. **Save network capture**:
   - Right-click anywhere in Network tab
   - Select: **"Save all as HAR with content"**
   - Save as: `C:\Users\Kelib\Desktop\projects\lhims-fix\network-captures\patient-pdf-export-VR-A01-AAA1193.har`

6. **Verify capture**:
   - Check that HAR file is > 100 KB (should contain all network requests)
   - Check that PDF file is > 10 KB (should be actual patient record)

#### Recommended Patients to Capture

Try to capture PDFs for patients with different characteristics:

1. **Patient with many visits**: VR-A01-AAA1193 (or find one with 10+ visits)
2. **Patient with IPD admission**: (Find one who was admitted)
3. **Female patient with ANC**: (Find pregnant/delivered patient)

This helps us verify the PDF structure is consistent.

---

### What I Need from You

After completing captures, you should have:

```
network-captures/
├── patient-pdf-export-VR-A01-AAA1193.har
├── patient-record-VR-A01-AAA1193.pdf
├── patient-pdf-export-VR-A01-AAA1194.har
├── patient-record-VR-A01-AAA1194.pdf
├── patient-pdf-export-VR-A01-AAA1195.har
└── patient-record-VR-A01-AAA1195.pdf
```

**What I'll analyze from the HAR files**:
- PDF generation endpoint URL
- Required parameters (patient number, date range, etc.)
- POST or GET request type
- Response handling
- Session/authentication requirements

**Estimated Time**: 30 minutes (3 patients × 10 minutes each)

---

## PART 2: Capture Remaining 7 Registers

### Registers to Capture

1. ⬜ Maternity Ward
2. ⬜ Admission & Discharge
3. ⬜ Post Natal Care Mother
4. ⬜ Post Natal Care Child
5. ⬜ General Ward
6. ⬜ Family Planning
7. ⬜ Child Welfare Clinic

---

### Step-by-Step Instructions (For EACH Register)

#### Preparation (Do Once per Register)
1. **Open browser with Developer Tools**:
   - Open Chrome or Edge
   - Press **F12**
   - Click **"Network"** tab
   - ✅ Check **"Preserve log"**

2. **Clear previous captures**:
   - Click 🚫 icon in Network tab

#### Capture Process

**For each register**:

1. **Login to LHIMS**:
   - Go to: `http://10.10.0.59/lhims_182`
   - Login with your credentials

2. **Navigate to register**:
   - Example: Click "Reports" → "Maternity Ward Register"
   - Or wherever the register is located in LHIMS menu

3. **Select date range**:
   - Choose **one month** (e.g., January 2023)
   - From: 01-01-2023
   - To: 31-01-2023

4. **Export to Excel**:
   - Click "Export to Excel" or "Download" button
   - Wait for Excel file to download
   - Save the Excel file to appropriate folder:
     ```
     data/maternity-ward/Maternity_Ward_2023_Jan.xlsx
     data/admission-discharge/Admission_Discharge_2023_Jan.xlsx
     # etc.
     ```

5. **Save network capture**:
   - Right-click in Network tab
   - **"Save all as HAR with content"**
   - Save as: `network-captures/[register-name]-export.har`
   - Examples:
     ```
     network-captures/maternity-ward-export.har
     network-captures/admission-discharge-export.har
     network-captures/postnatal-mother-export.har
     # etc.
     ```

6. **Document register details** (important!):
   - Create text file: `network-captures/[register-name]-notes.txt`
   - Write down:
     ```
     Register Name: Maternity Ward
     Menu Path: Reports → Maternity Ward Register
     Sample File: data/maternity-ward/Maternity_Ward_2023_Jan.xlsx
     Data Start Row: ? (check Excel file)
     Notes: Any special observations
     ```

---

### Checklist

**PDF Captures**:
- ⬜ Patient 1 HAR file
- ⬜ Patient 1 PDF file
- ⬜ Patient 2 HAR file
- ⬜ Patient 2 PDF file
- ⬜ Patient 3 HAR file
- ⬜ Patient 3 PDF file

**Register Captures**:
- ⬜ Maternity Ward (HAR + sample Excel + notes)
- ⬜ Admission & Discharge (HAR + sample Excel + notes)
- ⬜ Post Natal Care Mother (HAR + sample Excel + notes)
- ⬜ Post Natal Care Child (HAR + sample Excel + notes)
- ⬜ General Ward (HAR + sample Excel + notes)
- ⬜ Family Planning (HAR + sample Excel + notes)
- ⬜ Child Welfare Clinic (HAR + sample Excel + notes)

---

## Troubleshooting

### "Preserve log" is not checked
**Problem**: Network tab clears when navigating pages
**Solution**: Make sure ✅ "Preserve log" checkbox is checked in Network tab

### HAR file is too small (< 10 KB)
**Problem**: Didn't capture the actual request
**Solution**:
- Clear Network tab (🚫 icon)
- Make sure "Preserve log" is checked
- Perform the export again
- Save HAR file immediately after download completes

### Can't find "Export PDF" button
**Problem**: Not sure where PDF export is in LHIMS
**Solution**:
- Look for: "Print", "Print Patient Record", "Export PDF", "Patient Summary"
- Try searching patient first, then look for print/export options
- Check menu: Reports → Patient Reports
- Take screenshot of LHIMS interface and share with me

### Excel file is empty or has errors
**Problem**: Downloaded Excel file has no data
**Solution**:
- Try different date range (pick month with known data)
- Check if you have permissions to view that register
- Make sure date format is correct (DD-MM-YYYY)
- Note the issue in the notes file for that register

### Register not found in LHIMS menu
**Problem**: Can't find where register is located
**Solution**:
- Check under: Reports, Registers, Records, Data Export
- Search LHIMS help/documentation
- Ask hospital IT staff where register is located
- Document the issue - we may skip that register if not accessible

---

## Priority Order

If short on time, prioritize in this order:

**Must Have** (capture first):
1. ⭐⭐⭐ PDF Patient Record Export (3 patients)
2. ⭐⭐ Maternity Ward
3. ⭐⭐ Admission & Discharge

**Should Have** (capture second):
4. ⭐ Post Natal Care Mother
5. ⭐ Post Natal Care Child
6. ⭐ General Ward

**Nice to Have** (capture if time allows):
7. Family Planning
8. Child Welfare Clinic

---

## Timeline

**Recommended Schedule**:
- **Day 1** (2-3 hours):
  - Capture PDF exports (3 patients) - 30 min
  - Capture Maternity Ward - 30 min
  - Capture Admission & Discharge - 30 min

- **Day 2** (2-3 hours):
  - Capture Post Natal Care Mother - 30 min
  - Capture Post Natal Care Child - 30 min
  - Capture General Ward - 30 min

- **Day 3** (1-2 hours):
  - Capture Family Planning - 30 min
  - Capture Child Welfare Clinic - 30 min
  - Review and verify all captures

**Total Time**: 5-8 hours spread over 3 days

---

## After Completion

Once you have all captures:

1. **Verify you have**:
   - All HAR files in `network-captures/` folder
   - All sample Excel files in appropriate `data/` folders
   - All notes files documenting each register
   - All PDF samples

2. **Share with me**:
   - I'll analyze HAR files
   - Create extraction scripts for all 7 registers
   - Create PDF extraction script

3. **Next steps**:
   - I'll create the scripts (2-3 days)
   - We'll run full extraction together (3-5 days)
   - Complete data extraction before facility lockout

---

## Questions?

If you encounter any issues:
1. Take screenshot
2. Note the error message
3. Document what you tried
4. Share with me and I'll help troubleshoot

**Remember**: The goal is to capture the network traffic (HAR files) so I can analyze how LHIMS generates these exports. The actual data extraction will be automated with scripts after analysis.

---

## Quick Reference

**Open Developer Tools**: F12
**Network Tab**: Click "Network"
**Clear Captures**: 🚫 icon
**Preserve Log**: ✅ Must be checked
**Save HAR**: Right-click → "Save all as HAR with content"
**File Locations**:
- HAR files → `network-captures/`
- Excel samples → `data/[register-name]/`
- PDFs → `network-captures/`
- Notes → `network-captures/[register-name]-notes.txt`

**Good luck! Let me know when you're ready to start or if you have questions.**
