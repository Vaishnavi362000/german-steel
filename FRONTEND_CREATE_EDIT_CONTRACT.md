# Frontend Create/Edit Contract

Date: 2026-08-14

This document lists backend fields that frontend web/mobile forms should send for create/edit screens.

## Customer Create/Edit

Backend model: `StoreDto`

Endpoints:

| Action | Method | Endpoint | Body |
|---|---|---|---|
| Create customer | `POST` | `/store/create` | JSON `StoreDto` |
| Edit customer | `PUT` | `/store/edit?id={storeId}` | JSON `StoreDto` partial update |

New field:

| Field | Type | Required | Frontend control | Notes |
|---|---|---:|---|---|
| `yearOfJoining` | integer | No | Year-only dropdown | Store only the year, for example `2021`. Do not send a full date. |

Create payload example:

```json
{
  "storeName": "ABC Steels",
  "clientFirstName": "Raj",
  "clientLastName": "Patel",
  "primaryContact": 9876543210,
  "city": "Pune",
  "state": "Maharashtra",
  "clientType": "shop",
  "employeeId": 1,
  "yearOfJoining": 2021
}
```

Edit payload example:

```json
{
  "yearOfJoining": 2022
}
```

Expected response:

Customer read/list/search responses now include:

```json
{
  "storeId": 10,
  "storeName": "ABC Steels",
  "yearOfJoining": 2021
}
```

Affected backend responses:

| Endpoint | Includes `yearOfJoining` |
|---|---:|
| `GET /store/getById?id={storeId}` | Yes |
| `GET /store/getAll` | Yes |
| `GET /store/filteredValues` | Yes |
| `GET /store/export` | Yes, CSV column `Year Of Joining` |

## Visit Gifting

Backend support: implemented.

Visit fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `hasGift` | boolean | No | `true` when a gift was given during the visit |
| `giftName` | string | Conditional | Required when `hasGift = true` |
| `giftQuantity` | integer | Conditional | Required when `hasGift = true` if quantity is needed |
| `giftRemarks` | string | No | Optional gift notes |

These fields are accepted in `PUT /visit/create`, `PUT /visit/edit?id={visitId}`, and `PUT /visit/checkout?id={visitId}`.

Checkout payload example:

```json
{
  "checkoutLatitude": 18.5204,
  "checkoutLongitude": 73.8567,
  "feedback": "Visit completed",
  "outcome": "Positive",
  "hasGift": true,
  "giftName": "Diary",
  "giftQuantity": 1,
  "giftRemarks": "Given to store owner"
}
```

Gift image upload:

```http
PUT /visit/uploadFile?id={visitId}&tag=gift
Content-Type: multipart/form-data

file=<single image>
```

Accepted visit upload tags:

```text
check-in
check-out
gift
```

Only one gift image is kept per visit. Uploading another file with `tag=gift` replaces the previous gift image.

Expected response includes the gift fields and gift image in `attachmentResponse`:

```json
{
  "id": 10,
  "hasGift": true,
  "giftName": "Diary",
  "giftQuantity": 1,
  "giftRemarks": "Given to store owner",
  "attachmentResponse": [
    {
      "fileName": "abc.jpg",
      "fileDownloadUri": "http://host/downloadFile/abc.jpg",
      "fileType": "image/jpeg",
      "size": 0,
      "tag": "gift"
    }
  ]
}
```

## Rating Officers Report

Backend endpoint:

```http
GET /report/field-officer-performance?startDate=2026-08-01&endDate=2026-08-31
```

Optional filters:

| Parameter | Type | Required | Notes |
|---|---|---:|---|
| `startDate` | date | Yes | Format `YYYY-MM-DD` |
| `endDate` | date | Yes | Format `YYYY-MM-DD` |
| `employeeId` | number | No | Limits report to one field officer |
| `city` | string | No | Limits report to field officers in one city |
| `teamId` | number | No | Limits report to field officers in one team |

Expected response:

