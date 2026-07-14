# Meeting API Endpoints

Base URL locally:

```text
http://localhost:8081
```

Auth header for protected APIs:

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

## User Login

### Login

```http
POST /user/token
```

Payload:

```json
{
  "username": "local-field",
  "password": "field123"
}
```

Response:

```text
3 <jwt-token>
```

For non-field users, response is role plus token:

```text
MANAGER <jwt-token>
```

## Meeting Config

### Create Meeting Type

```http
POST /meeting/config/type
```

Payload:

```json
{
  "name": "Dealer",
  "active": true
}
```

Response:

```json
1
```

### Get Meeting Types

```http
GET /meeting/config/types
```

Response:

```json
[
  {
    "id": 1,
    "name": "Dealer",
    "active": true
  }
]
```

Allowed meeting types from the requirement document:

- `Counter`
- `Dealer`
- `Mason`
- `Contractor`
- `Engineer`
- `Architect`

Note: the backend stores `meetingType` as a string. Config APIs exist, but meeting creation does not currently validate the type against config.

## Create Meeting

Field Officer, Manager, Office Manager, Admin, Owner, and Developer can create meetings.

```http
POST /meeting/create
```

Payload:

```json
{
  "meetingType": "Dealer",
  "creatorId": 3,
  "meetingDate": "2026-07-20",
  "meetingTime": "11:00:00",
  "city": "Pune",
  "state": "Maharashtra",
  "location": "Dealer office",
  "customerReference": "Local dealer reference",
  "expectedAttendees": 2,
  "objective": "New product discussion",
  "expectedBudget": 15000,
  "expectedGiftsMaterials": "Catalogs, diaries",
  "allowWalkInAttendees": true,
  "remarks": "Local test meeting"
}
```

Response:

```json
1
```

The returned number is `meetingId`.

## Edit Meeting Request

Allowed only in `DRAFT` or `CORRECTION_REQUIRED`.

```http
PUT /meeting/editRequest?id={meetingId}
```

Payload:

```json
{
  "meetingDate": "2026-07-21",
  "meetingTime": "12:00:00",
  "remarks": "Updated request"
}
```

Response:

```text
Meeting request updated successfully!
```

## Add Expected Attendees

```http
PUT /meeting/attendees?id={meetingId}
```

Payload:

```json
[
  {
    "name": "Rahul Patil",
    "mobileNumber": "9999999001",
    "email": "rahul@example.com",
    "category": "contractor",
    "cityArea": "Kothrud",
    "companyShopProject": "Patil Constructions",
    "expected": true,
    "categoryDetails": "Bridge project contractor",
    "remarks": "Expected attendee"
  }
]
```

Response:

```text
Attendees saved successfully!
```

Duplicate behavior:

- `attendee.mobileNumber` is unique globally.
- `meeting_attendee` has unique `meeting_id + attendee_id`.
- The same attendee can attend multiple meetings without duplicating master attendee data.

## Submit For Approval

```http
PUT /meeting/submit?id={meetingId}
```

Response:

```text
Meeting submitted for approval!
```

Validation:

- Meeting must be `DRAFT` or `CORRECTION_REQUIRED`.
- At least one expected attendee must exist.

## Approval Queue

```http
GET /meeting/approvalQueue
```

Response:

```json
[
  {
    "id": 1,
    "meetingType": "Dealer",
    "creatorId": 3,
    "creatorName": "Local FieldOfficer",
    "meetingDate": "2026-07-20",
    "meetingTime": "11:00:00",
    "city": "Pune",
    "state": "Maharashtra",
    "location": "Dealer office",
    "expectedAttendees": 2,
    "objective": "New product discussion",
    "expectedBudget": 15000.0,
    "status": "PENDING_APPROVAL",
    "attendees": [],
    "gifts": [],
    "expenses": [],
    "tabs": {
      "request": true,
      "attendees": true,
      "approval": true,
      "execution": false,
      "gifts": false,
      "expenses": false,
      "finalReport": false
    },
    "allowedActions": [
      "APPROVE",
      "REJECT",
      "REQUEST_CORRECTION"
    ]
  }
]
```

