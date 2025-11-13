# LHIMS Data Extraction Project - Volta Regional Hospital Hohoe

## ⚠️ CRITICAL: CORRECT PROJECT LOCATION ⚠️

**ALWAYS work in this location**: `/home/kelib/Desktop/projects/lhims-fix/nextjs-starter/`

**NEVER work in**: `/home/kelib/Desktop/projects/nextjs-starter/` (this is the ORIGINAL repo, NOT the clone)

**Why this matters**:
- The user cloned the nextjs-starter project INTO the lhims-fix directory
- All hospital system work (migration scripts, database, Next.js app) is in the CLONED version
- The original nextjs-starter at `/home/kelib/Desktop/projects/nextjs-starter/` should NOT be touched
- The data files are at `/home/kelib/Desktop/projects/lhims-fix/data/` (parent of nextjs-starter clone)

**Correct paths for hospital system**:
- Next.js app: `/home/kelib/Desktop/projects/lhims-fix/nextjs-starter/`
- Migration scripts: `/home/kelib/Desktop/projects/lhims-fix/nextjs-starter/scripts/`
- Prisma schema: `/home/kelib/Desktop/projects/lhims-fix/nextjs-starter/prisma/schema.prisma`
- Database: `/home/kelib/Desktop/projects/lhims-fix/nextjs-starter/prisma/dev.db`
- Excel data source: `/home/kelib/Desktop/projects/lhims-fix/data/` (shared with parent project)

**When running scripts, use**:
```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
node scripts/import-excel-to-postgres.js
```
**Document features in the plan/documentations folder and reference them in the readme**:
---

## IMPORTANT INSTRUCTIONS FOR AI ASSISTANTS

### Memory Management Protocol

**BEFORE starting any new task**:
1. **READ** `PROJECT-CONTEXT.md` - Get current project status, key facts, and technical decisions
2. **CHECK** for active blockers and pending issues
3. **REVIEW** architecture patterns and gotchas to avoid common mistakes

**AFTER completing any major task**:
1. **UPDATE** `PROJECT-CONTEXT.md` with any changed facts:
   - New patient counts or statistics
   - Changed regex patterns or API endpoints
   - New gotchas or limitations discovered
   - Updated project status or blockers
   - **NOTE**: Update current facts only, do not add historical changelog

2. **ASK ABOUT COMMIT**: After major changes, always ask:
   - "Should I commit these changes?"
   - Wait for user approval before committing
   - Never commit secrets (.env, credentials, API keys, passwords)

3. **DOCUMENT** (if generating new documentation):
   - Put AI-generated docs in `plan/documentation/`
   - Keep user-facing guides in root (README.md, USAGE.md)

---

## Project Overview

**Hospital**: Volta Regional Hospital, Hohoe, Ghana
**System**: LHIMS (Lightwave Health Information Management System)
**LHIMS URL**: http://10.10.0.59/lhims_182 (Local network only)
**Primary Goal**: Extract critical patient and operational data before facility lockout
**Started**: November 7, 2025

## Current Situation

- LHIMS vendor is systematically locking out facilities from the platform
- Multiple facilities in Volta Regional Health (VRH) are already locked out
- VRH Hohoe still has access but expects lockout soon
- No direct database access - only dashboard and reports
- Hospital cannot access critical patient data after lockout
- Need contingency plan for continuity of care

## Technical Environment

### Network Setup
- **LHIMS Access**: Local hospital network only (10.10.0.59)
- **Internet Access**: Slow hospital internet
- **Workflow**: Must disconnect from external network and connect to hospital network to access LHIMS
- **Extraction Strategy**: Create scripts to run offline on hospital network

### User's Computer
- **OS**: Windows (c:\Users\Kelib\Desktop\projects\lhims-fix)
- **Capabilities**: Can run Node.js scripts, Playwright browser automation
- **Access Level**: Full access to most LHIMS modules and reports

## Project Phases

