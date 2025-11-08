# LHIMS Offline Patient Database System

**Status**: ✅ Plan Approved - Ready for Implementation
**Start Date**: November 8, 2025
**Estimated Completion**: 6-9 weeks
**Current Phase**: Phase 1 - Data Extraction (CRITICAL)

---

## Project Overview

Create an offline patient database system that enables health workers to access complete patient records when LHIMS is unavailable, ensuring continuity of care during system downtime.

---

## Key Features

### For Health Workers:
- 🔍 **Fast patient search** by folder number or name
- 📋 **Complete patient history** from all 12 registers
- 📄 **PDF patient records** with nurses/doctors notes
- 📊 **Timeline view** of all patient interactions
- 🖨️ **Print patient summaries**
- 💻 **Works completely offline** on hospital network
- ⚡ **Sub-2-second** patient lookups

### For Hospital:
- 💾 **Complete data backup** before facility lockout
- 📈 **Statistical analysis** capability (SPSS)
- 🔄 **Business continuity** during LHIMS downtime
- 📊 **DHIMS2 reporting** from extracted data
- 🛡️ **Disaster recovery** capability

---

## System Architecture

```
LHIMS Data Sources
        │
        ├── Excel Registers (12 types)
        │   ├── OPD ✅
        │   ├── IPD ✅
        │   ├── ANC ✅
        │   ├── Consulting Room ✅
        │   ├── Medical Laboratory ✅
        │   ├── Maternity Ward ⬜
        │   ├── Admission & Discharge ⬜
        │   ├── Post Natal Care Mother ⬜
        │   ├── Post Natal Care Child ⬜
        │   ├── General Ward ⬜
        │   ├── Family Planning ⬜
        │   └── Child Welfare Clinic ⬜
        │
        └── PDF Patient Records ⬜
            └── Complete history with notes

        ↓

SQLite Patient Database
        │
        ├── patients (master demographics)
        ├── 12 register tables (all patient records)
        ├── patient_pdf_records (PDF metadata)
        └── clinical_notes (extracted from PDFs)

        ↓

Web-Based Patient Lookup Interface
        │
        ├── Search by folder number/name
        ├── View complete patient timeline
        ├── Access PDF patient records
        ├── Export/print summaries
        └── Works offline

        ↓

Health Workers Access
        │
        ├── OPD workstations
        ├── Consulting room
        ├── Records office
        └── Nursing station
```

---

## Current Status

### ✅ Completed (5/12 Registers)
- OPD Register (30 files, ~1,188 records/month)
- IPD Morbidity & Mortality (31 files, ~2 records/month)
- ANC Register (33 files, ~73 records/month)
- Consulting Room (34 files, ~369 records/month)
- Medical Laboratory (34 files, ~4 records/month)
- **Total**: 162 files, 82 MB, ~1,636 records/month

### ⬜ Pending (7/12 Registers)
- Maternity Ward (HIGH PRIORITY)
- Admission & Discharge (HIGH PRIORITY)
- Post Natal Care Mother
- Post Natal Care Child
- General Ward
- Family Planning
- Child Welfare Clinic

### ⬜ Pending (NEW - PDF Export)
- PDF patient record extraction script
- Sample PDF captures (3 patients)
- High-priority patient PDFs (1,000-2,000 patients)

---

## Key Innovation: PDF Patient Records

**Why This Matters**:

The PDF patient record export from LHIMS contains **complete patient data** including:
- ✅ All visits (OPD/IPD) in chronological order
- ✅ **Nurses notes** (may not be in Excel registers)
- ✅ **Doctors notes** (may not be in Excel registers)
- ✅ Prescriptions
- ✅ Lab results
- ✅ Vital signs
- ✅ Complete clinical documentation

This is the **"gold standard"** patient record that health workers need during LHIMS downtime.

**Strategy**:
1. Capture PDF export workflow (network traffic analysis)
2. Create automated PDF extraction script
3. Extract PDFs for high-priority patients (active patients, admissions, complex cases)
4. Store PDFs alongside database
5. Provide PDF viewing/downloading in web interface

