# Retail And Attendance Endpoints

Base URL:

```text
http://ec2-18-211-58-135.compute-1.amazonaws.com:8081
```

Auth header after login:

```http
Authorization: Bearer <token>
```

## Login

```http
POST /api/auth/login
```

```json
{
  "username": "admin",
  "password": "Admin@12345"
}
```

Response contains `token`. Use that token for all calls below.

## Retail Setup

### List Regions

```http
GET /api/common/sales-regions
```

Use this to get `regionId`.

### List Pincodes

```http
GET /api/common/pincodes
```

Use a pincode that belongs to the same `regionId`. If pincode and region do not match, account creation returns a clear validation error.

### Create Client Group

```http
POST /api/retail/groups
```

```json
{
  "groupName": "Shree Steel Group",
  "groupType": "DEALER",
  "notes": "Mumbai retail group",
  "active": true
}
```

`createdByEmployeeId` is taken from the logged-in user.

### List Client Groups

```http
GET /api/retail/groups?page=0&size=50
```

### Create Retail Client Account

Client group is optional. You can create a client first and assign a group later.

```http
POST /api/retail/accounts
```

```json
{
  "accountName": "Shree Steel Dadar Branch",
  "clientType": "DEALER",
  "gstNumber": "27ABCDE1234F1Z5",
  "clientGroupId": 1,
  "accountStatus": "ACTIVE",
  "ownerEmployeeId": 2,
  "addressVillageArea": "Dadar West",
  "addressTaluka": "Mumbai",
  "addressCity": "Mumbai",
  "addressDistrict": "Mumbai",
  "addressState": "Maharashtra",
  "pinCode": "400001",
  "regionId": 1,
  "outletLatitude": 18.9388,
  "outletLongitude": 72.8354,
  "declaredMonthlySalesMt": 120.5,
  "focusSector": "RETAIL",
  "creditTermsDays": 30,
  "creditLimitAmount": 500000,
  "clientTier": "A",
  "networkMember": true,
  "networkOnboardingDate": "2026-09-08",
  "networkStatus": "ACTIVE",
  "active": true
}
```

### Assign Or Change Client Group

```http
POST /api/retail/accounts/1/group
```

```json
{
  "clientGroupId": 1
}
```

To remove group assignment, send:

```json
{
  "clientGroupId": null
}
```

### List Retail Accounts

```http
GET /api/retail/accounts?page=0&size=50
```

### List Branches For A Group

```http
GET /api/retail/groups/1/branches?page=0&size=50
```

## Retail Contacts

### Create Master Contact

```http
POST /api/common/contacts
```

```json
{
  "firstName": "Rahul",
  "lastName": "Mehta",
  "mobile": "9876543210",
  "email": "rahul@example.com",
  "dateOfBirth": "1988-05-12",
  "anniversaryDate": null,
  "active": true
}
```

### Link Contact To Retail Client

```http
POST /api/retail/contacts
```

```json
{
  "clientAccountId": 1,
  "contactInfluenceRegisterId": 1,
  "designation": "Owner",
  "roleDescription": "Primary purchase decision maker",
  "primaryContact": true,
  "active": true
}
```

### List Contacts For Client

```http
GET /api/retail/accounts/1/contacts?page=0&size=50
```

## Brand Usage And Commercial History

### Add Client Brand Usage

```http
POST /api/retail/brands
```

```json
{
  "clientAccountId": 1,
  "competitorBrandId": 1,
  "employeeId": 2,
  "remarks": "Client uses this brand for 8 mm and 10 mm TMT."
}
```

### Active Brands For Client

```http
GET /api/retail/accounts/1/brands/active?page=0&size=50
```

### Brand History For Client

```http
GET /api/retail/accounts/1/brands/history?page=0&size=50
```

### Remove Brand Usage

```http
POST /api/retail/brands/1/remove?employeeId=2
```

### View Commercial Change History

```http
GET /api/retail/accounts/1/commercial-history?page=0&size=50
```

## Retail Sales

