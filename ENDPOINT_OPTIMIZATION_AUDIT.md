# Endpoint Optimization Audit

This audit is based on actual usage in the Gajkesari web and mobile apps:

- Web: `/Users/shilpakambale/Desktop/Projects/Aug-26/gajkesari-web-main 2`
- Mobile: `/Users/shilpakambale/Desktop/Projects/Aug-26/gajkesari-mobile-main`
- Backend: `/Users/shilpakambale/Desktop/Projects/Aug-26/german-steels`

The goal is to optimize only endpoints that are actively used by web/mobile. Existing endpoints are kept unchanged for backward compatibility; new optimized endpoints should be adopted screen by screen.

## Data Growth

With 50 employees and roughly 10 visits per employee per day:

- 500 visits per day
- About 15,000 visits per month
- About 45,000 visits in 3 months
- About 180,000 visits per year

MySQL can handle this volume, but unbounded list endpoints and frontend-side aggregation will become slow as history grows.

## Optimization Checklist

| Status | Priority | Area | New Endpoint / Work Item | Notes |
| --- | --- | --- | --- | --- |
| Done | P0 | Employee visit list | `GET /visit/getByDateRangeAndEmployeePaged` | Use for paginated employee visit history. |
| Done | P0 | Employee stats | `GET /visit/getByDateRangeAndEmployeeStatsOptimized` | Use for stats, backend summary, and paged visit rows. |
| Done | P0 | Store visit history | `GET /visit/getByStorePaged` | Use for customer/store recent visit history. |
| Done | P1 | Multi-team manager visits | `GET /visit/getForTeams` | Use instead of multiple `/visit/getForTeam` calls with large page sizes. |
| Done | P1 | Dashboard KPIs | `GET /dashboard/summary?startDate=&endDate=` | Use for dashboard KPI cards and employee visit counts. |
| Done | P1 | Employee journey map | `GET /visit/employee-journey?employeeId=&startDate=&endDate=` | Use for lightweight map markers only. |
| Done | P1 | Employee detail summary | `GET /employee/dashboard-summary?employeeId=&startDate=&endDate=` | Use for employee detail KPI/header summaries. |
| Done | P1 | Mobile home summary | `GET /visit/mobile-home-summary?employeeId=` | Use for mobile home counts, open tasks, pricing count, and recent completed visits. |
| Done | P2 | Monthly reports | `GET /report/getForEmployeeRange?startDate=&endDate=&groupBy=month` | Use instead of calling `/report/getForEmployee` once per month. |
| Done | P0 | Database indexes | Visit lookup indexes | Added JPA index metadata on `Visit`; run SQL manually if existing production schema does not auto-update. |

## New Optimized Endpoints

### Employee Visit List

Use this for paginated employee visit history.

| Field | Value |
| --- | --- |
| Endpoint | `GET /visit/getByDateRangeAndEmployeePaged` |
| Query params | `id`, `start`, `end`, `page`, `size`, `sort` |
| Example request | `GET /visit/getByDateRangeAndEmployeePaged?id=12&start=2026-08-01&end=2026-08-10&page=0&size=20&sort=id,desc` |
| Frontend rows path | `response.data.content` |
| Compatibility note | Existing `/visit/getByDateRangeAndEmployee` still returns a plain array. |

Expected response:

```json
{
  "content": [
    {
      "id": 101,
      "storeId": 25,
      "storeName": "Example Store",
      "employeeId": 12,
      "employeeName": "Example Employee",
      "visit_date": "2026-08-10",
      "checkinDate": "2026-08-10",
      "checkinTime": "10:00:00",
      "checkoutDate": "2026-08-10",
      "checkoutTime": "10:30:00"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false,
  "numberOfElements": 20,
  "empty": false
}
```

### Employee Stats

Use this for employee stats screens where the frontend currently downloads all visits to calculate completed visit count and visits by purpose.

| Field | Value |
| --- | --- |
| Endpoint | `GET /visit/getByDateRangeAndEmployeeStatsOptimized` |
| Query params | `id`, `start`, `end`, `page`, `size`, `sort` |
| Example request | `GET /visit/getByDateRangeAndEmployeeStatsOptimized?id=12&start=2026-08-01&end=2026-08-10&page=0&size=20&sort=id,desc` |
| Stats path | `response.data.statsDto` |
| Summary path | `response.data.summary` |
| Frontend rows path | `response.data.visitPage.content` |
| Compatibility note | Existing `/visit/getByDateRangeAndEmployeeStats` still returns `visitDto` as a plain array. |

Expected response:

```json
{
  "statsDto": {
    "visitCount": 150,
    "fullDays": 20,
    "halfDays": 2,
    "absences": 1
  },
  "summary": {
    "completedVisits": 125,
    "visitsByPurpose": [
      {
        "purpose": "dealer visit",
        "count": 80
      },
      {
        "purpose": "follow up",
        "count": 45
      }
    ]
  },
  "visitPage": {
    "content": [
      {
        "id": 101,
        "storeName": "Example Store",
        "visit_date": "2026-08-10",
        "checkinTime": "10:00:00",
        "checkoutTime": "10:30:00"
      }
    ],
    "totalElements": 150,
    "totalPages": 8,
    "number": 0,
    "size": 20,
    "first": true,
    "last": false
  }
}
```

### Store Visit History

Use this for customer/store detail pages where only recent visit history is needed.

| Field | Value |
| --- | --- |
| Endpoint | `GET /visit/getByStorePaged` |
| Query params | `id`, `page`, `size`, `sort` |
| Example request | `GET /visit/getByStorePaged?id=25&page=0&size=20&sort=visitDate,desc` |
| Frontend rows path | `response.data.content` |
| Compatibility note | Existing `/visit/getByStore` still returns a plain array. |

Expected response:

```json
{
  "content": [
    {
      "id": 101,
      "storeId": 25,
      "storeName": "Example Store",
      "employeeId": 12,
      "employeeName": "Example Employee",
      "visit_date": "2026-08-10"
    }
  ],
  "totalElements": 75,
  "totalPages": 4,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false
}
```

### Multi-Team Manager Visits

Use this for managers who have access to more than one team. It replaces multiple large frontend calls to `/visit/getForTeam`.

| Field | Value |
| --- | --- |
| Endpoint | `GET /visit/getForTeams` |
| Query params | `teamIds`, `startDate`, `endDate`, `page`, `size`, `sort`, optional `purpose`, `priority`, `outcome`, `employeeName`, `storeName` |
| Example request | `GET /visit/getForTeams?teamIds=1&teamIds=2&startDate=2026-08-01&endDate=2026-08-10&page=0&size=20&sort=visitDate,desc` |
| Frontend rows path | `response.data.content` |
| Compatibility note | Existing `/visit/getForTeam` still works for single-team calls. |
| Access control | Backend filters requested `teamIds` to teams the current user can access. |

Expected response:

```json
{
  "content": [
    {
      "id": 101,
      "storeName": "Example Store",
      "employeeId": 12,
      "employeeName": "Example Employee",
      "visit_date": "2026-08-10",
      "checkoutDate": "2026-08-10"
    }
  ],
  "totalElements": 250,
  "totalPages": 13,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false
}
```

### Dashboard Summary

Use this for dashboard KPI cards where the frontend currently calculates totals from larger report responses.

| Field | Value |
| --- | --- |
| Endpoint | `GET /dashboard/summary` |
| Query params | `startDate`, `endDate` |
| Example request | `GET /dashboard/summary?startDate=2026-08-01&endDate=2026-08-10` |
| Total visits path | `response.data.totalVisits` |
| Active employees path | `response.data.activeEmployees` |
| Employee count rows path | `response.data.countsByEmployee` |
| Compatibility note | Existing `/report/getCounts` still works and is unchanged. |
| Access control | Admin/owner/developer see all employees; managers see their teams or assigned cities; field officers see only their own count. |

Expected response:

```json
{
  "startDate": "2026-08-01",
  "endDate": "2026-08-10",
  "totalVisits": 500,
  "activeEmployees": 45,
  "countsByEmployee": [
    {
      "employeeId": 12,
      "employeeName": "Example Employee",
      "visitCount": 38
    },
    {
      "employeeId": 18,
      "employeeName": "Another Employee",
      "visitCount": 32
    }
  ]
}
```

### Employee Journey Map

Use this for the dashboard map when selecting an employee. It returns marker-ready visit locations only.

| Field | Value |
| --- | --- |
| Endpoint | `GET /visit/employee-journey` |
| Query params | `employeeId`, `startDate`, `endDate` |
| Example request | `GET /visit/employee-journey?employeeId=12&startDate=2026-08-01&endDate=2026-08-10` |
| Frontend rows path | `response.data` |
| Compatibility note | Existing `/visit/getByDateRangeAndEmployeeStats` still works and is unchanged. |
| Access control | Admin/owner/developer see any employee; managers see their teams or assigned cities; field officers see only their own markers. |

Expected response:

```json
[
  {
    "id": 101,
    "employeeId": 12,
    "employeeName": "Example Employee",
    "storeName": "Example Store",
    "lat": 19.076,
    "lng": 72.8777,
    "coordinateSource": "checkin",
    "visitDate": "2026-08-10",
    "checkinDate": "2026-08-10",
    "checkinTime": "10:00:00",
    "checkoutDate": "2026-08-10",
    "checkoutTime": "10:30:00",
    "purpose": "dealer visit",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India"
  }
]
```