---

## Universal Patient Identifier

**All registers use the same Patient No. field**: `VR-A01-AAANNNN`

Example: `VR-A01-AAA1193`

This enables linking all patient data across:
- 12 different Excel registers
- PDF patient records
- Future data sources

**Result**: Complete patient history from single identifier.

---

## Project Phases

### Phase 1: Data Extraction (THIS WEEK - CRITICAL)
**Duration**: 3-7 days

**Part A: Register Extraction**
- YOU: Capture network traffic for 7 remaining registers
- ME: Create extraction scripts
- WE: Run full historical extraction

**Part B: PDF Export Capture** ⭐
- YOU: Capture PDF export for 3 sample patients
- ME: Analyze capture and create PDF extraction script
- WE: Extract PDFs for high-priority patients

**Deliverable**: All 12 registers + ~1,000-2,000 patient PDFs

---

### Phase 2: Data Consolidation (Week 2-3)
**Duration**: 1-2 weeks

**Tasks**:
- Clean and standardize all Excel data
- Generate master patient list
- Analyze PDF structure
- Create data quality report

**Deliverable**: Clean datasets ready for database import

---

### Phase 3: SQLite Database (Week 3-4)
**Duration**: 1-2 weeks

**Tasks**:
- Design database schema (14 tables)
- Write Python import scripts
- Import all Excel + PDF metadata
- Create indexes for fast queries
- Validate all data linkages

**Deliverable**: `lhims_patients.db` - Complete patient database

---

### Phase 4: Web Interface (Week 4-5)
**Duration**: 1-2 weeks

**Tasks**:
- Build Streamlit/Flask web application
- Implement patient search
- Create timeline view
- Add PDF viewer/download
- Test with health workers

**Deliverable**: Working offline patient lookup system

---

### Phase 5: SPSS Analysis (Week 5-6) - Optional
**Duration**: 1 week

**Tasks**:
- Export data to SPSS format
- Create analysis templates
- Generate statistical reports
- Train researchers

**Deliverable**: SPSS-ready datasets and reports

---

### Phase 6: Training & Deployment (Week 6-7)
**Duration**: 1 week

**Tasks**:
- Create user documentation
- Conduct training sessions
- Deploy on hospital computers
- Establish backup procedures

**Deliverable**: Operational system with trained users

---

### Phase 7: Maintenance (Ongoing)
**Duration**: Continuous

**Tasks**:
- Monthly data updates
- Quarterly backups
- User support
- Feature enhancements

**Deliverable**: Continuously updated patient database

---

## Documentation

1. **[PATIENT-DATABASE-COMPLETE-PLAN.md](PATIENT-DATABASE-COMPLETE-PLAN.md)**
   - Complete technical implementation plan
   - All 7 phases in detail
   - Database schema
   - Code examples

2. **[CAPTURE-INSTRUCTIONS.md](CAPTURE-INSTRUCTIONS.md)**
   - Step-by-step network capture guide
   - PDF export capture procedure
   - Register capture procedure
   - Troubleshooting guide

3. **[ERR-ABORTED-FIX-COMPLETE.md](ERR-ABORTED-FIX-COMPLETE.md)**
   - Session timeout fix documentation
   - ERR_ABORTED error handling
   - Applied to all 5 existing scripts

4. **[SESSION-TIMEOUT-FIX-COMPLETE.md](SESSION-TIMEOUT-FIX-COMPLETE.md)**
   - Session management implementation
   - Auto re-login functionality
   - Periodic session refresh

5. **[NEW-REGISTERS-SUMMARY.md](NEW-REGISTERS-SUMMARY.md)**
   - Summary of 3 new registers added
   - ANC, Consulting Room, Medical Laboratory
   - Endpoint details and parameters

6. **[MULTI-REGISTER-EXTRACTION-PLAN.md](MULTI-REGISTER-EXTRACTION-PLAN.md)**
   - Original plan for extracting all 12 registers
   - Priority ordering
   - 6-phase strategy

---

## Technology Stack

### Data Extraction:
- Node.js + Playwright
- Network capture analysis (HAR files)