### Record Client Sale

```http
POST /api/retail/sales
```

```json
{
  "clientAccountId": 1,
  "saleDate": "2026-09-08",
  "quantityMt": 15.75,
  "invoiceReference": "INV-1001",
  "sourceSystem": "manual"
}
```

### List Sales For Client

```http
GET /api/retail/accounts/1/sales?from=2026-09-01&to=2026-09-30&page=0&size=50
```

## Retail Visits

### Create Planned Visit

This only creates the visit plan. It does not check in.

```http
POST /api/common/visits
```

```json
{
  "visitType": "RETAIL",
  "clientAccountId": 1,
  "institutionId": null,
  "projectId": null,
  "assignedEmployeeId": 2,
  "assignedByEmployeeId": 1,
  "scheduledVisitDate": "2026-09-08",
  "scheduledStartTime": "10:00:00",
  "scheduledEndTime": "10:30:00",
  "scheduledLatitude": 18.9388,
  "scheduledLongitude": 72.8354,
  "purpose": "Dealer onboarding discussion",
  "selfGenerated": true
}
```

### Edit Planned Visit

```http
PUT /api/common/visits/1
```

Payload is the same as create planned visit.

### Visit Check-In

Visit location is stored here, not in attendance.

```http
POST /api/common/visits/1/check-in
```

```json
{
  "actualCheckinAt": "2026-09-08T10:05:00",
  "checkinLatitude": 18.9389,
  "checkinLongitude": 72.8355
}
```

### Visit Check-Out

A visit counts for attendance only after checkout.

```http
POST /api/common/visits/1/check-out
```

```json
{
  "actualCheckoutAt": "2026-09-08T10:45:00",
  "checkoutLatitude": 18.9391,
  "checkoutLongitude": 72.8357,
  "outcome": "FOLLOW_UP_REQUIRED",
  "discussionSummary": "Discussed onboarding and monthly volume.",
  "nextActionText": "Share price list",
  "nextActionDate": "2026-09-09",
  "expenseAmount": 250
}
```

### List Visits For Retail Client

```http
GET /api/common/retail-clients/1/visits?page=0&size=50
```

## Notes

### Add Note

```http
POST /api/common/notes
```

```json
{
  "parentType": "CLIENT_ACCOUNT",
  "clientAccountId": 1,
  "noteText": "Client asked for revised credit terms."
}
```

For a visit note:

```json
{
  "parentType": "VISIT_ACTIVITY",
  "visitActivityId": 1,
  "noteText": "Visit completed. Follow-up required."
}
```

### Edit Note

```http
PUT /api/common/notes/1
```

```json
{
  "parentType": "CLIENT_ACCOUNT",
  "clientAccountId": 1,
  "noteText": "Updated note text."
}
```

## Tasks

### Create Task

```http
POST /api/tasks
```

```json
{
  "taskTitle": "Share price list",
  "taskDescription": "Send updated rate card to client",
  "taskType": "FOLLOW_UP",
  "status": "OPEN",
  "priority": "HIGH",
  "assignedToEmployeeId": 2,
  "assignedByEmployeeId": 1,
  "dueDate": "2026-09-09",
  "clientAccountId": 1,
  "visitActivityId": 1
}
```

### Edit Task

```http
PUT /api/tasks/1
```

Payload is the same as create task.

### View Tasks

```http
GET /api/tasks?employeeId=2&status=OPEN&page=0&size=50
GET /api/tasks/due?employeeId=2&dueDate=2026-09-09&page=0&size=50
```

## Attendance

Attendance rows are created automatically every day at `00:05` India time. You can also trigger it manually.

### Create Attendance Rows For A Date

Creates one `ABSENT` row for every active employee who does not already have a row for that date.

```http
POST /api/hr/attendance/logs?date=2026-09-08
```

Response:

```json
{
  "date": "2026-09-08",
  "created": 12
}
```

Equivalent endpoint:

```http
POST /api/hr/attendance/logs/defaults?date=2026-09-08
```

