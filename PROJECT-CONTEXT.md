# LHIMS Data Extraction - Project Context

**Last Updated**: 2025-11-12
**Project**: LHIMS Replacement System Development
**Facility**: Volta Regional Hospital, Hohoe, Ghana

---

## Project Status

- **Current Phase**: Building LHIMS Replacement System
- **Total Patients Discovered**: 70,079
- **Patients Extracted (JSON)**: 70,079 (100% - Successfully completed)
- **Patients Extracted (PDF)**: OPD and IPD PDFs extracted
- **Current Goal**: Build modern replacement system for LHIMS with familiar UI

---

## System Access

### LHIMS Environment
- **URL**: http://10.10.0.59/lhims_182
- **Network**: Hospital local network only (must disconnect from external network)
- **Access Level**: Full access to most modules and reports
- **Session Type**: Cookie-based authentication via Playwright

### User Environment
- **OS**: Linux (development), Windows (hospital deployment)
- **Working Directory**: `/home/kelib/Desktop/projects/lhims-fix`
- **Runtime**: Node.js with Playwright browser automation

---

## Patient Data

### Patient ID Format
- **Pattern**: `/[A-Z]{2}-[A-Z]\d{2}-[A-Z]{3}\d+/`
- **Facility Codes**: VR, AB, AC, OT, HO (all accepted)
- **Examples**:
  - VR-A01-AAA0001
  - AB-A01-AAB9293
  - OT-A02-AAE7012

### Patient Lists
- **Master List**: `master-patient-list.txt` (70,068 unique patients)
- **Source Data**: 166 Excel files from 5 registers (OPD, IPD, ANC, Consulting, Lab)
- **Date Range**: 2023-2025

---

## Data Extraction Architecture

### Authentication Flow
1. Playwright launches browser with persistent session
2. User logs in manually (credentials not stored in code)
3. Cookies persist for subsequent API calls
4. Session timeout: Implement 30-second keep-alive

### Patient Data Extraction Flow
```
Patient Number (VR-A01-AAA0001)
  ↓
Search API → Returns internal database ID (numeric)
  ↓
Use database ID for all subsequent API calls:
  - IPD (admissions)
  - OPD (consultations)
  - Prescriptions
  - Lab results
  - Vaccinations
  - Attachments
  ↓
Save to: data/patient-json/[PATIENT-NO]/
```

### PDF Extraction Flow
```
Patient Number
  ↓
Search → Get database ID
  ↓
Navigate to patient record page
  ↓
Generate PDF (two methods):
  1. LHIMS native PDF export (primary)
  2. Browser print-to-PDF (fallback)
  ↓
Save to: data/patient-pdfs/[PATIENT-NO].pdf
```

---

## Key Scripts

### Patient List Management
- `scripts/generate-patient-list.js` - Deduplicate patient IDs from Excel files
- Pattern used: `/[A-Z]{2}-[A-Z]\d{2}-[A-Z]{3}\d+/` (line 29)

### Data Extraction
- `scripts/extract-patient-json.js` - Extract structured JSON data (6 endpoints)
- `scripts/extract-patient-pdf.js` - Extract complete PDF records
- `scripts/extract-patient-pdf-fast.js` - Optimized PDF extraction
- `scripts/add-pdf-links.js` - Link PDFs to patient metadata

### Analysis & Setup
- `scripts/search-patient.js` - Test patient search functionality
- `scripts/init-database.js` - Initialize SQLite database
- `scripts/playwright-har-capture.js` - Capture network traffic for analysis

---

## Data Storage Structure

```
data/
├── patient-json/              # Structured patient data
│   └── [PATIENT-NO]/
│       ├── _metadata.json     # Patient info + database ID mapping
│       ├── ipd.json          # Admissions
│       ├── opd.json          # Consultations
│       ├── prescriptions.json
│       ├── lab-results.json
│       ├── vaccinations.json
│       └── attachments.json
│
├── patient-pdfs/              # Complete PDF records
│   └── [PATIENT-NO].pdf      # e.g., VR-A01-AAA0001.pdf
│
├── opd-register/              # Source Excel files (34 files)
├── ipd-morbidity-mortality/   # Source Excel files (31 files)
├── anc-register/              # Source Excel files (33 files)
├── consulting-room/           # Source Excel files (34 files)
└── medical-laboratory/        # Source Excel files (34 files)
```

