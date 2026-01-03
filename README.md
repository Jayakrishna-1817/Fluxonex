# Conference Management Application

## Overview
This is a custom Salesforce application built to manage tech conferences, speakers, sessions, and speaker assignments. The application demonstrates advanced Salesforce development skills including custom data modeling, complex Apex logic with conflict detection, and modern Lightning Web Components (LWC) with sophisticated inter-component communication.

## 📋 Assessment Context
This project was developed as part of the **Junior Salesforce Developer Assessment** for **Fluxonex**, showcasing expertise in:
- Custom solution architecture
- Complex Apex logic with bulk safety
- Advanced LWC communication patterns
- Real-world business logic implementation

---

## 🎯 Business Scenario
The application manages a tech conference by:
- **Managing Speakers**: Track speaker information including specialties and contact details
- **Organizing Sessions**: Schedule conference sessions with specific time slots and difficulty levels
- **Preventing Conflicts**: Automatically detect and prevent double-booking of speakers
- **Streamlined Booking**: Provide an intuitive interface for searching speakers and booking sessions

---

## 🗂️ Data Model

### Custom Objects

#### 1. **Speaker__c**
Stores information about conference speakers.
- **Fields**:
  - `Name` (Auto-generated)
  - `Email__c` (Email)
  - `Bio__c` (Long Text Area)
  - `Speciality__c` (Picklist)
    - Values: Apex, LWC, Integrations, Architecture

#### 2. **Session__c**
Represents individual conference sessions.
- **Fields**:
  - `Name` (Auto-generated)
  - `Title__c` (Text)
  - `Session_Date__c` (Date)
  - `Start_Time__c` (Time)
  - `End_Time__c` (Time)
  - `Level__c` (Picklist)
    - Values: Beginner, Intermediate, Advanced

#### 3. **Speaker_Assignment__c** (Junction Object)
Links speakers to sessions they're assigned to.
- **Relationships**:
  - `Session__c` (Master-Detail to Session__c)
  - `Speaker__c` (Lookup to Speaker__c)
- **Purpose**: Enables many-to-many relationship between speakers and sessions

### Relationship Diagram
```
Speaker__c (1) ──────< Speaker_Assignment__c >────── (M) Session__c
                         (Lookup)              (Master-Detail)
```

---

## ⚙️ Task 1: Advanced Apex & Conflict Detection

### **Objective**
Prevent speakers from being double-booked by detecting time slot overlaps.

### **Implementation**

#### **Trigger**: `SpeakerAssignmentTrigger`
- **Object**: Speaker_Assignment__c
- **Events**: Before Insert, Before Update
- **Pattern**: Trigger Handler Pattern for maintainability

#### **Handler Class**: `SpeakerAssignmentHandler`
- Implements conflict detection logic
- **Bulk-safe** processing using collections (Maps and Sets)

#### **Business Logic**
When a speaker is assigned to a session:
1. Query all existing assignments for the same speaker on the same date
2. Check if the new session's time overlaps with any existing session
3. If overlap detected, add error: **"Speaker is already booked for this time."**

#### **Key Technical Features**
- ✅ **Bulk-safe**: Processes multiple records efficiently using collections
- ✅ **Optimized Queries**: Single SOQL query for all speaker assignments
- ✅ **Efficient Data Structures**: Uses Maps for O(1) lookup performance
- ✅ **Time Overlap Algorithm**: Handles edge cases (same start/end times)

#### **Code Highlights**
```apex
// Bulk-safe: Single query for all speakers and dates
Map<Id, List<Speaker_Assignment__c>> existingAssignments = 
    new Map<Id, List<Speaker_Assignment__c>>();

// Check time overlap logic
if ((newStart < existingEnd && newEnd > existingStart) || 
    (newStart.equals(existingStart) && newEnd.equals(existingEnd))) {
    assignment.addError('Speaker is already booked for this time.');
}
```

---

## 🖥️ Task 2: Advanced LWC Application Page

### **Application Architecture**
The application follows a **container-child** pattern with Lightning Message Service (LMS) for cross-component communication.

### **Left Section: Speaker Explorer**

#### **Component 1: speakerSearch (Parent)**
- **Purpose**: Search and filter speakers
- **Features**:
  - Name search input (partial matching)
  - Speciality filter dropdown
  - Real-time search on input change
  - Publishes search criteria via LMS

#### **Component 2: speakerList (Child)**
- **Purpose**: Display matching speakers
- **Features**:
  - Lightning Data Table with columns: Name, Email, Speciality
  - "Book Session" row action
  - Subscribes to search filters via LMS
  - Publishes selected speaker via LMS

### **Right Section: Session Booking**