### Data Processing:
- Python 3.x
- pandas (data manipulation)
- openpyxl (Excel reading)
- PyPDF2/pdfplumber (PDF parsing - optional)

### Database:
- SQLite (single-file, offline-capable)

### Web Interface:
- Streamlit (recommended) or Flask
- HTML/CSS for UI
- reportlab (PDF generation)

### Statistical Analysis:
- SPSS (optional)
- Python matplotlib/seaborn (alternative)

---

## System Requirements

**Hardware**:
- Windows PC (already available)
- 4 GB RAM minimum
- 10 GB disk space (database + PDFs + backups)

**Software**:
- Python 3.x (installed)
- Node.js (installed)
- Playwright (installed)
- SQLite (built-in with Python)
- Chrome/Edge browser

**Network**:
- No internet required for operation
- Hospital network access for multi-workstation deployment

---

## Timeline Summary

| Week | Phase | YOU | ME | Status |
|------|-------|-----|----|----|
| 1 | Data Extraction | Capture PDFs + registers | Create scripts | 🔴 IN PROGRESS |
| 2-3 | Consolidation | Review data quality | Clean data, analyze PDFs | ⬜ PENDING |
| 3-4 | Database | Test queries | Build database | ⬜ PENDING |
| 4-5 | Web Interface | Test interface | Build web app | ⬜ PENDING |
| 5-6 | SPSS (optional) | Review reports | Create templates | ⬜ PENDING |
| 6-7 | Deployment | Training | Documentation | ⬜ PENDING |
| Ongoing | Maintenance | Use system | Support | ⬜ PENDING |

---

## Immediate Next Steps

### 🔴 YOUR ACTION REQUIRED (THIS WEEK):

#### Step 1: Capture PDF Export (2-3 hours)
**Priority**: CRITICAL

1. Read: [CAPTURE-INSTRUCTIONS.md](CAPTURE-INSTRUCTIONS.md)
2. Capture PDF export for 3 patients
3. Save HAR files to: `network-captures/`
4. Save sample PDFs to: `network-captures/`

**Files needed**:
```
network-captures/patient-pdf-export-VR-A01-AAA1193.har
network-captures/patient-record-VR-A01-AAA1193.pdf
network-captures/patient-pdf-export-VR-A01-AAA1194.har
network-captures/patient-record-VR-A01-AAA1194.pdf
network-captures/patient-pdf-export-VR-A01-AAA1195.har
network-captures/patient-record-VR-A01-AAA1195.pdf
```

#### Step 2: Capture Remaining Registers (3-5 hours)
**Priority**: CRITICAL

1. Read: [CAPTURE-INSTRUCTIONS.md](CAPTURE-INSTRUCTIONS.md)
2. Capture each of 7 remaining registers
3. Save HAR files to: `network-captures/`
4. Save sample Excel to: `data/[register-name]/`
5. Document in: `network-captures/[register-name]-notes.txt`

**Registers to capture**:
```
⬜ Maternity Ward
⬜ Admission & Discharge
⬜ Post Natal Care Mother
⬜ Post Natal Care Child
⬜ General Ward
⬜ Family Planning
⬜ Child Welfare Clinic
```

#### Step 3: Share Captures
Once complete, let me know and I'll:
1. Analyze all HAR files
2. Create extraction scripts
3. Test scripts
4. Run full data extraction

---

## Success Criteria

### Phase 1 (Week 1):
✅ All 12 registers captured
✅ PDF export workflow captured
✅ Sample PDFs collected

### Phase 4 (Week 5):
✅ Patient lookup < 2 seconds
✅ PDF records accessible
✅ System works offline

### Phase 6 (Week 7):
✅ Health workers trained
✅ System deployed on 3+ workstations
✅ Backup procedures established

### Overall Project:
✅ Complete patient data before lockout
✅ Offline system operational
✅ Health workers confident using system
✅ Business continuity achieved

---