### Employee Detail Summary

Use this for employee detail KPI/header summaries. Keep the existing list endpoints for detailed visit, expense, attendance, and pricing tabs.

| Field | Value |
| --- | --- |
| Endpoint | `GET /employee/dashboard-summary` |
| Query params | `employeeId`, `startDate`, `endDate` |
| Example request | `GET /employee/dashboard-summary?employeeId=12&startDate=2026-08-01&endDate=2026-08-10` |
| Stats path | `response.data.statsDto` |
| Visit summary path | `response.data.visitSummary` |
| Expense summary path | `response.data.expenseSummary` |
| Brand/pricing summary path | `response.data.brandSummary` |
| Compatibility note | Existing detail endpoints still work and are unchanged. |
| Access control | Admin/owner/developer see any employee; managers see their teams or assigned cities; field officers see only their own summary. |

Expected response:

```json
{
  "employeeId": 12,
  "employeeName": "Example Employee",
  "startDate": "2026-08-01",
  "endDate": "2026-08-10",
  "statsDto": {
    "visitCount": 50,
    "presentDays": 8,
    "fullDays": 7,
    "halfDays": 1,
    "absences": 0,
    "completedVisitCount": 42,
    "totalVisitCount": 50
  },
  "visitSummary": {
    "completedVisits": 42,
    "visitsByPurpose": [
      {
        "purpose": "dealer visit",
        "count": 30
      }
    ]
  },
  "expenseSummary": {
    "expenseCount": 6,
    "totalAmount": 4200.0,
    "approvedCount": 4,
    "approvedAmount": 3000.0,
    "pendingCount": 1,
    "pendingAmount": 700.0,
    "rejectedCount": 1,
    "rejectedAmount": 500.0
  },
  "brandSummary": {
    "pricingEntryCount": 12,
    "distinctBrandCount": 4
  }
}
```

### Mobile Home Summary

Use this for the mobile home screen. It replaces multiple visit-list downloads used only to calculate home counters and recent completed visits.

| Field | Value |
| --- | --- |
| Endpoint | `GET /visit/mobile-home-summary` |
| Query params | `employeeId` |
| Example request | `GET /visit/mobile-home-summary?employeeId=12` |
| Metrics path | `response.data.totalVisits`, `response.data.totalVisitsToday`, `response.data.totalVisitsThisWeek`, `response.data.completedVisits` |
| Open assigned task path | `response.data.unreadVisitTasks` |
| Daily pricing path | `response.data.dailyPricingCount`, `response.data.dailyPricingMessage` |
| Recent visits path | `response.data.recentCompletedVisits` |
| Compatibility note | Existing mobile calls to `/visit/getByDateRangeAndEmployee` and `/brand/getByDateRangeForEmployee` still work and are unchanged. |
| Access control | Admin/owner/developer can request any employee; managers can request their team or assigned-city employees; field officers can request only their own summary. |

Expected response:

```json
{
  "employeeId": 12,
  "totalVisits": 18,
  "totalVisitsToday": 3,
  "totalVisitsThisWeek": 12,
  "completedVisits": 18,
  "unreadVisitTasks": 2,
  "dailyPricingCount": 4,
  "dailyPricingMessage": "Add 1 more daily pricing entries",
  "recentCompletedVisits": [
    {
      "id": 101,
      "storeName": "Example Store",
      "visit_date": "2026-08-10",
      "updatedAt": "2026-08-10",
      "updatedTime": "18:15:00"
    }
  ]
}
```

### Monthly Employee Reports

Use this for report pages that need multiple months. It replaces one frontend request per month with one backend range request grouped by month.

| Field | Value |
| --- | --- |
| Endpoint | `GET /report/getForEmployeeRange` |
| Query params | `startDate`, `endDate`, `groupBy` |
| Example request | `GET /report/getForEmployeeRange?startDate=2026-06-15&endDate=2026-08-10&groupBy=month` |
| Group path | `response.data["August 2026"]` |
| Compatibility note | Existing `/report/getForEmployee` still works and is unchanged. |
| Response behavior | Returns only employees with activity for each month. |

Expected response:

```json
{
  "June 2026": [
    {
      "employeeName": "Example Employee",
      "newStoreCount": 4,
      "visitCount": null,
      "storeCountDto": [
        {
          "storeId": 25,
          "visitCount": 3,
          "storeName": "Example Store",
          "employeeId": 12,
          "employeeName": "Example Employee"
        }
      ]
    }
  ],
  "July 2026": [],
  "August 2026": []
}
```

