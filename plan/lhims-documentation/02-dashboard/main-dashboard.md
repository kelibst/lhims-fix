# LHIMS Main Dashboard Documentation

## Overview
- **URL**: http://10.10.0.59/lhims_182/userDashboard.php
- **Title**: LHIMS : Dashboard
- **Module**: Dashboard
- **Documented**: 2024-11-12

## User Information (Current Session)
- **User**: Kekeli Jiresse Dogbevi
- **Role**: Biostatistics Officer
- **Facility**: Volta Regional Hospital
- **Session Timer**: Shows countdown (4:59:55 remaining)
- **Login Time**: 12/11/2025 06:19

## Page Structure

### Top Navigation Bar
- Ministry of Health Ghana logo (left)
- Ghana flag and Lightwave logos (right)

### Main Dashboard Grid (3x4 Module Grid)

#### Row 1: Core Functions
1. **APPOINTMENT CALENDAR** (Red text, calendar icon)
   - URL: scheduleManager.php?iSchClinicID=2
   - Purpose: Manage patient appointments

2. **PATIENT RECORDS** (Red text, patient folder icon)
   - URL: searchPatient.php
   - Purpose: Access and manage patient records

3. **ADMINISTRATOR** (Red text, computer icon)
   - URL: Various admin functions
   - Purpose: System administration

4. **INVESTIGATIONS** (Red text, test tube icon)
   - URL: labManagement.php
   - Purpose: Laboratory management

#### Row 2: Reports & Support
5. **MIS** (Red text, graph icon)
   - URL: ehrMisReport.php
   - Purpose: Management Information System reports

6. **HELP, SUPPORT & FEEDBACK** (Red text, help icon)
   - URL: helpSupportV2.php
   - Purpose: User support and feedback

#### Row 3: Specialized Modules
7. **IPD MANAGEMENT** (Red text, bed icon)
   - URL: ipdMangement.php
   - Purpose: Inpatient Department management

8. **DHIMS REPORTS (AS PER SOP V4)** (Red text, report icon)
   - URL: dhimsDashboard.php
   - Purpose: District Health Information Management System reports

9. **LHIMS REPORTS** (Red text, document icon)
   - URL: dhimsDashboardV1.php
   - Purpose: LHIMS-specific reports

10. **MORTUARY MANAGEMENT** (Red text, mortuary icon)
    - URL: mortuaryManagement.php
    - Purpose: Mortuary services management

#### Row 4: Additional Services
11. **CONFIDENTIAL MODALITY** (Red text, microscope icon)
    - URL: manageConfidentialModalityVisitDetails.php
    - Purpose: Confidential patient services

12. **TRANSFUSION MEDICINE UNIT** (Red text, blood drops icon)
    - URL: bloodTransfusionDashboard.php
    - Purpose: Blood transfusion services

### Left Sidebar

#### Quick Links Section
- Control Panel (current page)
- Appointment Calendar
- Filter Selection
- Patient Record Management
- View Messages (shows "2" unread)
- View Alerts
- Lab Management
- Add New Appointment
- View Action Plan
- View Tasks
- View Communication Group
- Manage Adverse Reaction
- Add Patient
- View Doctor/Room Availability
- IPD Management
- Doctor Stats
- Corporate Claim
- Check Drug Stock Level
- Unconfirmed CCC

#### Send Message Button
- Orange button for sending messages

#### Days Alerts Section
- Empty/no current alerts

#### Login Status Section
- Shows current user details
- Session timer with click-to-reset
- Logout button

### Right Sidebar

#### Patient Search Panel
Multiple search options:
1. **By Patient Name** (text input)
2. **By Patient No.** (text input)
3. **By Patient Clinic** (text input with "Enter minimum 3 characters" placeholder)
4. **By Area** (text input)
5. **By Mobile** (text input)
6. **By MOH No** (text input)
7. **By Patient Tag** (text input)

#### Support Links
- Support button
- Help button

#### Server Messages Section
System messages displayed:
- "Please Backup the system every Saturday."
- "Don't forget to Log Out before leaving."
- "Support is just a click away. Look for the Help, Support and Feedback option on the dashboard."

### Footer
- Email: info@lwehs.com
- Phone: 1.678.510.1739

## Color Scheme
- **Primary Blue**: #003366 (headers, navigation)
- **Red Text**: #FF0000 (module titles)
- **White Background**: #FFFFFF
- **Light Gray**: #F5F5F5 (sidebar backgrounds)
- **Orange**: #FFA500 (Send Message button)

## Key Observations

### Navigation Structure
- Modular approach with 12 main functional areas
- Quick links sidebar for frequent actions
- Multiple patient search methods
- Clear role-based access (Biostatistics Officer view)

### User Experience Features
- Session timeout warning with countdown
- Unread message indicator
- Multiple search options for finding patients
- Server messages for important reminders

### Technical Notes
- Session-based authentication
- JavaScript error noted: "blank_valid is not defined"
- Logout timer functionality
- Role-based module access

## Module Categories

### Clinical Modules
- Patient Records
- Appointment Calendar
- IPD Management
- Investigations (Lab)
- Transfusion Medicine Unit
- Mortuary Management

### Administrative Modules
- Administrator
- MIS
- DHIMS Reports
- LHIMS Reports

### Support Modules
- Help, Support & Feedback
- Confidential Modality

## Next Documentation Steps
1. Document each of the 12 main modules
2. Explore Administrator functions
3. Document Patient Records workflow
4. Map IPD Management features
5. Document reporting modules