---

## Critical Gotchas

### Network & Access
1. **Hospital Network Required**: LHIMS only accessible on 10.10.0.59 (local network)
2. **Must Disconnect External Network**: Cannot access LHIMS while connected to internet
3. **Slow Hospital Internet**: Scripts must be patient, implement retries

### Extraction Issues
1. **Browser Timeout**: Sessions timeout frequently - implement 30s keep-alive
2. **Low Success Rate**: Currently 10.2% JSON extraction success (mostly timeout errors)
3. **Use Database ID for APIs**: Patient number searches return internal ID, use ID for all API calls
4. **Resume Capability Essential**: Extractions take days, must support stop/resume

### Data Handling
1. **Never Commit Secrets**: Check for .env, credentials.json, passwords before commits
2. **PHI Protection**: Patient data contains Protected Health Information - local only
3. **Facility Codes Matter**: Accept all facility codes (VR, AB, AC, OT, etc.), not just VR

---

## Performance Estimates

### JSON Extraction (70,068 patients)
- **Per Patient**: ~5-10 seconds (with current timeout issues)
- **Total Time**: Unknown (10.2% success rate needs investigation)

### PDF Extraction (70,068 patients)
- **Per Patient**: ~10-15 seconds
- **Total Time**: ~194-291 hours (8-12 days continuous)
- **Disk Space**: ~14-35 GB (200-500 KB per PDF)

---

## Active Blockers

1. **Low JSON Extraction Success Rate** (10.2%)
   - Error: "browser has been closed" (90% of failures)
   - Root cause: Session/timeout issues, not patient ID lookup
   - Solution pending: Better session management

2. **PDF Extraction Untested**
   - Scripts created but not validated
   - Need test run on sample patients first

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Use patient number → database ID pattern | LHIMS API requires internal database ID for all data endpoints |
| Dual extraction (JSON + PDF) | JSON for queries/analysis, PDF for complete medical records |
| Accept all facility codes | Hospital serves multiple facilities, found 9k+ non-VR patients |
| Resume capability in all scripts | Extractions take days, power/network interruptions expected |
| Never store credentials in code | Use .env file, exclude from git |
| 30-second session keep-alive | Prevents LHIMS session timeout during long operations |

---

## API Endpoints (Discovered)

All endpoints require authentication via cookies:

- **Search Patient**: Returns `patient_id` (internal database ID)
- **IPD Data**: `/lhims_182/api/ipd?patient_id=[ID]`
- **OPD Data**: `/lhims_182/api/opd?patient_id=[ID]`
- **Prescriptions**: `/lhims_182/api/prescriptions?patient_id=[ID]`
- **Lab Results**: `/lhims_182/api/lab?patient_id=[ID]`
- **Vaccinations**: `/lhims_182/api/vaccines?patient_id=[ID]`
- **Attachments**: `/lhims_182/api/attachments?patient_id=[ID]`

---

## Git & Documentation

### Git Workflow
- After major changes, AI should ask: "Should I commit these changes?"
- Never commit: `.env`, `credentials.json`, `*.log`, `data/` directories
- Check `.gitignore` before any commit

### Documentation Location
- **User Guides**: Root directory (README.md, USAGE.md, etc.)
- **AI-Generated Docs**: `plan/documentation/`
- **Session Memory**: `plan/ACTIVITIES.md` (historical log, optional)

---

## Quick Commands

```bash
# Regenerate master patient list
node scripts/generate-patient-list.js

# Extract patient JSON data
node scripts/extract-patient-json.js

# Extract patient PDFs (test mode)
node scripts/extract-patient-pdf.js test-pdf-extraction.txt

# Extract patient PDFs (full)
node scripts/extract-patient-pdf.js

# Add PDF links to metadata
node scripts/add-pdf-links.js

# Count patients in master list
grep -c "^[A-Z]" master-patient-list.txt
```

---

## New Phase: LHIMS Replacement System Development