## Frontend Migration Notes

| Current Need | Use This New Endpoint | Main Change |
| --- | --- | --- |
| Employee visit history | `/visit/getByDateRangeAndEmployeePaged` | Read rows from `response.data.content`. |
| Employee stats plus visit rows | `/visit/getByDateRangeAndEmployeeStatsOptimized` | Read summary from `response.data.summary`; rows from `response.data.visitPage.content`. |
| Customer/store visit history | `/visit/getByStorePaged` | Read rows from `response.data.content`. |
| Manager with multiple teams | `/visit/getForTeams` | Replace `Promise.all(teamIds.map(...))` with one paged request. |
| Dashboard KPI cards | `/dashboard/summary` | Read totals directly from `response.data.totalVisits`, `response.data.activeEmployees`, and `response.data.countsByEmployee`. |
| Dashboard employee journey map | `/visit/employee-journey` | Use `response.data` directly as marker rows; no need to fetch full stats plus full visit DTOs. |
| Employee detail KPI/header summaries | `/employee/dashboard-summary` | Use one summary response for stats, visit totals, expense totals, and pricing counts. |
| Mobile home screen | `/visit/mobile-home-summary` | Use one response for home counters, open assigned tasks, daily pricing count, and recent completed visits. |
| Monthly employee reports | `/report/getForEmployeeRange` | Replace month-by-month `Promise.all` calls with one range request grouped by month. |

## Frontend Migration Still Pending

Backend optimized endpoints are implemented, but the web/mobile apps still need to switch these active calls to the new endpoints:

| App | Current File | Old Call | New Endpoint To Use |
| --- | --- | --- | --- |
| Web | `app/dashboard/employee/[id]/page.tsx` | `/visit/getByDateRangeAndEmployeeStats` | `/visit/getByDateRangeAndEmployeeStatsOptimized` or `/employee/dashboard-summary` for KPI/header summaries. |
| Web | `components/employee-detail-card.tsx` | `/attendance-log/monthlyVisits`, `/brand/getByDateRangeForEmployee` | `/employee/dashboard-summary` for KPI/header summaries. |
| Web | `components/customer-detail-page.tsx` | `/visit/getByStore` | `/visit/getByStorePaged`. |
| Web | `components/visits-table.tsx` | Multiple `/visit/getForTeam` calls | `/visit/getForTeams`. |
| Web | `app/Report2/page.tsx` | Multiple `/report/getForEmployee` calls | `/report/getForEmployeeRange`. |
| Mobile | `HomeScreen.js` | `/visit/getByDateRangeAndEmployee`, `/brand/getByDateRangeForEmployee` | `/visit/mobile-home-summary`. |
| Mobile | `VisitsList.js` | `/visit/getByDateRangeAndEmployee` | `/visit/getByDateRangeAndEmployeePaged` where infinite scroll/pagination is needed; keep old endpoint for single-day duplicate checks if acceptable. |
| Mobile | `Notifications1.js` | `/visit/getByDateRangeAndEmployee` | A notification-specific summary/list endpoint may be useful if this grows; current 4-day range is lower risk. |
| Mobile | `VisitsTimeline.js` | `/visit/getByStore` | `/visit/getByStorePaged`. |
| Mobile | `CustomerDetails.js`, `VisitScreen.js` | `/visit/getByDateRangeAndEmployee` for same-day store duplicate checks | Lower risk because it is a single-day range; keep unless it becomes slow. |

No additional backend optimization candidates were found in the current web/mobile scan beyond these migration items.

## Endpoints Not Worth Optimizing Right Now

These exist in the backend or API wrapper, but no active high-value web/mobile usage was found during this scan:

- `GET /visit/getAll`
- `GET /visit/getByEmployee`
- `GET /visit/getByDateRange`
- `GET /visit/getByEmployeeAndDateRange`

Do not spend time optimizing these unless the frontend starts using them again. If they remain unused, consider marking them deprecated or restricting them to admin/export workflows.

## Database Indexes To Add

These indexes directly support the optimized endpoints above. They are now declared on the `Visit` JPA entity. If the database already exists and Hibernate is not allowed to update schema, run this SQL manually:

```sql
CREATE INDEX idx_visit_employee_visit_date ON visit (employee_id, visit_date);
CREATE INDEX idx_visit_store_visit_date ON visit (store_id, visit_date);
CREATE INDEX idx_visit_employee_checkin_date ON visit (employee_id, checkin_date);
CREATE INDEX idx_visit_store_checkin_date ON visit (store_id, checkin_date);
```

If completion-date sorting remains important:

```sql
CREATE INDEX idx_visit_checkout_date ON visit (checkout_date);
```
