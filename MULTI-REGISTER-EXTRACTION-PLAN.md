# Multi-Register Extraction Plan - LHIMS

## Overview

This document outlines the plan to extract ALL available LHIMS registers before facility lockout.

**Status**: Currently extracting OPD and IPD registers. Planning extraction for 10 additional registers.

---

## Available Registers

### Currently Extracting (✅ Automated)

1. **Out-Patient Register (OPD)** - `extract-opd-data.js`
   - Endpoint: `exportDHIMSOutPatientRegisterV1.php`
   - Status: ✅ Fully automated with dynamic dates and resume
   - Command: `npm run extract:opd`

2. **In-Patient Morbidity & Mortality (IPD)** - `extract-ipd-data.js`
   - Endpoint: `exportInPatientMorbidityAndMortilityV1.php`
   - Status: ✅ Fully automated with dynamic dates and resume
   - Command: `npm run extract:ipd`

### To Be Implemented (⏳ Pending)

3. **Consulting Room Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: HIGH (related to outpatient care)

4. **Admission & Discharge Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: HIGH (critical for inpatient tracking)

5. **General Ward Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: MEDIUM (ward-level patient tracking)

6. **Maternity Ward Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: HIGH (maternal health data)

7. **Medical Laboratory Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: MEDIUM (diagnostic data)

8. **Family Planning Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: MEDIUM (reproductive health services)

9. **ANC (Antenatal Care) Register**
   - Status: ⏳ Pending endpoint discovery
   - Priority: HIGH (maternal care tracking)

10. **Post Natal Care Mother Register**
    - Status: ⏳ Pending endpoint discovery
    - Priority: HIGH (postnatal maternal care)

11. **Post Natal Care Child Register**
    - Status: ⏳ Pending endpoint discovery
    - Priority: HIGH (postnatal child care)

12. **Child Welfare Clinic Register**
    - Status: ⏳ Pending endpoint discovery
    - Priority: MEDIUM (pediatric care)

---

## Extraction Strategy

### Phase 1: Network Traffic Capture (Current Phase)

**Goal**: Discover API endpoints for all 10 remaining registers

**Process** (same as OPD/IPD):

1. Run network capture tool:
   ```bash
   npm run capture
   ```

2. In the opened browser:
   - Log into LHIMS
   - Navigate to the specific register (e.g., "Consulting Room")
   - Select a date range (any test range is fine)
   - Click export/download button
   - Wait for file to download
   - Close browser when prompted

3. Capture file saved to:
   ```
   data/captures/network-capture-TIMESTAMP.json
   ```

**Recommended Order** (by priority):

1. Maternity Ward (HIGH)
2. ANC (HIGH)
3. Post Natal Care Mother (HIGH)
4. Post Natal Care Child (HIGH)
5. Admission & Discharge (HIGH)
6. Consulting Room (HIGH)
7. General Ward (MEDIUM)
8. Medical Laboratory (MEDIUM)
9. Family Planning (MEDIUM)
10. Child Welfare Clinic (MEDIUM)

### Phase 2: Endpoint Analysis

**Goal**: Identify download URLs and parameters for each register

**Process**:

```bash
npm run analyze
```

**Expected Output** for each register:
- Export endpoint URL
- Required parameters (dFromDate, dToDate, iClinicID, etc.)
- Authentication requirements
- Response format (Excel file)

### Phase 3: Script Creation

**Goal**: Create automated extraction scripts for each register

**Template Structure** (based on OPD/IPD scripts):

```javascript
// scripts/extract-[register-name]-data.js

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },

  // Discovered endpoint
  exportEndpoint: 'http://10.10.0.59/lhims_182/export[RegisterName].php',

  // Discovered parameters
  defaultParams: {
    iClinicID: 2,
    // Other parameters as discovered
  },

  // Dynamic date ranges
  startYear: 2023,
  startMonth: 1,
  endAt: 'previous',

  // Output directory
  outputDir: path.join(__dirname, '..', 'data', '[register-name]'),

  // Resume and timing
  skipExisting: true,
  minFileSize: 1000,
  delayBetweenRequests: 3000,
  timeout: 420000, // 7 minutes
  headless: false,
};
```

**Scripts to Create**:

1. `extract-consulting-room-data.js`
2. `extract-admission-discharge-data.js`
3. `extract-general-ward-data.js`
4. `extract-maternity-ward-data.js`
5. `extract-medical-lab-data.js`
6. `extract-family-planning-data.js`
7. `extract-anc-data.js`
8. `extract-postnatal-mother-data.js`
9. `extract-postnatal-child-data.js`
10. `extract-child-welfare-data.js`

### Phase 4: Package.json Updates

Add commands for each new register:

```json
"scripts": {
  "capture": "node scripts/playwright-network-capture.js",
  "analyze": "node scripts/analyze-capture.js",

  "extract:opd": "node scripts/extract-opd-data.js",
  "extract:ipd": "node scripts/extract-ipd-data.js",
  "extract:consulting": "node scripts/extract-consulting-room-data.js",
  "extract:admission": "node scripts/extract-admission-discharge-data.js",
  "extract:general-ward": "node scripts/extract-general-ward-data.js",
  "extract:maternity": "node scripts/extract-maternity-ward-data.js",
  "extract:lab": "node scripts/extract-medical-lab-data.js",
  "extract:family-planning": "node scripts/extract-family-planning-data.js",
  "extract:anc": "node scripts/extract-anc-data.js",
  "extract:postnatal-mother": "node scripts/extract-postnatal-mother-data.js",
  "extract:postnatal-child": "node scripts/extract-postnatal-child-data.js",
  "extract:child-welfare": "node scripts/extract-child-welfare-data.js",

  "extract:all": "npm run extract:opd && npm run extract:ipd && npm run extract:consulting && npm run extract:admission && npm run extract:general-ward && npm run extract:maternity && npm run extract:lab && npm run extract:family-planning && npm run extract:anc && npm run extract:postnatal-mother && npm run extract:postnatal-child && npm run extract:child-welfare"
}
```