#### **Component: bookSession**
- **Purpose**: Display speaker details and handle session booking
- **Features**:
  - **Initial State**: "Select a speaker" placeholder
  - **Speaker Details**: Displays Bio and Speciality when speaker selected
  - **Date Input**: 
    - Future date validation
    - Min attribute set to today's date
  - **Availability Check**:
    - Calls Apex method on date selection
    - Shows existing assignments for the selected date
    - Displays availability status
  - **Booking Action**:
    - "Create Assignment" button (enabled only if available)
    - Toast notifications for success/error
    - Refreshes calendar after booking

### **Bonus Feature: Calendar View Component**

#### **Component: calendarView**
- **Purpose**: Visual representation of speaker availability
- **Features**:
  - ✅ **2-Month Display**: Current and next month
  - ✅ **Past Dates Disabled**: Greyed out with reduced opacity
  - ✅ **Booked Dates Highlighted**: Red/pink background for existing assignments
  - ✅ **Interactive**: Click dates to select for booking
  - ✅ **Real-time Updates**: Refreshes when new assignments are created
  - ✅ **Smart Layout**: 7-column grid (Sun-Sat)

#### **Calendar Features**
```javascript
// Date State Classes
.cal-cell.past       → Greyed out (opacity: 0.4)
.cal-cell.booked     → Red background (#ffe6e6)
.cal-cell.today      → Bold border
.cal-cell:hover      → Interactive hover effect
```

---

## 📡 Communication Architecture

### **Lightning Message Service (LMS)**

#### **Message Channel**: `speakerSelection__c`
Enables communication between independent components following LWC best practices.

#### **Message Types**
1. **'filters'**: Search criteria from speakerSearch → speakerList
   ```json
   { type: 'filters', searchKey: '...', speciality: '...' }
   ```

2. **'selection'**: Selected speaker from speakerList → bookSession/calendarView
   ```json
   { type: 'selection', speakerId: '...', speakerName: '...' }
   ```

3. **'refresh'**: Trigger calendar refresh after booking
   ```json
   { type: 'refresh', speakerId: '...' }
   ```

### **Communication Flow**
```
speakerSearch ──(filters)──> speakerList
                                  |
                          (selection)
                                  ↓
                          bookSession ←─(refresh)─┐
                                  |                |
                          (selection)              |
                                  ↓                |
                            calendarView ──────────┘
```

---

## 🛠️ Apex Classes

### **1. SpeakerService.cls**
- **Purpose**: Search and retrieve speaker data
- **Methods**:
  - `getSpeakers(searchKey, speciality)`: Search speakers with filters
  - `getSpeakerDetails(speakerId)`: Get detailed speaker information

### **2. SpeakerAssignmentService.cls**
- **Purpose**: Manage speaker assignments and availability
- **Methods**:
  - `getAssignmentsForDate(speakerId, assignmentDate)`: Check speaker availability
  - `createAssignment(speakerId, sessionDate)`: Create new speaker assignment
  - `checkAvailability(speakerId, sessionDate)`: Validate availability

### **3. SpeakerAssignmentHandler.cls**
- **Purpose**: Trigger handler for conflict detection
- **Methods**:
  - `beforeInsert(newAssignments)`: Validate new assignments
  - `beforeUpdate(newAssignments, oldMap)`: Validate updates
  - `checkForConflicts(assignments)`: Core conflict detection logic

---

## 🎨 User Interface Components

### **Lightning Web Components**

| Component | Type | Purpose |
|-----------|------|---------|
| `speakerSearch` | Parent | Search interface with filters |
| `speakerList` | Child | Display speakers in data table |
| `bookSession` | Container | Main booking interface |
| `calendarView` | Bonus | Visual calendar with availability |

### **FlexPage**: `Speaker_Manager.flexipage`
- **Layout**: Two-column layout
- **Left Region**: speakerSearch + speakerList
- **Right Region**: bookSession + calendarView
- **Navigation**: Custom tab "Speaker Manager"

---

## 🚀 Deployment & Setup

### **Prerequisites**
- Salesforce Developer Edition Org
- Salesforce CLI installed
- Git installed

