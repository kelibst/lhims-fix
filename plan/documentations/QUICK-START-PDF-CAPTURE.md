# Quick Start: PDF Patient Record Capture

**You're absolutely right!** We can use the same `npm run capture` approach for PDF records.

---

## How to Capture PDF Patient Records

### Step 1: Run the Capture Script

```bash
npm run capture:pdf
```

### Step 2: Follow the On-Screen Instructions

The browser will open and login automatically. Then you'll see:

```
=======================================================================
Please perform the following steps in the browser:

  1. Search for a patient (e.g., VR-A01-AAA1193)
  2. Find and click the "Print" or "Export PDF" button
  3. Wait for the PDF to download
  4. Come back here and press ENTER when done

NOTE: Look for buttons like:
  - "Print Patient Record"
  - "Export PDF"
  - "Print" (with printer icon)
  - "Patient Summary"
  - Or similar export options
=======================================================================
```

### Step 3: Export the PDF

In the opened browser:
1. Search for a patient (use a patient with many visits for best sample)
2. Look for and click the PDF export button
3. Let the PDF download
4. Return to the terminal and press ENTER

### Step 4: Save the Downloaded PDF

The script will save the network capture automatically. You need to:
1. Find the downloaded PDF in your Downloads folder
2. Move it to: `network-captures/patient-record-PATIENTNO.pdf`
   - Example: `network-captures/patient-record-VR-A01-AAA1193.pdf`

### Step 5: Repeat for More Patients (Recommended: 2-3 patients)

Run the command again for different patients:
```bash
npm run capture:pdf
```

This helps us verify the PDF export process is consistent.

---

## What You'll Get

After each capture, you'll have:

```
network-captures/
├── patient-pdf-export-2025-11-08.har   ← Network capture (auto-saved)
└── patient-record-VR-A01-AAA1193.pdf   ← PDF you downloaded (move here)
```

---

## What I'll Do Next

Once you share the HAR files + PDFs:

1. **Analyze the HAR file** to find:
   - PDF generation endpoint URL
   - Required parameters
   - How to automate it

2. **Examine the PDF structure** to understand:
   - What data it contains
   - Format of nurses/doctors notes
   - Whether we need to extract text

3. **Create automated extraction script** that can:
   - Extract PDFs for all patients
   - Or extract PDFs for high-priority patients
   - Run without manual intervention

---

## Why This Approach is Better

You're right - using `npm run capture:pdf` is:
- ✅ **Simpler** - Same method you're already familiar with
- ✅ **More reliable** - Uses the same proven capture approach
- ✅ **Easier to repeat** - Just run the command multiple times
- ✅ **Automatic HAR saving** - Network traffic saved automatically

---

## Example: Complete Workflow

```bash
# Capture patient 1
npm run capture:pdf
# (export PDF for VR-A01-AAA1193, press ENTER)
# Move downloaded PDF to: network-captures/patient-record-VR-A01-AAA1193.pdf

# Capture patient 2
npm run capture:pdf
# (export PDF for VR-A01-AAA1194, press ENTER)
# Move downloaded PDF to: network-captures/patient-record-VR-A01-AAA1194.pdf

# Capture patient 3
npm run capture:pdf
# (export PDF for VR-A01-AAA1195, press ENTER)
# Move downloaded PDF to: network-captures/patient-record-VR-A01-AAA1195.pdf
```

**Total time**: About 10 minutes (3 patients × 3-4 minutes each)

---

## Tips

### Choosing Good Sample Patients

Pick patients with:
- **Many visits** (10+ OPD/IPD visits) - gives us more data to see
- **Different types** (one with IPD admission, one female with ANC, one regular OPD)
- **Recent activity** (visited in last 6 months)

This helps us see the full range of what's in the PDF.

### If PDF Export Button is Hard to Find

Look in these places:
- Patient details/summary page
- Reports menu
- Print menu
- Right-click context menu
- Toolbar buttons
- Patient record page

Take a screenshot if you're not sure, and I can help identify it.

---

## Ready?

Just run:

```bash
npm run capture:pdf
```

And follow the on-screen prompts!

**Estimated time**: 10 minutes for 3 patients
