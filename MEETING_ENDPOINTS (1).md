# Meeting API Endpoints

Base URL locally:

```text
http://localhost:8081
```

Auth header:

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

## Phase 1 Notes

- `POST /meeting/create` is transactional for meeting request, `meeting_plan`, and expected attendees.
- Normal users do not need to pass `creatorId`; backend uses the logged-in employee.
- Admin/Owner/Developer can still pass `creatorId` when creating on behalf of another employee.
- Deleting an attendee removes only that attendee from the meeting through `meeting_attendee`; the `attendee` master record is kept.

## Phase 2 Notes

- `GET /meeting/config/types` returns only active meeting types.
- `PUT /meeting/submit` validates that `meetingType` exists and is active.
- Dealer/Counter/Store meeting types require `storeId` before submit.
- Draft create/edit can still save incomplete data; required Phase 2 fields are enforced on submit.
- Actual expenses require payer split through `paidBy`, `companyAmount`, and `dealerAmount`.

## Phase 3 Notes

- Meeting responses now include `statusLabel` and `stageLabel` for UI-friendly dashboard/list display.
- `GET /meeting/getById` includes `auditHistory`; `GET /meeting/audit?id={meetingId}` fetches audit separately.
- Paged list/report endpoints are available for dashboard performance.
- CSV report export is available from `GET /meeting/report/export`.
- Final review can approve and close in one backend action.

## Create Meeting

```http
POST /meeting/create
```

Payload:

```json
{
  "meetingType": "Dealer",
  "meetingDate": "2026-07-20",
  "meetingTime": "11:00:00",
  "city": "Pune",
  "state": "Maharashtra",
  "location": "Dealer office",
  "customerReference": "Local dealer reference",
  "expectedAttendees": 2,
  "objective": "New product discussion",
  "expectedBusinessImpact": "Expected 25 MT enquiry and 3 dealer follow-ups",
  "expectedBudget": 15000,
  "expectedGiftsMaterials": "Catalogs, diaries",
  "storeId": 10,
  "allowWalkInAttendees": true,
  "remarks": "Local test meeting",
  "plan": {
    "expectedBudget": 15000,
    "plannedExpenseDetails": "[{\"expenseHead\":\"food/snacks\",\"amount\":8000},{\"expenseHead\":\"gifts\",\"amount\":5000}]",
    "expectedGiftsMaterials": "[{\"giftItem\":\"Diary\",\"quantity\":20}]",
    "plannedGiftDetails": "[{\"giftItem\":\"Diary\",\"quantity\":20,\"estimatedAmount\":5000}]",
    "companyContribution": 12000,
    "dealerContribution": 3000,
    "budgetRemarks": "Dealer will contribute to refreshments"
  },
  "attendees": [
    {
      "name": "Rahul Patil",
      "mobileNumber": "9999999001",
      "email": "rahul@example.com",
      "category": "contractor",
      "cityArea": "Kothrud",
      "companyShopProject": "Patil Constructions",
      "expected": true
    }
  ]
}
```

Response:

```json
1
```

## Edit Request

```http
PUT /meeting/editRequest?id={meetingId}
```

Allowed only in `DRAFT` or `CORRECTION_REQUIRED`.

## Attendees

```http
PUT /meeting/attendees?id={meetingId}
PUT /meeting/attendees/replace?id={meetingId}
DELETE /meeting/attendees/delete?id={meetingId}&meetingAttendeeId={meetingAttendeeId}
```

Delete behavior:

- Deletes only the `meeting_attendee` row.
- Does not delete the attendee from the `attendee` master table.

## Submit And Approval

```http
PUT /meeting/submit?id={meetingId}
GET /meeting/approvalQueue
PUT /meeting/approve?id={meetingId}
PUT /meeting/reject?id={meetingId}
PUT /meeting/requestCorrection?id={meetingId}
PUT /meeting/resubmitCorrection?id={meetingId}
```

Correction payload:

```json
{
  "correctionStage": "REQUEST",
  "correctionRemarks": "Please correct expected budget",
  "approvalRemarks": "Please correct expected budget"
}
```

## Execution And Attendance

```http
PUT /meeting/execute?id={meetingId}
PUT /meeting/attendance?id={meetingId}
POST /meeting/attendance/scan?id={meetingId}
PUT /meeting/attendance/finalise?id={meetingId}
```

Finalise attendance payload:

```json
{
  "actualMeetingDate": "2026-07-20",
  "actualMeetingTime": "11:10:00",
  "actualLocation": "Actual dealer office",
  "executionRemarks": "Meeting conducted",
  "attendees": [
    {
      "id": 1,
      "present": true,
      "attendanceSource": "FINAL_MANUAL",
      "remarks": "Present"
    }
  ]
}
```

## Gifts

```http
PUT /meeting/gifts?id={meetingId}
PUT /meeting/gifts/noGifts?id={meetingId}
DELETE /meeting/gifts/delete?id={meetingId}&giftId={giftId}
```

Gifts are locked until attendance is finalised.

## Expenses

```http
PUT /meeting/expenses?id={meetingId}
PUT /meeting/expenses/noExpenses?id={meetingId}
DELETE /meeting/expenses/delete?id={meetingId}&expenseId={expenseId}
```

Expense variance remarks are stored in `expenseVarianceRemarks`; they no longer overwrite request `remarks`.

Expense payload:

```json
{
  "remarks": "Actual expense was within approved budget",
  "expenses": [
    {
      "expenseHead": "food/snacks",
      "amount": 5000,
      "paidBy": "COMPANY",
      "remarks": "Snacks",
      "expenseDate": "2026-07-20"
    },
    {
      "expenseHead": "venue",
      "amount": 3000,
      "paidBy": "SHARED",
      "companyAmount": 2000,
      "dealerAmount": 1000,
      "remarks": "Venue contribution",
      "expenseDate": "2026-07-20"
    }
  ]
}
```

## Final Report And Close

```http
PUT /meeting/finalReport?id={meetingId}
PUT /meeting/finalReport/approve?id={meetingId}
PUT /meeting/finalReport/approveAndClose?id={meetingId}
PUT /meeting/finalReport/requestCorrection?id={meetingId}
PUT /meeting/sendBackForCorrection?id={meetingId}
PUT /meeting/close?id={meetingId}
PUT /meeting/cancel?id={meetingId}
```

Final report requires:

- `attendanceFinalized = true`
- gifts completed or no gifts marked
- expenses completed or no expenses marked
- `meetingSummary`
- `actualBusinessOutcome`

Final report payload:

```json
{
  "meetingSummary": "Dealer and contractors reviewed the product range.",
  "keyDiscussionPoints": "Pricing, availability, and delivery timelines",
  "leadsGenerated": "3",
  "leadCount": 3,
  "leadDetails": "[{\"name\":\"ABC Projects\",\"requirement\":\"10 MT\"}]",
  "interestedCustomers": "ABC Projects, XYZ Builders",
  "competitorInformation": "Competitor pricing discussed",
  "actualBusinessOutcome": "Generated 3 leads with expected 15 MT business in next month",
  "finalRemarks": "Follow-up planned next week"
}
```

Cancellation is allowed only in `DRAFT`, `PENDING_APPROVAL`, or `APPROVED`.

## Fetch

```http
GET /meeting/getById?id={meetingId}
GET /meeting/getAll
GET /meeting/getAll/paged?page=0&size=20&sortBy=meetingDate&sortDir=desc
GET /meeting/report
GET /meeting/report/paged?page=0&size=20&sortBy=meetingDate&sortDir=desc
GET /meeting/report/export
GET /meeting/report/getById?id={meetingId}
GET /meeting/attendees/getAll
GET /meeting/audit?id={meetingId}
GET /meeting/dashboard/summary
GET /meeting/statuses
```

Paged endpoints accept the same filters as non-paged endpoints:

```text
start, end, status, meetingType, city, state
```

CSV export accepts:

```text
start, end, status, meetingType, city, state
```

Dashboard summary accepts:

```text
start, end, meetingType, city, state
```

Approval queue also has a paged endpoint:

```http
GET /meeting/approvalQueue/paged?page=0&size=20&sortBy=meetingDate&sortDir=desc
```

Audit response:

```json
[
  {
    "id": 1,
    "meetingId": 10,
    "action": "APPROVE_AND_CLOSE",
    "fromStatus": "REPORT_SUBMITTED",
    "toStatus": "CLOSED",
    "correctionStage": null,
    "remarks": "Approved",
    "performedById": 298,
    "performedByName": "Tanu Garg",
    "performedAt": "2026-07-15T14:30:00"
  }
]
```

## Config

```http
POST /meeting/config/type
GET /meeting/config/types
DELETE /meeting/config/type?id={id}
POST /meeting/config/giftItem
GET /meeting/config/giftItems
DELETE /meeting/config/giftItem?id={id}
POST /meeting/config/expenseHead
GET /meeting/config/expenseHeads
DELETE /meeting/config/expenseHead?id={id}
```