### Set Vehicle For Employee Date

Once a vehicle is set, employee status becomes `PRESENT`, `HALF_DAY`, or `FULL_DAY` based on completed visit count and active attendance rule.

```http
PUT /api/hr/attendance/logs/vehicle?employeeId=2&date=2026-09-08
```

```json
{
  "vehicleType": "BIKE",
  "pricePerKmBike": 7
}
```

### Recalculate Attendance

Use after visit checkout or rule changes.

```http
POST /api/hr/attendance/logs/recalculate?employeeId=2&date=2026-09-08
```

### View Attendance By Employee

```http
GET /api/hr/attendance/logs/by-employee/2?from=2026-09-01&to=2026-09-30&page=0&size=50
```

### View Attendance By Date

```http
GET /api/hr/attendance/logs/by-date?date=2026-09-08&page=0&size=50
```

## Attendance Rules

Rules are visit-count based for field officers.

Current meaning:

```text
No vehicle set: ABSENT
Vehicle set, 0 completed visits: PRESENT
Vehicle set, completed visits >= halfDayVisitCount: HALF_DAY
Vehicle set, completed visits >= fullDayVisitCount: FULL_DAY
```

### List Rules

```http
GET /api/hr/attendance/rules?page=0&size=50
```

### Edit And Activate Rule

Example for retail field executive:

```http
PUT /api/hr/attendance/rules/2
```

```json
{
  "ruleName": "Retail FE attendance rule",
  "employeeRole": "RETAIL_FE",
  "halfDayVisitCount": 1,
  "fullDayVisitCount": 3,
  "active": true
}
```

## Travel Rates

### Create Travel Rate

```http
POST /api/hr/salary/travel-rates
```

```json
{
  "employeeId": 2,
  "carRatePerKm": 12,
  "bikeRatePerKm": 5,
  "effectiveFrom": "2026-09-01",
  "effectiveTo": null
}
```

### Change Employee Rate With History

Use this for real rate changes. It closes the previous active row and creates a new row from `effectiveFrom`.

```http
POST /api/hr/salary/travel-rates/by-employee/2/effective-change
```

```json
{
  "bikeRatePerKm": 7,
  "effectiveFrom": "2026-09-08",
  "effectiveTo": null
}
```

### Correct Existing Rate Row

Use only when you know the `employee_travel_rate.id`.

```http
PUT /api/hr/salary/travel-rates/1
```

```json
{
  "carRatePerKm": 14,
  "bikeRatePerKm": 7,
  "effectiveFrom": "2026-09-01",
  "effectiveTo": null
}
```

### View Travel Rate History For Employee

```http
GET /api/hr/salary/travel-rates/by-employee/2?page=0&size=50
```

### Get Effective Rate For A Date

```http
GET /api/hr/salary/travel-rates/effective?employeeId=2&onDate=2026-09-08
```

### Vehicle Type Dropdown

```http
GET /api/hr/vehicle-types
```

Response:

```json
[
  { "code": "CAR", "label": "Car" },
  { "code": "BIKE", "label": "Bike" },
  { "code": "PUBLIC_TRANSPORT", "label": "Public transport" },
  { "code": "OTHER", "label": "Other" }
]
```

## Salary Calculation

```http
POST /api/hr/salary/calculations/run
```

```json
{
  "employeeId": 2,
  "year": 2026,
  "month": 9,
  "refreshTravelData": false
}
```

## Seeded Admin Credential Changes

The current API can create users/admins, but it does not yet have an endpoint to edit an existing user's username or reset/change password.

Current available auth endpoints:

```http
POST /api/auth/login
GET /api/auth/me
POST /api/auth/users
POST /api/auth/employees-with-credentials
POST /api/auth/admins
```

So the seeded admin can be used for login, but username/password edit needs a new endpoint such as:

```http
PUT /api/auth/users/{userId}/credentials
```

Suggested payload:

```json
{
  "username": "newadmin",
  "password": "NewStrongPassword@123",
  "active": true
}
```