### Overview
Building a complete hospital information system to replace LHIMS, maintaining familiar UI while improving performance and adding modern features.

### Technology Stack Implemented
- **Frontend**: Next.js 16.0.1 (App Router) with TypeScript ✅
- **Database**: PostgreSQL 15 (via Docker) ✅
- **UI**: shadcn/ui + Tailwind CSS 4 ✅
- **Authentication**: Custom JWT-based auth with NextAuth.js patterns ✅
- **ORM**: Prisma 5.22.0 ✅

### Current Development Status (Updated: 2025-11-12)

**Project Location**: `/home/kelib/Desktop/projects/lhims-fix/nextjs-starter/`

**Database Statistics**:
- **Patients**: 70,355 (fully migrated from SQLite to PostgreSQL)
- **Visits**: 1,071,138
- **Diagnoses**: 556,840
- **Medications**: 443,937
- **Lab Orders**: (populated)
- **ANC Visits**: (populated)
- **Admissions**: (populated)

**Development Server**: Running on http://localhost:3001

**Completed Features** ✅:

1. **Patient Search Module**
   - Full-text search across patient name, number, NHIS, phone
   - Patient cards with demographics, contact info, visit counts
   - Pagination controls (First, Previous, Next, Last)
   - Responsive design with loading states
   - Location: `/dashboard/patients`

2. **Patient Detail Module**
   - Complete patient demographics display
   - Statistics cards (visits, diagnoses, medications, lab tests)
   - Tabbed interface for:
     - Recent visits (last 10) with diagnoses
     - Diagnosis history (last 10)
     - Medication history (last 10)
     - PDF records viewer
   - Location: `/dashboard/patients/[patientNo]`

3. **Hospital Dashboard**
   - Total patients, visits, diagnoses statistics
   - Gender distribution visualization
   - Visit type distribution (last 30 days)
   - Quick action links
   - Location: `/dashboard`

4. **PDF Viewing System**
   - Protected PDF API route with authentication
   - Secure PDF serving from file system
   - Direct viewing in browser (new tab)
   - API: `/api/patients/[patientNo]/pdfs?file=[filename]`
   - PDFs stored: `/home/kelib/Desktop/projects/lhims-fix/data/patient-pdfs/`

5. **API Endpoints**
   - `GET /api/patients/search` - Patient search with pagination
   - `GET /api/patients/[patientNo]` - Patient details with relations
   - `GET /api/patients/stats` - Hospital-wide statistics
   - `GET /api/patients/[patientNo]/pdfs` - Secure PDF serving

6. **Database Schema**
   - Complete hospital management schema (11 models)
   - All relationships configured
   - Indexes for performance
   - 10 migrations applied successfully

**Module Completion Status**:
- ✅ Patient Search & Management (90% - core features complete)
- ✅ Patient Detail Views (90% - core features complete)
- ✅ Dashboard Statistics (100%)
- ✅ PDF Viewing (100%)
- ✅ Authentication System (100%)
- ⏳ OPD Module (0% - not started)
- ⏳ IPD Module (0% - not started)
- ⏳ Lab Module (0% - not started)
- ⏳ Pharmacy Module (0% - not started)
- ⏳ Reports & Analytics (0% - not started)

**Ready for Testing**:
The application is ready for testing with real hospital data. Users can:
1. Log in to the system
2. Search for any of the 70,355 patients
3. View complete patient history
4. Open patient PDF records
5. View hospital-wide statistics

## Next Steps

### Immediate (Testing Phase)
1. ✅ Test patient search functionality with real data
2. ✅ Test patient detail page data accuracy
3. ✅ Test PDF viewing functionality
4. Test authentication and authorization flows
5. Gather user feedback from hospital staff

### Short-term (Feature Completion)
1. Add visit creation/editing functionality
2. Implement prescription management
3. Build lab order and result entry
4. Create IPD admission/discharge workflows
5. Add comprehensive reporting

### Medium-term (Deployment Preparation)
1. Set up production PostgreSQL server
2. Configure Nginx reverse proxy
3. Implement proper logging and monitoring
4. Create backup and disaster recovery procedures
5. Write user documentation and training materials