### Phase 1: OPD Morbidity Data Extraction (CURRENT)
**Priority**: Outpatient Department (OPD) monthly morbidity reports

**Objective**:
1. Capture browser network requests when manually downloading OPD morbidity Excel report
2. Reverse-engineer the API endpoint used to generate the report
3. Create automated script to download historical monthly data (all departments)
4. Extract as much historical data as possible

**Why OPD First**:
- High patient volume department
- Critical for understanding disease patterns
- Used for facility reporting to Ghana Health Service
- Monthly Excel reports available in dashboard

### Phase 2: Other Critical Data (PLANNED)
After OPD success, apply same technique to:
1. Laboratory results and test data
2. Pharmacy dispensing records
3. NHIS (National Health Insurance) claims data
4. Patient demographics and registration
5. Appointment schedules
6. Vital signs and clinical observations
7. Diagnosis records (ICD-10)
8. Radiology reports

### Phase 3: Contingency System (PLANNED)
Build offline patient lookup system using extracted data

## Data Extraction Strategy

### Approach: Network Traffic Analysis
Instead of complex browser automation, we:
1. **Capture**: Record ALL network requests while manually using LHIMS
2. **Analyze**: Identify the specific API endpoint that serves Excel data
3. **Automate**: Replay those API calls programmatically for different date ranges
4. **Extract**: Download months/years of historical data quickly

### Advantages
- No need to navigate complex UI programmatically
- Faster extraction (direct API calls)
- More reliable (no UI changes breaking scripts)
- Works with slow network (can batch and resume)
- Reusable for other LHIMS reports

## Tools & Scripts

### 1. playwright-har-capture.js
**Purpose**: Capture ALL browser network traffic during manual LHIMS navigation
**How it works**:
- Launches Chromium browser with HAR recording enabled
- Records every HTTP request/response (URLs, headers, cookies, payloads)
- User manually navigates to OPD report and downloads Excel
- Saves complete network traffic to HAR (HTTP Archive) JSON file

**Usage**:
```bash
node scripts/playwright-har-capture.js
```

### 2. analyze-requests.js
**Purpose**: Analyze captured HAR file to identify the Excel download endpoint
**How it works**:
- Reads HAR JSON file
- Filters for Excel/download requests
- Shows API endpoint URL, parameters, authentication
- Extracts the pattern we need to automate

**Usage**:
```bash
node scripts/analyze-requests.js data/captures/lhims-session.har
```

### 3. extract-opd-morbidity.js (TO BE CREATED)
**Purpose**: Automated extraction of historical OPD morbidity data
**How it works**:
- Authenticates to LHIMS using discovered mechanism
- Loops through specified date range (month by month)
- Calls OPD morbidity API endpoint for each month
- Downloads and saves Excel files
- Handles errors and resumes from last successful download

**Usage** (planned):
```bash
node scripts/extract-opd-morbidity.js --start-date 2023-01 --end-date 2025-10
```

## Project Structure

```
lhims-fix/
├── @CLAUDE.md                    # This file - project memory
├── USAGE.md                      # Step-by-step instructions for user
├── package.json                  # Node.js dependencies
├── .gitignore                    # Exclude sensitive data
│
├── scripts/
│   ├── playwright-har-capture.js    # Network traffic recorder
│   ├── analyze-requests.js          # HAR file analyzer
│   └── extract-opd-morbidity.js     # Automated OPD data extractor (to be created)
│
├── data/
│   ├── captures/                    # Saved HAR files (network traffic)
│   ├── opd-morbidity/              # Downloaded OPD Excel files
│   ├── laboratory/                  # Lab data (future)
│   ├── pharmacy/                    # Pharmacy data (future)
│   └── database/                    # SQLite database files (future)
│
├── analysis/
│   └── discovered-endpoints.json    # Documented API endpoints
│
└── docs/
    ├── lhims-navigation-map.md     # Screenshots and navigation paths
    └── api-documentation.md         # Reverse-engineered API docs
```

