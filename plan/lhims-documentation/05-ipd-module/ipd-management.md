# IPD Management Module Documentation

## Overview
- **URL**: http://10.10.0.59/lhims_182/ipdMangement.php
- **Title**: LHIMS : IPD Management
- **Module**: Inpatient Department (IPD)
- **Documented**: 2024-11-12

## Page Structure

### Header Navigation
- Dashboard link (breadcrumb)
- "IPD MANAGEMENT" title (blue background, right-aligned)

### Main Menu Grid (3x3 Layout)

#### Row 1: Core IPD Functions

1. **WARDS, ROOMS AND BED STATUS**
   - Icon: Bed symbol
   - URL: ipdCurrentWardRoomBedStatus.php
   - Purpose: Manage ward occupancy and bed allocation
   - Key function for admission management

2. **CURRENT PATIENT ACCESS**
   - Icon: Patient with stethoscope
   - URL: ipdCurrentPatientAccess.php
   - Purpose: Access current inpatient records
   - Quick access to admitted patients

#### Row 2: Reporting Functions

3. **REPORTS**
   - Icon: Document with chart
   - URL: ipdReportsManagement.php
   - Purpose: IPD-specific reports
   - Various inpatient reports

4. **MIS**
   - Icon: Bar chart
   - URL: ipdMisReports.php
   - Purpose: Management Information System reports
   - Statistical and analytical reports

#### Row 3: Documentation

5. **REGISTERS**
   - Icon: Document with list
   - URL: ipdRegisters.php
   - Purpose: IPD registers
   - Admission/discharge registers

6. **WARD SUMMARY REPORT**
   - Icon: Document with warning symbol
   - URL: ipdManageIncidentReporting.php
   - Purpose: Ward-level summary reports
   - Daily ward summaries

#### Row 4: Special Functions

7. **VIRTUAL BED ADMISSION DETAILS**
   - Icon: Bed with arrows
   - URL: ipdVirtualBedPatientAccess.php
   - Purpose: Manage overflow/virtual bed admissions
   - For situations when physical beds are full

8. **INCIDENT REPORT BOOK**
   - Icon: Medical clipboard
   - URL: incidentReportBook.php
   - Purpose: Record and manage clinical incidents
   - Patient safety reporting

#### Row 5: Surgical Services

9. **THEATRE REPORT**
   - Icon: Document with medical symbol
   - URL: ipdTheatreSummaryReport.php
   - Purpose: Operating theatre reports
   - Surgical procedure documentation

## Color Scheme
- **Red Text**: All module titles
- **Black Icons**: Simple, clear iconography
- **White Background**: Clean tiles
- **Gray Borders**: Subtle tile separation

## Module Categories

### Bed Management
- Wards, Rooms and Bed Status
- Virtual Bed Admission Details

### Patient Management
- Current Patient Access
- Registers

### Reporting
- Reports
- MIS
- Ward Summary Report
- Theatre Report

### Safety & Quality
- Incident Report Book

## Key Workflows

### Admission Process
1. Check bed availability (Wards, Rooms and Bed Status)
2. Admit patient to bed
3. Access via Current Patient Access
4. Document in Registers

### Daily Operations
1. Ward Summary Report for handovers
2. Current Patient Access for rounds
3. Incident reporting as needed
4. Theatre reports for surgical cases

### Discharge Process
1. Update bed status
2. Complete discharge in registers
3. Generate discharge reports

## Technical Details

### URLs Pattern
- Base: ipdMangement.php
- Submodules: ipd[Function].php pattern
- Consistent naming convention

### Access Control
- Requires login
- Role-based access (Biostatistics Officer has access)
- Department-specific functions

## Navigation Flow

### Entry Points
- Dashboard → IPD Management tile
- Quick Links → IPD Management

### Module Navigation
- Each tile leads to specific function
- No visible sub-navigation within tiles
- Dashboard breadcrumb for return navigation

## Related Modules
- Patient Records (for patient details)
- Laboratory (for test results)
- Pharmacy (for medications)
- Reports (for statistics)

## Key Features

### Comprehensive Coverage
- Complete inpatient lifecycle management
- From admission to discharge
- Including special cases (virtual beds)

### Reporting Capabilities
- Multiple report types
- MIS integration
- Theatre documentation
- Incident management

### Bed Management
- Real-time bed status
- Ward organization
- Virtual bed capability

## User Experience

### Positive Aspects
- Clear, icon-based navigation
- Logical grouping of functions
- Direct access to key features
- Simple, uncluttered interface

### Observations
- No visible patient count
- No dashboard statistics
- Separate incident reporting system
- Theatre management integrated

## Screenshots
- Full module view: `ipd-management-page.png`

## Notes
- Central hub for all inpatient operations
- Critical for hospital bed management
- Includes both clinical and administrative functions
- Safety reporting integrated (incidents)
- Virtual bed feature suggests overflow management capability