### Phase 5: Git Security Updates

Update `.gitignore` to protect all new register data:

```gitignore
# All extraction scripts with credentials
scripts/extract-*.js
!scripts/extract-*.template.js

# All downloaded data directories
data/opd-register/*.xlsx
data/ipd-morbidity-mortality/*.xlsx
data/consulting-room/*.xlsx
data/admission-discharge/*.xlsx
data/general-ward/*.xlsx
data/maternity-ward/*.xlsx
data/medical-lab/*.xlsx
data/family-planning/*.xlsx
data/anc/*.xlsx
data/postnatal-mother/*.xlsx
data/postnatal-child/*.xlsx
data/child-welfare/*.xlsx
```

### Phase 6: Testing & Validation

For each new register:

1. Test single month extraction
2. Verify file size and content
3. Test resume functionality
4. Test dynamic date ranges
5. Run full extraction

---

## Workflow Summary

### Per Register (Repeat 10 times):

```bash
# 1. Capture network traffic
npm run capture
# (Manual: Navigate to register, download test file)

# 2. Analyze capture
npm run analyze
# (Review endpoint and parameters)

# 3. Create extraction script
# (Copy template, update endpoint/params)

# 4. Test single extraction
node scripts/extract-[register]-data.js
# (Verify it works)

# 5. Run full extraction
npm run extract:[register]
# (Extract all historical data)
```

### Final Step - Extract All:

```bash
# One command to extract all 12 registers
npm run extract:all
```

---

## Time Estimates

**Per Register**:
- Network capture: 5 minutes
- Endpoint analysis: 5 minutes
- Script creation: 10 minutes
- Testing: 5 minutes
- Full extraction: 10-30 minutes (depending on data volume)
- **Total per register**: ~35-55 minutes

**All 10 Remaining Registers**:
- Optimistic: 6 hours (if all go smoothly)
- Realistic: 8-10 hours (accounting for troubleshooting)
- Conservative: 12-15 hours (if significant issues arise)

**Recommendation**:
- Do HIGH priority registers first (6 registers)
- Can pause and resume at any point
- Already have working template from OPD/IPD

---

## Data Storage Structure

```
data/
├── opd-register/              ✅ Implemented
│   └── OPD_Register_2023_Jan.xlsx
├── ipd-morbidity-mortality/   ✅ Implemented
│   └── IPD_Morbidity_Mortality_2023_Jan.xlsx
├── consulting-room/           ⏳ Pending
├── admission-discharge/       ⏳ Pending
├── general-ward/             ⏳ Pending
├── maternity-ward/           ⏳ Pending
├── medical-lab/              ⏳ Pending
├── family-planning/          ⏳ Pending
├── anc/                      ⏳ Pending
├── postnatal-mother/         ⏳ Pending
├── postnatal-child/          ⏳ Pending
└── child-welfare/            ⏳ Pending
```

---

## Risk Mitigation

### What if a register has no export function?

- Some registers may only have print/view functionality
- Solution: Capture HTML and convert to Excel using Playwright's page content
- Fallback: Manual export if automated fails

### What if parameters are different?

- Each register may have different required parameters
- Solution: Analyze capture file carefully for each register
- Template flexible enough to accommodate different params

### What if some registers fail?

- Priority system ensures critical data extracted first
- Each register independent - one failure doesn't affect others
- Resume functionality allows retry without re-downloading

---

## Next Steps

**Immediate Action Required**:

1. Start with first HIGH priority register (Maternity Ward)
2. Run network capture:
   ```bash
   npm run capture
   ```
3. Navigate to "Maternity Ward Register" in LHIMS
4. Download a test file
5. Analyze the capture
6. Create extraction script
7. Repeat for remaining registers

**Once Complete**:
- All 12 registers automated
- Single command extraction: `npm run extract:all`
- Complete historical data backup before lockout

---

## Questions to Consider

1. **Do all registers have the same date range (Jan 2023 - present)?**
   - Some specialty clinics may have started later
   - Can adjust `startYear`/`startMonth` per register

2. **Are all registers available to your user account?**
   - User `sno-411` should have access
   - If not, may need different credentials per register

3. **Do some registers have additional filters?**
   - Some may require ward selection, doctor selection, etc.
   - Will discover during network capture

4. **File size expectations?**
   - OPD/IPD are large files (takes 7 minutes)
   - Some registers may be smaller/faster

---

## Success Criteria

✅ **Complete Success**:
- All 12 registers have automated extraction scripts
- All scripts use dynamic date ranges (no future month errors)
- All scripts have resume functionality (skip existing files)
- All credentials and patient data protected by .gitignore
- Single command extraction: `npm run extract:all`
- Complete historical data backup from Jan 2023 to Oct 2025

**Estimated Data Volume**:
- 12 registers × 34 months × ~2-5 MB per file
- Approximate total: 800 MB - 2 GB of Excel files
- Storage required: 3-5 GB (with buffer)

---

**Status**: Ready to begin Phase 1 - Network Traffic Capture

**Next Register**: Maternity Ward (HIGH priority)

**Command**: `npm run capture`