## Discovered LHIMS Information

### Access & Authentication
- **Login URL**: (To be documented after capture)
- **Session Mechanism**: (Cookie-based? Token? To be discovered)
- **Session Duration**: (To be tested)

### OPD Morbidity Report
- **Dashboard Path**: (To be documented during manual navigation)
- **Report Options**:
  - Monthly frequency
  - Department selection: "All Departments"
  - Export format: Excel
- **API Endpoint**: (To be discovered from HAR analysis)
- **Required Parameters**: (To be discovered)
- **Date Range Available**: (To be tested - how far back can we go?)

### Data Format
- **Export Format**: Excel (.xlsx or .xls)
- **Data Structure**: (To be documented after first capture)
- **Fields Included**: (To be analyzed)

## Extraction Progress Log

### Session 1: [Date to be added]
- **Goal**: Capture network traffic for OPD morbidity download
- **Status**: Pending
- **Actions**:
  - [ ] Run playwright-har-capture.js
  - [ ] Manually navigate to OPD morbidity report
  - [ ] Select monthly report, all departments
  - [ ] Download Excel file
  - [ ] Save HAR file for analysis
- **HAR File**: (Filename to be added)
- **Notes**: (Observations to be added)

### Session 2: [Date to be added]
- **Goal**: Analyze HAR file and identify API endpoint
- **Status**: Pending
- **Findings**: (To be documented)

### Session 3: [Date to be added]
- **Goal**: Test automated extraction script
- **Status**: Pending
- **Results**: (To be documented)

## Critical Data Fields to Extract (by Priority)

### Priority 1: Patient Care Continuity
1. Patient demographics (ID, NHIS number, name, DOB, contact)
2. Active medications and prescriptions
3. Allergies and adverse reactions
4. Active diagnoses (ICD-10 codes)
5. Recent vital signs

### Priority 2: Clinical Information
6. Laboratory results (last 12 months)
7. Visit history and clinical notes
8. Upcoming appointments
9. Procedure records
10. Radiology reports

### Priority 3: Administrative
11. NHIS claims data
12. Pharmacy dispensing records
13. Billing information
14. Statistical reports (like OPD morbidity)

## Known Limitations & Challenges

1. **Network Access**: Must be on hospital local network to access LHIMS
2. **Slow Internet**: Hospital has slow connectivity - scripts must be patient
3. **Session Timeouts**: Unknown session duration - may need re-authentication
4. **Rate Limiting**: Unknown if LHIMS has request throttling
5. **Data Completeness**: Dashboard may not expose all data in database
6. **Historical Depth**: Unknown how far back historical data is available

## Security & Privacy Considerations

- **Data Ownership**: Hospital owns patient data, has right to extract
- **Access Authorization**: User has legitimate access to LHIMS system
- **Data Protection**: Extracted data contains PHI - must be secured
- **Local Storage**: Keep all data on encrypted local drives
- **No Cloud Upload**: Do not upload patient data to cloud services
- **Access Control**: Limit access to extracted data to authorized clinical staff

## Next Steps (After OPD Success)

1. Apply same technique to other report types
2. Build comprehensive SQLite database schema
3. Create patient data extraction scripts
4. Develop offline contingency web application
5. Train hospital staff on backup system
6. Establish regular backup procedures

## Contact & Support

- **Project Lead**: User (Volta Regional Hospital Hohoe)
- **Technical Assistant**: Claude (Anthropic)
- **Documentation**: All discoveries documented in this file

## Changelog

- **2025-11-07**: Project initiated, created memory file and initial scripts
- (Future updates to be added here)

---

**IMPORTANT REMINDERS**:
- Always disconnect from external network before connecting to hospital network
- Save HAR files immediately after capture (they contain session cookies)
- Document every discovery in this file
- Test extraction scripts on single month before bulk extraction
- Keep multiple backups of extracted data
- Monitor LHIMS access status daily
