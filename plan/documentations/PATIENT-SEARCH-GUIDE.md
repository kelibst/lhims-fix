# Patient Search System - User Guide

**Volta Regional Hospital, Hohoe**
**Version**: 1.0 (MVP)
**Last Updated**: November 10, 2025

---

## Overview

The Patient Search System is an offline-capable web application that provides quick access to patient records extracted from LHIMS Excel exports. It allows hospital staff to search for patients and view their visit history, diagnoses, and medications.

---

## Features

- **Fast Patient Search**: Search by Patient ID, Name, NHIS Number, or Phone
- **Complete Bio Data**: View patient demographics and visit statistics
- **Visit History**: Browse OPD visits and IPD admissions chronologically
- **Clinical Information**: View diagnoses, medications, and lab orders
- **Offline Operation**: Works without internet connection (uses local database)
- **Responsive Design**: Works on desktop, tablet, and mobile devices

---

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, Linux, or macOS
- **Node.js**: Version 16 or higher
- **RAM**: 4 GB minimum (8 GB recommended)
- **Disk Space**: 2 GB free space (for database and application)
- **Browser**: Modern web browser (Chrome, Firefox, Edge, Safari)

### Check if Node.js is Installed
```bash
node --version
# Should show v16.0.0 or higher
```

If Node.js is not installed, download it from [https://nodejs.org/](https://nodejs.org/)

---

## Installation & Setup

### First-Time Setup

**Step 1: Initialize the Database**
```bash
node scripts/init-database.js
```
This creates the SQLite database with all necessary tables and indexes.

**Step 2: Import Excel Data**
```bash
node scripts/import-excel-data.js
```
This imports all patient data from the Excel files in the `data/` directory.
**Note**: This process may take 5-15 minutes depending on the amount of data.

---

## Starting the System

### On Windows
Simply double-click `start-patient-search.bat`

Or from Command Prompt:
```cmd
start-patient-search.bat
```

### On Linux/Mac
```bash
./start-patient-search.sh
```

Or manually:
```bash
node server/api.js
```

### Access the Application
Once the server starts, open your web browser and go to:
```
http://localhost:3000
```

---

## Using the Patient Search System

### Home Page - Patient Search

1. **Search for a Patient**
   - Enter any of the following in the search box:
     - Patient ID (e.g., VR-A01-AAA0001)
     - Patient Name (e.g., John Doe)
     - NHIS Number (e.g., 70796930)
     - Phone Number (e.g., 0540605847)
   - Click "Search" or press Enter

2. **View Search Results**
   - Results show patient cards with:
     - Full name and patient ID
     - Gender, age, NHIS number
     - Contact information and address
     - Total visits and last visit date
   - Click any patient card to view full details

### Patient Detail Page

The patient detail page shows comprehensive information organized in sections:

#### 1. Patient Information Card
- Full demographics (name, ID, gender, age)
- Contact information (phone, address)
- NHIS details
- Visit summary statistics
- First and last visit dates

#### 2. OPD & Consulting Visits
- Timeline of outpatient visits
- Visit dates and departments
- Diagnoses for each visit
- ICD-10 codes (if available)
- Link to view full visit PDF (coming soon)

#### 3. IPD Admissions
- Timeline of inpatient admissions
- Admission dates
- Diagnoses and procedures
- Discharge information
- Link to view full admission PDF (coming soon)

#### 4. Diagnosis History
- All recorded diagnoses chronologically
- Diagnosis type (Principal, Additional, Provisional)
- Case type (New, Old, Recurring)
- ICD-10 codes

#### 5. Medication History
- All prescribed and dispensed medications
- Medication dates
- Medication details

---

## Tips & Best Practices

### Searching
- **Be specific**: Use full patient IDs for exact matches
- **Partial search**: Enter part of a name to find multiple matches
- **Numbers only**: Phone and NHIS searches work with numbers only
- **Minimum 2 characters**: Search requires at least 2 characters

### Performance
- **First search may be slow**: Database indexes are being loaded
- **Subsequent searches are fast**: Results appear within 1 second
- **Limit results**: System returns top 50 matches by default

### Data Freshness
- Data is from Excel exports dated 2023-2025
- To update data, re-import new Excel files
- System does NOT connect to live LHIMS

---

## Troubleshooting

### Server Won't Start

**Problem**: "Database not found" error

**Solution**:
```bash
# Initialize database first
node scripts/init-database.js

# Then import data
node scripts/import-excel-data.js
```

---

**Problem**: "Node.js not found" error

**Solution**: Install Node.js from [https://nodejs.org/](https://nodejs.org/)

---

**Problem**: "Cannot find module" error

**Solution**:
```bash
# Install dependencies
npm install
```

---

### Search Not Working

**Problem**: "Failed to connect to server" error

**Solution**:
1. Ensure server is running (should show "Server running on http://localhost:3000")
2. Check that port 3000 is not used by another application
3. Try restarting the server

---

**Problem**: No results found

**Solution**:
1. Check spelling of search terms
2. Try searching with patient ID instead of name
3. Verify data has been imported (check database file exists)

---

### Browser Issues

**Problem**: Page not loading

**Solution**:
1. Clear browser cache
2. Try a different browser (Chrome recommended)
3. Check server is running
4. Verify URL is correct: `http://localhost:3000`

---

## Data Management

### Backup Database
```bash
# Create backup
cp data/database/patient-care-system.db data/database/backup-YYYY-MM-DD.db
```

### Re-import Data
If you have new Excel files:
```bash
# Place new Excel files in appropriate data/ subdirectories
# Then re-import
node scripts/import-excel-data.js
```

The import script will skip previously imported files.

### Database Location
```
data/database/patient-care-system.db
```

---

## Security & Privacy

### Data Protection
- **All data is stored locally** on your computer
- **No internet connection required** for operation
- **No data leaves your machine** unless explicitly exported
- **Protected Health Information (PHI)** - treat database file as confidential

### Access Control
- System does not have user authentication (single-user mode)
- To restrict access:
  - Control physical access to the computer
  - Use Windows user accounts with passwords
  - Keep the system offline when not in use

### Best Practices
1. **Do not commit database to git** (already in .gitignore)
2. **Do not share database file** over email or cloud storage
3. **Backup regularly** to encrypted external drive
4. **Restrict access** to authorized clinical staff only

---

## API Endpoints (For Developers)

If you need to integrate with other systems, the following REST API endpoints are available:

### Search
```
GET /api/search?q=<query>&limit=20
```

### Patient Details
```
GET /api/patient/:patient_no
```

### OPD Visits
```
GET /api/patient/:patient_no/opd-visits
```

### IPD Admissions
```
GET /api/patient/:patient_no/ipd-admissions
```

### Diagnoses
```
GET /api/patient/:patient_no/diagnoses
```

### Medications
```
GET /api/patient/:patient_no/medications
```

### Lab Orders
```
GET /api/patient/:patient_no/lab-orders
```

### System Statistics
```
GET /api/stats
```

All endpoints return JSON responses.

---

## Known Limitations

### Current MVP Limitations
1. **Read-only system** - Cannot add or modify patient data
2. **No PDF generation** - "View PDF" buttons show "coming soon" message
3. **No user authentication** - Single-user mode only
4. **Excel data only** - Does not include full LHIMS clinical records
5. **No real-time updates** - Data is snapshot from Excel exports

### Data Completeness
- **Visit logs**: ✓ Complete from Excel
- **Diagnoses**: ✓ Available (ICD-10 codes where recorded)
- **Medications**: ✓ Prescribed/dispensed from Consulting Room data
- **Lab orders**: ✓ Test requests recorded
- **Lab results**: ✗ Not available (Excel exports don't include results)
- **Vital signs**: ✗ Not available (Excel exports don't include vitals)
- **Clinical notes**: ✗ Not available (Excel exports don't include notes)

---

## Future Enhancements (Roadmap)

### Phase 2 - Full LHIMS Integration
- Generate patient PDFs on-demand from LHIMS
- Extract complete clinical records per patient
- Include lab results, vital signs, clinical notes
- Link Excel data to full LHIMS records

### Phase 3 - Advanced Features
- User authentication and role-based access
- Data export to PDF/Excel
- Advanced filtering and reporting
- Patient data comparison over time
- Print-friendly patient summaries

---

## Support & Feedback

### Reporting Issues
1. Document the error message (take screenshot if possible)
2. Note what you were doing when the error occurred
3. Check the troubleshooting section first
4. Report to the project maintainer

### Feature Requests
If you need additional features, contact the project maintainer with:
- Description of the feature
- Use case (how it would help your workflow)
- Priority (how urgently it's needed)

---

## Technical Details

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Data Source**: LHIMS Excel exports

### File Structure
```
lhims-fix/
├── data/
│   ├── database/                 # SQLite database
│   ├── consulting-room/          # Excel files
│   ├── opd-register/             # Excel files
│   ├── ipd-morbidity-mortality/  # Excel files
│   ├── anc-register/             # Excel files
│   └── medical-laboratory/       # Excel files
├── server/
│   └── api.js                    # Express API server
├── public/
│   ├── index.html                # Search page
│   ├── patient.html              # Patient detail page
│   └── styles.css                # CSS styles
├── scripts/
│   ├── init-database.js          # Database initialization
│   └── import-excel-data.js      # Excel data import
├── start-patient-search.bat      # Windows startup script
├── start-patient-search.sh       # Linux/Mac startup script
└── PATIENT-SEARCH-GUIDE.md       # This file
```

---

## Changelog

### Version 1.0 (November 10, 2025) - MVP Release
- ✓ Patient search functionality
- ✓ Bio data display
- ✓ OPD visit timeline
- ✓ IPD admission timeline
- ✓ Diagnosis history
- ✓ Medication history
- ✓ Responsive web interface
- ✓ Offline operation
- ✓ Excel data import (70K+ patients, 867K+ visits)

---

## License & Credits

**Project**: LHIMS Data Extraction & Patient Search System
**Hospital**: Volta Regional Hospital, Hohoe, Ghana
**Purpose**: Continuity of care during LHIMS vendor lockout
**License**: Private (Internal hospital use only)
**Status**: MVP (Minimum Viable Product)

---

**For assistance, contact the project maintainer or IT department.**
