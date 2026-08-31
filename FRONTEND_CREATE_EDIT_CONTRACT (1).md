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

## Location Master Dropdowns

Backend support: implemented.

Use this hierarchy for customer/employee location dropdowns:

```text
State -> District -> City -> Village
```

These endpoints return master location data. They do not change the existing customer or employee create/edit payload yet.

### Get States

```http
GET /locations/states
```

Response:

```json
[
  {
    "id": 1,
    "lgdCode": 29,
    "name": "Karnataka",
    "type": "STATE"
  }
]
```

### Get Districts By State

```http
GET /locations/districts?stateId={stateId}
```

Alternative using LGD code:

```http
GET /locations/districts?stateCode={lgdStateCode}
```

Response:

```json
[
  {
    "id": 10,
    "lgdCode": 525,
    "name": "Bangalore Urban",
    "type": "DISTRICT"
  }
]
```

### Get Cities By District

```http
GET /locations/cities?districtId={districtId}&page=0&size=20
```

Optional search:

```http
GET /locations/cities?districtId={districtId}&q=beng&page=0&size=20
```

Alternative using LGD district code:

```http
GET /locations/cities?districtCode={lgdDistrictCode}&page=0&size=20
```

Response:

```json
{
  "content": [
    {
      "id": 100,
      "lgdCode": 12345,
      "name": "Bengaluru",
      "type": "CITY"
    }
  ],
  "number": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### Get Villages By City

```http
GET /locations/villages?cityId={cityId}&page=0&size=20
```

Optional search:

```http
GET /locations/villages?cityId={cityId}&q=bidar&page=0&size=20
```

Alternative using LGD city code:

```http
GET /locations/villages?cityCode={lgdCityCode}&page=0&size=20
```

Response:

```json
{
  "content": [
    {
      "id": 1000,
      "lgdCode": 612345,
      "name": "Bidarahalli",
      "type": "VILLAGE"
    }
  ],
  "number": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### Search Cities Or Villages

```http
GET /locations/search/cities?q=beng&page=0&size=20
GET /locations/search/villages?q=bidar&page=0&size=20
```

Use search when the user types into an autocomplete instead of selecting parent dropdowns first.

### Resolve Full Hierarchy

If frontend has only a selected city:

```http
GET /locations/hierarchy/city?cityId={cityId}
```

If frontend has only a selected village:

```http
GET /locations/hierarchy/village?villageId={villageId}
```

Response for village:

```json
{
  "state": {
    "id": 1,
    "lgdCode": 29,
    "name": "Karnataka",
    "type": "STATE"
  },
  "district": {
    "id": 10,
    "lgdCode": 525,
    "name": "Bangalore Urban",
    "type": "DISTRICT"
  },
  "city": {
    "id": 100,
    "lgdCode": 12345,
    "name": "Bengaluru",
    "type": "CITY"
  },
  "village": {
    "id": 1000,
    "lgdCode": 612345,
    "name": "Bidarahalli",
    "type": "VILLAGE"
  }
}
```

Frontend use:

| Screen | Use |
|---|---|
| Customer create/edit | Use location dropdowns to prefill/send `state`, `district`, `city`. Village can be added to UI when required. |
| Employee create/edit | Use location dropdowns for employee `state`, `city`, and assignment flow. |
| Filters/reports | Prefer `id` for master dropdown selection in new screens; existing endpoints still accept text filters. |

Data note:

The tables and APIs are ready, but production data must still be seeded/imported from the selected LGD dataset.

Backend seeding:

Use the script below to convert a CSV into SQL, then run it against the deployed MySQL database.

```bash
python3 scripts/generate_location_seed_sql.py /path/to/location-data.csv > /tmp/seed_locations.sql

mysql -h german-steels-rds.c3so86eoe14s.us-east-1.rds.amazonaws.com \
  -u admin \
  -p \
  german_steels < /tmp/seed_locations.sql
```

Supported CSV columns:

| Value | Accepted column names |
|---|---|
| State code | `lgd_state_code`, `state_code` |
| State name | `state_name`, `state` |
| District code | `lgd_district_code`, `district_code` |
| District name | `district_name`, `district` |
| City code | `lgd_city_code`, `city_code`, `lgd_subdistrict_code`, `subdistrict_code`, `sub_district_code`, `taluka_code` |
| City name | `city_name`, `city`, `subdistrict_name`, `sub_district_name`, `taluka_name`, `taluka` |
| Village code | `lgd_village_code`, `village_code` |
| Village name | `village_name`, `village` |

If the source dataset has taluka/subdistrict instead of city, the seed script stores that value in `location_city` so frontend still gets the required `State -> District -> City -> Village` flow.