```json
[
  {
    "employeeId": 12,
    "employeeCode": "GS-FO-001",
    "employeeName": "Rahul Sharma",
    "city": "Pune",
    "teamId": 3,
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "targetValue": 100.0,
    "achievedValue": 72.0,
    "achievementPercent": 72.0,
    "totalVisits": 80,
    "completedVisits": 70,
    "completionRate": 87.5,
    "uniqueStoresVisited": 45,
    "newStores": 8,
    "presentDays": 2,
    "fullDays": 20,
    "halfDays": 2,
    "absences": 7,
    "rating": "Average"
  }
]
```

Rating rule:

| Achievement percent | Rating |
|---:|---|
| `>= 90` | `Excellent` |
| `>= 75` | `Good` |
| `>= 50` | `Average` |
| `< 50` | `Poor` |
| `0` or no target | `Not Rated` |

Target note:

The current backend target model stores the target amount on `CityTarget` and achieved amount on `EmployeeTarget`. This report sums matching monthly city target values and employee achieved values for every month touched by the selected date range.

Access note:

The endpoint applies backend employee visibility rules. Admin/owner/developer can see all field officers, office manager/manager can see assigned team or city officers, and a field officer can see only their own row.

## Sales Targets

Backend support: implemented.

This is separate from the older `/target` city target APIs. Use `/sales-target` for store-attached sales targets in tons.

### Create Target

```http
POST /sales-target/create
Content-Type: application/json
```

Monthly target payload:

```json
{
  "employeeId": 12,
  "storeId": 24,
  "targetType": "MONTHLY",
  "month": 8,
  "year": 2026,
  "targetTons": 50.0,
  "remarks": "August store sales target"
}
```

Daily target payload:

```json
{
  "employeeId": 12,
  "storeId": 24,
  "targetType": "DAILY",
  "targetDate": "2026-08-17",
  "targetTons": 2.5,
  "remarks": "Daily target for assigned store"
}
```

Create response:

```json
15
```

### Edit Target Or Fulfilment

```http
PUT /sales-target/edit?id={targetId}
Content-Type: application/json
```

Payload:

```json
{
  "targetTons": 60.0,
  "fulfilledTons": 35.0,
  "remarks": "Updated by admin"
}
```

`fulfilledTons` is manual fulfilment. If it is not set, the response uses actual sales tons from `/sales` records for the same employee, store, and target period.

### Web Search

```http
GET /sales-target/search?employeeId=12&storeId=24&month=8&year=2026
```

Optional filters:

| Parameter | Type | Notes |
|---|---|---|
| `employeeId` | number | Field officer |
| `storeId` | number | Store attached to target |
| `targetType` | string | `MONTHLY` or `DAILY` |
| `month` | number | `1` to `12` |
| `year` | number | Four digit year |
| `startDate` | date | Returns targets overlapping this range |
| `endDate` | date | Returns targets overlapping this range |

### Mobile My Targets

```http
GET /sales-target/my-summary?month=8&year=2026
```

Mobile users should use this endpoint. A field officer only receives their own targets.

Expected response:

```json
[
  {
    "id": 15,
    "employeeId": 12,
    "employeeName": "Rahul Sharma",
    "storeId": 24,
    "storeName": "ABC Steels",
    "storeCity": "Pune",
    "storeState": "Maharashtra",
    "targetType": "MONTHLY",
    "month": 8,
    "year": 2026,
    "targetDate": null,
    "targetTons": 50.0,
    "fulfilledTons": null,
    "salesTons": 20.0,
    "effectiveFulfilledTons": 20.0,
    "pendingTons": 30.0,
    "achievementPercent": 40.0,
    "status": "PENDING",
    "remarks": "August store sales target"
  }
]
```

Access:

| Role | Access |
|---|---|
| Admin/owner/developer | Create, edit, search all targets |
| Office manager/manager | Create, edit, search visible team/city targets |
| Field officer | View own targets through `my-summary` or scoped `search` |