### **Installation Steps**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Jayakrishna-1817/Fluxonex.git
   cd Fluxonex
   ```

2. **Authorize Your Org**
   ```bash
   sf org login web --set-default-dev-hub --alias DevHub
   ```

3. **Deploy Metadata**
   ```bash
   sf project deploy start --source-path force-app/main/default
   ```

4. **Verify Deployment**
   - Navigate to App Launcher → Speaker Manager
   - Test speaker search and booking functionality

### **Manual Setup (Alternative)**
1. Create custom objects (Speaker__c, Session__c, Speaker_Assignment__c)
2. Deploy Apex classes
3. Deploy Lightning Web Components
4. Deploy Message Channel
5. Create FlexPage and add to navigation

---

## ✅ Features Checklist

### **Data Model**
- ✅ Speaker__c with all required fields
- ✅ Session__c with date/time fields
- ✅ Speaker_Assignment__c junction object
- ✅ Proper relationships (Master-Detail + Lookup)

### **Apex (Task 1)**
- ✅ Trigger on Speaker_Assignment__c
- ✅ Bulk-safe conflict detection
- ✅ Efficient collections usage
- ✅ Proper error handling
- ✅ Time overlap algorithm

### **LWC (Task 2)**
- ✅ speakerSearch with filters
- ✅ speakerList with data table
- ✅ bookSession with availability check
- ✅ Future date validation
- ✅ LMS communication
- ✅ Toast notifications
- ✅ **Bonus**: Calendar View component

### **Best Practices**
- ✅ Trigger Handler pattern
- ✅ @AuraEnabled cacheable methods
- ✅ Error handling with try-catch
- ✅ User-friendly error messages
- ✅ Light DOM rendering for performance
- ✅ Scoped CSS for styling
- ✅ Proper security (with sharing)

---

## 📊 Testing Scenarios

### **1. Conflict Detection Test**
1. Create a speaker
2. Create two sessions on the same day with overlapping times
3. Assign the speaker to the first session → Success
4. Attempt to assign the same speaker to the second session → **Error: "Speaker is already booked for this time."**

### **2. Search & Filter Test**
1. Create multiple speakers with different specialties
2. Search by name → Verify partial matching works
3. Filter by specialty → Verify dropdown filtering works
4. Combine name + specialty → Verify both filters work together

### **3. Booking Flow Test**
1. Search for a speaker
2. Click "Book Session"
3. Select a past date → **Error validation**
4. Select a future date → Verify availability check runs
5. Create assignment → Verify success toast and calendar refresh

### **4. Calendar View Test**
1. Select a speaker with existing assignments
2. Verify past dates are greyed out
3. Verify booked dates are highlighted in red
4. Click an available date → Verify date selection works
5. Create assignment → Verify calendar updates immediately

---

## 🔒 Security Considerations

- **Apex Classes**: `with sharing` keyword enforced
- **Field-Level Security**: Respect user permissions
- **CRUD Checks**: Validate user access before DML operations
- **Input Validation**: Date validation on client and server side

---

## 📁 Project Structure

```
force-app/main/default/
├── classes/
│   ├── SpeakerService.cls
│   ├── SpeakerAssignmentService.cls
│   └── SpeakerAssignmentHandler.cls
├── lwc/
│   ├── speakerSearch/
│   ├── speakerList/
│   ├── bookSession/
│   └── calendarView/
├── objects/
│   ├── Speaker__c/
│   ├── Session__c/
│   └── Speaker_Assignment__c/
├── messageChannels/
│   └── speakerSelection.messageChannel-meta.xml
├── flexipages/
│   └── Speaker_Manager.flexipage-meta.xml
├── triggers/
│   └── SpeakerAssignmentTrigger.trigger
└── tabs/
    └── Speaker_Manager.tab-meta.xml
```

---

## 🎓 Technical Highlights

### **Advanced Apex Techniques**
- Bulk-safe trigger processing
- Efficient collection usage (Maps for grouping)
- Single SOQL query pattern
- Time overlap algorithm
- Trigger handler pattern for maintainability

### **Modern LWC Patterns**
- Lightning Message Service for decoupled communication
- Light DOM rendering for performance
- Reactive properties with @track
- @wire adapters for data binding
- Error handling with toast notifications
- Dynamic CSS classes

### **UX/UI Excellence**
- Intuitive search interface
- Real-time filtering
- Visual availability calendar
- Clear error messages
- Responsive design

---

## 👤 Developer Information

**Assessment Submission for**: Fluxonex  
**Position**: Junior Salesforce Developer  
**Repository**: [https://github.com/Jayakrishna-1817/Fluxonex](https://github.com/Jayakrishna-1817/Fluxonex)  
**Org Username**: jksmart1817@gmail.com

---

## 📧 Contact & Submission

For questions or feedback regarding this assessment:
- **Email**: careers@fluxonex.com
- **Assessment Date**: January 2026

---

## 📝 License

This project was created for assessment purposes as part of the Fluxonex Junior Salesforce Developer recruitment process.

---

## 🙏 Acknowledgments

Thank you to the Fluxonex team for the opportunity to demonstrate my Salesforce development skills through this comprehensive assessment!