## Risk Management

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Incomplete extraction before lockout | HIGH | Prioritize this week | 🔴 ACTIVE |
| PDF endpoint changes | HIGH | Capture NOW | 🔴 ACTIVE |
| Large PDF storage needs | MEDIUM | Compress, prioritize active patients | ✅ PLANNED |
| User adoption issues | MEDIUM | Simple interface, training | ✅ PLANNED |
| Hardware failure | LOW | Multiple backups, USB drives | ✅ PLANNED |

---

## Budget

**Total Cost**: < $70 USD

- Software: $0 (all free/open source)
- 3× USB drives (16GB): ~$20-30
- External HD (500GB): ~$20-40
- **Total**: ~$40-70

---

## Support

**Questions?**
- Review documentation in this folder
- Check [CAPTURE-INSTRUCTIONS.md](CAPTURE-INSTRUCTIONS.md) for detailed steps
- Review [PATIENT-DATABASE-COMPLETE-PLAN.md](PATIENT-DATABASE-COMPLETE-PLAN.md) for technical details

**Ready to start?**
- Begin with PDF export capture (30 minutes)
- Follow instructions in [CAPTURE-INSTRUCTIONS.md](CAPTURE-INSTRUCTIONS.md)
- Let me know when captures are complete

---

## Project Files Structure

```
lhims-fix/
├── README-PATIENT-DATABASE.md           ← You are here
├── PATIENT-DATABASE-COMPLETE-PLAN.md    ← Complete technical plan
├── CAPTURE-INSTRUCTIONS.md              ← Network capture guide
├── ERR-ABORTED-FIX-COMPLETE.md
├── SESSION-TIMEOUT-FIX-COMPLETE.md
├── NEW-REGISTERS-SUMMARY.md
├── MULTI-REGISTER-EXTRACTION-PLAN.md
│
├── data/
│   ├── opd-register/                    ← 30 files ✅
│   ├── ipd-morbidity-mortality/         ← 31 files ✅
│   ├── anc-register/                    ← 33 files ✅
│   ├── consulting-room/                 ← 34 files ✅
│   ├── medical-laboratory/              ← 34 files ✅
│   ├── maternity-ward/                  ← Pending ⬜
│   ├── admission-discharge/             ← Pending ⬜
│   ├── postnatal-mother/                ← Pending ⬜
│   ├── postnatal-child/                 ← Pending ⬜
│   ├── general-ward/                    ← Pending ⬜
│   ├── family-planning/                 ← Pending ⬜
│   ├── child-welfare/                   ← Pending ⬜
│   ├── patient-pdfs/                    ← Pending ⬜
│   ├── master_patient_list.xlsx         ← To be created
│   ├── data_quality_report.xlsx         ← To be created
│   └── database/
│       └── lhims_patients.db            ← To be created
│
├── scripts/
│   ├── extract-opd-data.js              ← Completed ✅
│   ├── extract-ipd-data.js              ← Completed ✅
│   ├── extract-anc-data.js              ← Completed ✅
│   ├── extract-consulting-room-data.js  ← Completed ✅
│   ├── extract-medical-lab-data.js      ← Completed ✅
│   ├── extract-patient-pdfs.js          ← To be created
│   ├── create-master-patient-list.py    ← To be created
│   ├── data-quality-report.py           ← To be created
│   ├── create-database.py               ← To be created
│   ├── import-excel-data.py             ← To be created
│   └── ... (7 more register scripts)
│
├── network-captures/                    ← Create this folder
│   ├── patient-pdf-export-*.har         ← You will create
│   ├── patient-record-*.pdf             ← You will create
│   ├── maternity-ward-export.har        ← You will create
│   └── ... (7 more register captures)
│
├── web-interface/                       ← To be created
│   ├── app.py
│   ├── patient_lookup.py
│   └── templates/
│
└── backups/                             ← To be created
    ├── weekly/
    ├── monthly/
    └── offsite/
```

---

**Status**: 🔴 CRITICAL - Data extraction must complete THIS WEEK

**Next Action**: Capture PDF export workflow (see [CAPTURE-INSTRUCTIONS.md](CAPTURE-INSTRUCTIONS.md))

**Let me know when you're ready to start!**