## Approve Meeting

```http
PUT /meeting/approve?id={meetingId}
```

Payload:

```json
{
  "approvalRemarks": "Approved for execution"
}
```

Response:

```text
Meeting approved!
```

## Reject Meeting

```http
PUT /meeting/reject?id={meetingId}
```

Payload:

```json
{
  "approvalRemarks": "Rejected because budget is too high"
}
```

Response:

```text
Meeting rejected!
```

## Ask For Correction

```http
PUT /meeting/requestCorrection?id={meetingId}
```

Payload:

```json
{
  "approvalRemarks": "Please correct expected budget"
}
```

Response:

```text
Meeting sent for correction!
```

## Execute Meeting

```http
PUT /meeting/execute?id={meetingId}
```

Payload:

```json
{
  "actualMeetingDate": "2026-07-20",
  "actualMeetingTime": "11:15:00",
  "actualLocation": "Dealer office",
  "executionRemarks": "Meeting started"
}
```

Response:

```text
Meeting execution started!
```

## Mark Attendee Presence

Use this endpoint for now instead of QR.

```http
PUT /meeting/attendance?id={meetingId}
```

Payload:

```json
[
  {
    "id": 1,
    "present": true,
    "attendanceSource": "MANUAL",
    "remarks": "Present"
  },
  {
    "id": 2,
    "present": false,
    "attendanceSource": "MANUAL",
    "remarks": "Absent"
  }
]
```

Response:

```text
Attendance updated successfully!
```

Notes:

- `id` is the `meeting_attendee.id`, not the attendee master id.
- Attendance can be marked only after approval/execution is unlocked.

## Add Walk-In Attendee And Mark Present

Use this endpoint when attendee was not in the expected list.

```http
POST /meeting/attendance/scan?id={meetingId}
```

Payload:

```json
{
  "name": "Walk In User",
  "mobileNumber": "9999999003",
  "email": "walkin@example.com",
  "category": "mason",
  "cityArea": "Pune",
  "companyShopProject": "Walk-in project",
  "attendanceSource": "FORM",
  "remarks": "Walk-in attendee"
}
```

Response:

```json
{
  "id": 3,
  "meetingId": 1,
  "attendeeId": 3,
  "name": "Walk In User",
  "mobileNumber": "9999999003",
  "email": "walkin@example.com",
  "category": "mason",
  "cityArea": "Pune",
  "companyShopProject": "Walk-in project",
  "expected": false,
  "present": true,
  "attendanceSource": "FORM",
  "remarks": "Walk-in attendee"
}
```

Note: despite the path name `scan`, this can be used as a normal form endpoint. QR token endpoints are not part of the current testing flow.

## Issue Gifts

```http
PUT /meeting/gifts?id={meetingId}
```

Payload:

```json
{
  "gifts": [
    {
      "meetingAttendeeId": 1,
      "giftItem": "Diary",
      "quantity": 1,
      "remarks": "Issued after attendance"
    }
  ]
}
```

Response:

```text
Gifts saved successfully!
```

Validation:

- Gift can be issued only to attendees with `present = true`.

## Submit Expenses

```http
PUT /meeting/expenses?id={meetingId}
```

Payload:

```json
{
  "remarks": "Within approved budget",
  "expenses": [
    {
      "expenseHead": "food/snacks",
      "amount": 8000,
      "expenseDate": "2026-07-20",
      "remarks": "Snacks"
    },
    {
      "expenseHead": "gifts",
      "amount": 5000,
      "expenseDate": "2026-07-20",
      "remarks": "Gift material"
    }
  ]
}
```

Response:

```text
Meeting expenses submitted!
```

Validation:

- Meeting must be `EXECUTED`.
- If actual total is greater than `expectedBudget`, `remarks` is mandatory.

## Submit Final Report

```http
PUT /meeting/finalReport?id={meetingId}
```

Payload:

```json
{
  "meetingSummary": "Product discussion completed",
  "keyDiscussionPoints": "Pricing, availability, delivery timeline",
  "leadsGenerated": "4",
  "interestedCustomers": "Rahul Patil, ABC Contractors",
  "competitorInformation": "Local competitor pricing discussed",
  "finalRemarks": "Good response"
}
```

Response:

```text
Final meeting report submitted!
```

## Approve Final Report

```http
PUT /meeting/finalReport/approve?id={meetingId}
```

Payload:

```json
{
  "finalReportApprovalRemarks": "Report checked and approved"
}
```

Response:

```text
Final report approved!
```

## Close Meeting

```http
PUT /meeting/close?id={meetingId}
```

Payload:

```json
{
  "finalRemarks": "Closed after review"
}
```

Response:

```text
Meeting closed!
```

Validation:

- Meeting must be `REPORT_SUBMITTED`.
- Final report must be approved before closure.

## Cancel Meeting

```http
PUT /meeting/cancel?id={meetingId}
```

Payload:

```json
{
  "remarks": "Cancelled by requester"
}
```

Response:

```text
Meeting cancelled!
```

## Fetch Meeting

```http
GET /meeting/getById?id={meetingId}
```

Response:

```json
{
  "id": 1,
  "meetingType": "Dealer",
  "creatorId": 3,
  "creatorName": "Local FieldOfficer",
  "meetingDate": "2026-07-20",
  "meetingTime": "11:00:00",
  "city": "Pune",
  "state": "Maharashtra",
  "location": "Dealer office",
  "expectedAttendees": 2,
  "expectedBudget": 15000.0,
  "status": "APPROVED",
  "attendees": [
    {
      "id": 1,
      "meetingId": 1,
      "attendeeId": 1,
      "name": "Rahul Patil",
      "mobileNumber": "9999999001",
      "email": "rahul@example.com",
      "category": "contractor",
      "expected": true,
      "present": false
    }
  ],
  "gifts": [],
  "expenses": [],
  "tabs": {
    "request": true,
    "attendees": true,
    "approval": true,
    "execution": true,
    "gifts": true,
    "expenses": false,
    "finalReport": false
  },
  "allowedActions": [
    "EXECUTE",
    "MARK_ATTENDANCE"
  ]
}
```

## List Meetings

```http
GET /meeting/getAll
GET /meeting/getAll?start=2026-07-01&end=2026-07-31
GET /meeting/getAll?status=APPROVED
GET /meeting/getAll?meetingType=Dealer&city=Pune&state=Maharashtra
```

Response:

```json
[
  {
    "id": 1,
    "meetingType": "Dealer",
    "status": "APPROVED",
    "meetingDate": "2026-07-20",
    "city": "Pune",
    "state": "Maharashtra",
    "attendees": [],
    "gifts": [],
    "expenses": []
  }
]
```

## Reports

```http
GET /meeting/report
GET /meeting/report?start=2026-07-01&end=2026-07-31
GET /meeting/report/getById?id={meetingId}
```

Response:

```json
[
  {
    "id": 1,
    "meetingType": "Dealer",
    "status": "CLOSED",
    "meetingSummary": "Product discussion completed",
    "actualAttendeeCount": 2,
    "attendees": [],
    "gifts": [],
    "expenses": []
  }
]
```

`/meeting/report/getById` returns one meeting object instead of a list.

## Attendee Master

```http
GET /meeting/attendees/getAll
```

Response:

```json
[
  {
    "id": 1,
    "name": "Rahul Patil",
    "mobileNumber": "9999999001",
    "email": "rahul@example.com",
    "category": "contractor",
    "cityArea": "Kothrud",
    "companyShopProject": "Patil Constructions"
  }
]
```
