# Patient Search Page Documentation

## Overview
- **URL**: http://10.10.0.59/lhims_182/searchPatient.php
- **Title**: LHIMS : Search Patient
- **Module**: Patient Management
- **Documented**: 2024-11-12

## Page Structure

### Header
- Standard LHIMS header with Ministry of Health Ghana logo
- Page title: "SEARCH PATIENT" (right-aligned, blue background)

### Main Search Form

#### Search Fields
1. **Patient Name**
   - Type: Text input
   - Placeholder: "(Enter minimum 3 characters)"
   - Required characters: 3+
   - Primary search method

2. **Patient No.**
   - Type: Text input
   - Direct patient number search
   - Format: Likely hospital-specific patient ID

3. **Patient Clinic**
   - Type: Text input
   - Placeholder: "(Enter minimum 3 characters)"
   - Required characters: 3+
   - Search by clinic assignment

4. **Patient Mobile No.**
   - Type: Text input
   - Phone number search
   - No format validation visible

5. **NHIA No**
   - Type: Text input
   - National Health Insurance Authority number
   - Important for insurance claims

6. **Referred By**
   - Type: Dropdown/Combobox
   - Select referring entity
   - Likely populated from referral sources

7. **Patient Date Of Birth**
   - Type: Date picker
   - Calendar icon for date selection
   - Format: Likely DD/MM/YYYY

8. **Patient Email**
   - Type: Text input
   - Email address search
   - Optional field

#### Additional Features
- **"Show More Filters"** button (green)
  - Likely reveals additional search criteria
  - Advanced search options

### Action Buttons
1. **Search** (Blue button)
   - Primary action
   - Executes patient search

2. **Patient List** (Blue button)
   - Shows list of all patients
   - Alternative to search

3. **Go To Dashboard** (Blue button)
   - Returns to main dashboard
   - Navigation shortcut

### Left Sidebar (Quick Links)
Same as dashboard:
- Control Panel
- Appointment Calendar
- Filter Selection
- Patient Record Management (current page)
- View Messages (2 unread)
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

### Search Strategy
Multiple search approaches available:
1. **Name-based**: For known patients
2. **ID-based**: Using patient number
3. **Contact-based**: Phone or email
4. **Insurance-based**: NHIA number
5. **Demographic-based**: Date of birth
6. **Referral-based**: By referring entity

## Technical Details

### Form Validation
- Minimum 3 characters for name and clinic searches
- No visible validation on other fields
- Date picker for DOB field

### Search Workflow
1. User enters search criteria
2. Clicks "Search" button
3. Results displayed (not shown in current view)
4. User selects patient from results
5. Navigates to patient record

## Key Features

### Multi-criteria Search
- Supports various search parameters
- Flexible search options for different scenarios
- Accommodates partial information

### Quick Access
- Direct "Add Patient" link in sidebar
- "Patient List" for browsing all patients
- Dashboard navigation readily available

## User Experience

### Positive Aspects
- Multiple search options
- Clear field labels
- Minimum character hints
- Easy navigation back to dashboard

### Potential Improvements
- Could benefit from:
  - Auto-complete on patient names
  - Format hints for phone numbers
  - Recent searches history
  - Quick filters for common searches

## Navigation Flow

### Entry Points
- Dashboard → Patient Records
- Quick Links → Patient Record Management
- Direct URL access

### Exit Points
- Search → Patient Record (after selection)
- Patient List → Browse all patients
- Go To Dashboard → Main dashboard
- Add Patient → New patient registration

## Related Functions
- **Add Patient**: New patient registration
- **Patient List**: View all patients
- **Advanced Filters**: Additional search criteria (hidden)

## Screenshots
- Full page: `patient-search-page.png`

## Notes
- Central hub for accessing patient records
- Essential for daily clinical operations
- Multiple search methods accommodate various user needs
- Integration point for patient-related workflows