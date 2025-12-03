# 📱 Mobile App RBAC Testing Plan

**App:** IconMobile (React Native)  
**Roles:** Regional Manager & Field Officer ONLY  
**Purpose:** Verify role-based filtering in mobile app with real-world scenarios

---

## 🎯 **Mobile App Structure**

### **Navigation Tabs:**
1. **Home** - Dashboard, Recent visits, Metrics
2. **Visits** - Visit list, Create visit, Check-in/out
3. **Customers** - Customer list, Create customer

### **Accessible By:**
- ✅ Regional Manager (VikramS, Payal)
- ✅ Field Officer (kushal_a, shilpa_t)
- ❌ Admin, Data Manager, Coordinator, HR (web only)

---

## 📋 **Screen-by-Screen API Analysis**

### **1. Login Screen** (`LoginScreen.js`)
**Purpose:** Authentication  
**Accessible:** Everyone (pre-auth)

**API Calls:**
```javascript
POST /user/token
Body: { username, password }
Response: "FIELD_OFFICER eyJhbGc..." or "REGIONAL_MANAGER eyJhbGc..."
```

**Real-World Test Scenarios:**
```bash
# Test 1: Field Officer Login
POST /user/token { "username": "kushal_a", "password": "123456" }
Expected: "FIELD_OFFICER" token returned

# Test 2: Regional Manager Login  
POST /user/token { "username": "VikramS", "password": "Vikram123" }
Expected: "REGIONAL_MANAGER" token returned

# Test 3: Admin Login (should fail on mobile)
POST /user/token { "username": "admin", "password": "admin" }
Expected: Token returned but mobile app should only allow FO/RM
```

---

### **2. Home Screen** (`HomeScreen.js`)
**Purpose:** Dashboard with recent visits, metrics, pending tasks  
**Accessible:** Regional Manager, Field Officer

**API Calls:**
1. `PUT /employee/updateLiveLocation?id={employeeId}&latitude={lat}&longitude={lng}` - Update location
2. `GET /visit/getByDateRangeAndEmployee?id={employeeId}&start={start}&end={end}` - Get visits
3. `GET /employee/get?id={employeeId}` - Get employee details
4. `GET /brand/getByDateRangeForEmployee?start={date}&end={date}&id={employeeId}` - Get brand data

**Real-World Test Scenarios:**

**Scenario 1: Field Officer (kushal_a) loads home screen**
```bash
# Get own visits for today
GET /visit/getByDateRangeAndEmployee?id=25&start=2025-10-15&end=2025-10-15
Expected: Only kushal_a's visits (0-5 visits)

# Get own employee details
GET /employee/get?id=25
Expected: kushal_a's profile with assignedCity: ["Delhi"]

# Update live location
PUT /employee/updateLiveLocation?id=25&latitude=28.6139&longitude=77.209
Expected: Location updated successfully
```

**Scenario 2: Regional Manager (VikramS) loads home screen**
```bash
# Get own visits
GET /visit/getByDateRangeAndEmployee?id=12&start=2025-10-15&end=2025-10-15
Expected: VikramS's visits (if any)

# Get own profile
GET /employee/get?id=12
Expected: VikramS profile with assignedCity: ["Delhi", "Bangalore"]
```

---

### **3. Customer List Screen** (`CustomerListScreen.js`)
**Purpose:** View customers/stores  
**Accessible:** Regional Manager, Field Officer (filtered by cities)

**API Calls:**
1. `GET /store/filteredValues?page={page}&size={size}&sortBy=storeName&sortOrder=asc&storeName={search}` - Get stores
2. `PUT /employee/updateLiveLocation?id={employeeId}&latitude={lat}&longitude={lng}` - Update location

**Real-World Test Scenarios:**

**Scenario 1: Field Officer (kushal_a) views customers**
```bash
# Get stores (should be filtered to Delhi only)
GET /store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc
Expected: Only stores in Delhi (1 store based on our test: "Dmart, Delhi")

# Search for a store
GET /store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc&storeName=Dmart
Expected: Stores matching "Dmart" in Delhi only
```

**Scenario 2: Regional Manager (VikramS) views customers**
```bash
# Get stores (should be filtered to team cities: Delhi, Bangalore)
GET /store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc
Expected: Stores in Delhi and Bangalore only (6 stores based on our test)
```

**Scenario 3: Field Officer (shilpa_t) views customers**
```bash
# Get stores (should be filtered to Mumbai only)
GET /store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc
Expected: Stores in Mumbai only (assignedCity: ["Mumbai"])
```

---

### **4. Create Customer** (`CreateCustomerComponent.js`)
**Purpose:** Create new customer/store  
**Accessible:** Regional Manager, Field Officer

**API Calls:**
1. `GET /employee/me` - Get own profile with assigned cities
2. `GET /location/cityInfo?cityName={city}` - Get city details for auto-fill
3. `GET /location/states` - Get states dropdown
4. `GET /location/districts?state={state}` - Get districts
5. `GET /location/subDistricts?district={district}` - Get sub-districts
6. `GET /location/cities?subDistrict={subDistrict}` - Get cities
7. `POST /store/create` - Create new store

**Real-World Test Scenarios:**

**Scenario 1: Field Officer (kushal_a) creates customer**
```bash
# Step 1: Load assigned cities
GET /employee/me
Expected: { assignedCity: ["Delhi"], ... }

# Step 2: Auto-select first city and get details
GET /location/cityInfo?cityName=Delhi
Expected: { cityName: "Delhi", stateName: "Delhi", districtName: "Central Delhi", ... }

# Step 3: Create customer in Delhi
POST /store/create
Body: {
  storeName: "New Delhi Store",
  city: "Delhi",
  state: "Delhi",  // Auto-filled
  district: "Central Delhi",  // Auto-filled
  primaryContact: 9999999999,
  employeeId: 25  // kushal_a's ID
}
Expected: Store created successfully
```

**Scenario 2: Regional Manager (VikramS) creates customer**
```bash
# Step 1: Load assigned cities
GET /employee/me
Expected: { assignedCity: ["Delhi", "Bangalore"], ... }

# Step 2: User selects Bangalore, get city info
GET /location/cityInfo?cityName=Bangalore
Expected: { cityName: "Bangalore", stateName: "Karnataka", districtName: "Bangalore Urban", ... }

# Step 3: Create customer in Bangalore
POST /store/create
Body: {
  storeName: "New Bangalore Store",
  city: "Bangalore",
  state: "Karnataka",  // Auto-filled
  district: "Bangalore Urban",  // Auto-filled
  employeeId: 12  // VikramS's ID
}
Expected: Store created successfully
```

**Scenario 3: Field Officer tries to create customer outside assigned city**
```bash
# Field Officer (kushal_a) assigned to Delhi tries to create in Mumbai
POST /store/create
Body: {
  city: "Mumbai",  // NOT in assigned cities!
  employeeId: 25
}
Expected: Should fail OR city dropdown should only show Delhi
```

---

### **5. Visits List** (`VisitsList.js`)
**Purpose:** View and manage visits  
**Accessible:** Regional Manager, Field Officer

**API Calls:**
1. `GET /timeline/getByDate?employeeId={id}&date={date}` - Get timeline for date
2. `GET /visit/getByDateRangeAndEmployee?id={employeeId}&start={date}&end={date}` - Get visits
3. `PUT /visit/create` - Create new visit
4. `POST /activity/create` - Create activity
5. `POST /store/create` - Quick create store (if not exists)
6. `GET /store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc` - Search stores

**Real-World Test Scenarios:**

**Scenario 1: Field Officer (kushal_a) views visits**
```bash
# Get today's timeline
GET /timeline/getByDate?employeeId=25&date=2025-10-15
Expected: Only kushal_a's activities and visits for today

# Get visits in date range
GET /visit/getByDateRangeAndEmployee?id=25&start=2025-10-01&end=2025-10-15
Expected: Only kushal_a's visits in this range
```

**Scenario 2: Field Officer creates visit**
```bash
# Create visit to a store in Delhi
PUT /visit/create
Body: {
  storeId: 123,  // Store in Delhi
  employeeId: 25,
  visitDate: "2025-10-16",
  scheduledStartTime: "10:00",
  visitPurpose: "Sales call"
}
Expected: Visit created successfully
```

**Scenario 3: Regional Manager (VikramS) views visits**
```bash
# Get own visits
GET /visit/getByDateRangeAndEmployee?id=12&start=2025-10-01&end=2025-10-15
Expected: VikramS's visits only (Regional Manager shouldn't see team visits via this endpoint)

# Note: Regional Manager sees team visits via /visit/getAll on web, but on mobile
# they use employee-specific endpoints, so they see only their own visits
```

---

### **6. Visit Screen** (`VisitScreen.js`)
**Purpose:** Visit details, check-in/out, add notes/tasks  
**Accessible:** Regional Manager, Field Officer (own visits)

**API Calls:**
1. `GET /site/getByStore?id={storeId}` - Get store sites
2. `GET /visit/getById?id={visitId}` - Get visit details
3. `GET /store/getById?id={storeId}` - Get store details
4. `GET /notes/getByVisit?id={visitId}` - Get visit notes
5. `GET /visit/getProCons?visitId={visitId}` - Get pros/cons
6. `GET /task/getByVisit?type=complaint&visitId={visitId}` - Get complaints
7. `GET /task/getByVisit?type=requirement&visitId={visitId}` - Get requirements
8. `GET /monthly-sale/getByVisit?visitId={visitId}` - Get monthly sales
9. `GET /intent-audit/getByVisit?id={visitId}` - Get intent audit
10. `PUT /visit/edit?id={visitId}` - Update visit
11. `PUT /visit/checkin?id={visitId}` - Check in
12. `PUT /visit/checkout?id={visitId}` - Checkout

**Real-World Test Scenarios:**

**Scenario 1: Field Officer (kushal_a) checks in to visit**
```bash
# Open visit details
GET /visit/getById?id=101
Expected: Visit details if visit belongs to kushal_a, otherwise 403 or error

# Check in to visit
PUT /visit/checkin?id=101
Body: {
  checkinLatitude: 28.6139,
  checkinLongitude: 77.209,
  checkinDate: "2025-10-15",
  checkinTime: "10:30:00"
}
Expected: Check-in successful
```

**Scenario 2: Field Officer tries to access another FO's visit**
```bash
# Try to open shilpa_t's visit (ID belongs to different FO)
GET /visit/getById?id=999
Expected: Should fail or return 403 (not authorized)
```

---

### **7. Customer Details** (`CustomerDetails.js`)
**Purpose:** View customer/store details  
**Accessible:** Regional Manager, Field Officer

**API Calls:**
- `GET /store/getById?id={storeId}` - Get store details
- Various visit-related calls

**Real-World Test Scenarios:**

**Scenario 1: Field Officer views customer in assigned city**
```bash
# View Dmart store in Delhi
GET /store/getById?id=123
Expected: Store details returned (kushal_a assigned to Delhi)
```

**Scenario 2: Field Officer tries to view customer outside assigned city**
```bash
# Try to view Mumbai store
GET /store/getById?id=456
Expected: Should work (backend doesn't restrict getById currently)
Note: This might be a security issue if FO can access any store by ID
```

---

### **8. Dashboard Screen** (`DashboardScreen.js`)
**Purpose:** Metrics and analytics  
**Accessible:** Regional Manager, Field Officer

**API Calls:** (Need to check this file for specific calls)

---

### **9. Expense Screen** (`ExpenseScreen.js`)
**Purpose:** Submit and track expenses  
**Accessible:** Regional Manager, Field Officer

**API Calls:**
- `GET /expense/getByEmployee?employeeId={id}` - Get own expenses
- `POST /expense/create` - Create expense
- `GET /expense/types` - Get expense types

**Real-World Test Scenarios:**

**Scenario 1: Field Officer submits expense**
```bash
# Get own expenses
GET /expense/getByEmployee?employeeId=25
Expected: Only kushal_a's expenses

# Create new expense
POST /expense/create
Body: {
  employeeId: 25,
  amount: 500,
  type: "Travel",
  description: "Client visit travel",
  date: "2025-10-15"
}
Expected: Expense created and pending approval
```

---

### **10. Attendance Screen** (`AttendanceScreen.js`)
**Purpose:** Mark attendance  
**Accessible:** Regional Manager, Field Officer

**API Calls:**
- `GET /attendance-log/getByEmployee?employeeId={id}` - Get attendance
- `POST /attendance-log/create` - Mark attendance

---

## 🧪 **Comprehensive Mobile Testing Matrix**

### **Test Categories:**

| Category | Field Officer | Regional Manager |
|----------|---------------|------------------|
| Login | ✅ kushal_a, shilpa_t | ✅ VikramS, Payal |
| View Stores | ✅ Assigned cities only | ✅ Team cities only |
| Create Customer | ✅ Assigned cities prefilled | ✅ Assigned cities prefilled |
| View Visits | ✅ Own visits only | ✅ Own visits only (via employee endpoint) |
| Create Visit | ✅ Stores in assigned cities | ✅ Stores in team cities |
| Check-in/out | ✅ Own visits only | ✅ Own visits only |
| Submit Expense | ✅ Own expenses | ✅ Own expenses |
| View Profile | ✅ Own profile | ✅ Own profile |
| Live Location | ✅ Updates own location | ✅ Updates own location |

---

## 🔬 **Detailed Test Scenarios by Role**

### **Field Officer (kushal_a) - Delhi**

**Test 1: Login & Profile**
```bash
POST /user/token { "username": "kushal_a", "password": "123456" }
GET /employee/me
Expected: { id: 25, assignedCity: ["Delhi"], firstName: "Kushal", ... }
```

**Test 2: View Customers (City Filtering)**
```bash
GET /store/filteredValues?page=0&size=20&sortBy=storeName&sortOrder=asc
Expected: Only stores in Delhi (1 store: "Dmart")
```

**Test 3: Create Customer (City Restriction)**
```bash
# Load form - city dropdown should only show Delhi
GET /employee/me → assignedCity: ["Delhi"]
GET /location/cityInfo?cityName=Delhi
Expected: Auto-fills State, District for Delhi

# Create customer
POST /store/create
Body: {
  storeName: "Test Delhi Store",
  city: "Delhi",  // MUST be from assigned cities
  state: "Delhi",
  district: "Central Delhi",
  primaryContact: 8888888888,
  employeeId: 25
}
Expected: Store created in Delhi
```

**Test 4: View Visits (Own Only)**
```bash
GET /visit/getByDateRangeAndEmployee?id=25&start=2025-10-01&end=2025-10-15
Expected: Only kushal_a's visits (currently 0)
```

**Test 5: Create Visit**
```bash
# Select store (should only show Delhi stores)
GET /store/filteredValues?page=0&size=20
Expected: Delhi stores only

# Create visit
PUT /visit/create
Body: {
  storeId: 123,  // Dmart in Delhi
  employeeId: 25,
  visitDate: "2025-10-16",
  scheduledStartTime: "10:00",
  visitPurpose: "sales"
}
Expected: Visit created
```

**Test 6: Check-in to Visit**
```bash
PUT /visit/checkin?id=101
Body: {
  checkinLatitude: 28.6139,
  checkinLongitude: 77.209,
  checkinDate: "2025-10-16",
  checkinTime: "10:05:00"
}
Expected: Check-in successful
```

**Test 7: Checkout from Visit**
```bash
PUT /visit/checkout?id=101
Body: {
  checkoutLatitude: 28.6140,
  checkoutLongitude: 77.210,
  checkoutDate: "2025-10-16",
  checkoutTime: "11:30:00"
}
Expected: Checkout successful
```

---

### **Field Officer (shilpa_t) - Mumbai**

**Test 1: City Filtering Different**
```bash
GET /employee/me
Expected: { assignedCity: ["Mumbai"], ... }

GET /store/filteredValues?page=0&size=20
Expected: Only Mumbai stores (different from kushal_a)
```

**Test 2: Create Customer in Mumbai**
```bash
GET /location/cityInfo?cityName=Mumbai
Expected: { cityName: "Mumbai", stateName: "Maharashtra", ... }

POST /store/create
Body: {
  storeName: "Mumbai Test Store",
  city: "Mumbai",  // shilpa_t's assigned city
  state: "Maharashtra",
  employeeId: 13  // shilpa_t's ID
}
Expected: Store created in Mumbai
```

---

### **Regional Manager (VikramS) - Delhi, Bangalore**

**Test 1: Multiple Assigned Cities**
```bash
GET /employee/me
Expected: { assignedCity: ["Delhi", "Bangalore"], ... }
```

**Test 2: View Customers (Team Cities)**
```bash
GET /store/filteredValues?page=0&size=20
Expected: Stores in Delhi + Bangalore (6 stores based on team cities)
```

**Test 3: Create Customer in Either City**
```bash
# Can create in Delhi
POST /store/create { city: "Delhi", employeeId: 12 }
Expected: Success

# Can create in Bangalore
POST /store/create { city: "Bangalore", employeeId: 12 }
Expected: Success
```

**Test 4: View Own Visits (Not Team Visits on Mobile)**
```bash
# Mobile uses employee-specific endpoint
GET /visit/getByDateRangeAndEmployee?id=12&start=2025-10-01&end=2025-10-15
Expected: Only VikramS's own visits (not team visits)

# Note: Team visits are visible on web (/visit/getAll) but not on mobile
```

---

## 🔍 **Critical Security Tests**

### **Test 1: Cross-City Access Prevention**
```bash
# Field Officer (kushal_a) assigned to Delhi tries to access Mumbai store
GET /store/getById?id={mumbai_store_id}
Expected: Should this be blocked? Currently not restricted by ID lookup
```

### **Test 2: Cross-Employee Visit Access**
```bash
# Field Officer (kushal_a) tries to check in to shilpa_t's visit
PUT /visit/checkin?id={shilpa_visit_id}
Expected: Should fail - can only check in to own visits
```

### **Test 3: Unauthorized Store Creation**
```bash
# Field Officer tries to create store outside assigned city
POST /store/create { city: "Chennai", employeeId: 25 }
Expected: Should fail - Chennai not in assignedCity: ["Delhi"]
```

---

## 📊 **Mobile-Specific Data Filtering**

### **Key Differences from Web:**

| Feature | Web | Mobile |
|---------|-----|--------|
| **Regional Manager Visits** | Sees team visits (/visit/getAll) | Sees own visits only (/visit/getByDateRangeAndEmployee) |
| **Store Filtering** | Team cities | Assigned cities (same as backend filter) |
| **Customer Creation** | Can assign any city | City dropdown limited to assigned cities |
| **Visit Creation** | Can create for team members | Can create only for self |

---

## 🧪 **Real-World Test Plan**

### **Phase 1: Authentication (2 tests)**
- Field Officer login (kushal_a, shilpa_t)
- Regional Manager login (VikramS, Payal)

### **Phase 2: Customer Management (12 tests)**
- View customers by role (4 users)
- Create customer in assigned city (4 users)
- Search customers (4 users)

### **Phase 3: Visit Management (16 tests)**
- View own visits (4 users)
- Create visit (4 users)
- Check-in to visit (4 users)
- Checkout from visit (4 users)

### **Phase 4: Location Services (8 tests)**
- City auto-fill (4 users)
- Live location update (4 users)

### **Phase 5: Security Tests (8 tests)**
- Cross-city store access attempts
- Cross-employee visit access attempts
- Unauthorized city selection attempts
- Outside-region data access attempts

**Total Mobile Tests:** ~46 tests

---

## 📋 **Test Data Requirements**

### **Existing Data Needed:**
- ✅ kushal_a (FO) - Delhi - ID: 25
- ✅ shilpa_t (FO) - Mumbai - ID: 13
- ✅ VikramS (RM) - Delhi, Bangalore - ID: 12
- ✅ Payal (RM) - Delhi, Whitefield, Mumbai, Bangalore - ID: 13

### **Test Stores Needed:**
- Delhi stores (for kushal_a testing)
- Mumbai stores (for shilpa_t testing)
- Bangalore stores (for VikramS testing)

### **Test Visits Needed:**
- Visits for kushal_a in Delhi
- Visits for shilpa_t in Mumbai
- Visits for VikramS

---

## 🎯 **Key Testing Focus**

### **Priority 1: City Filtering (CRITICAL)**
- Field Officers see only assigned city stores
- City dropdown shows only assigned cities
- Cannot create customers outside assigned cities

### **Priority 2: Visit Ownership (CRITICAL)**
- Field Officers see only own visits
- Cannot check-in to other employees' visits
- Visit creation restricted to assigned cities

### **Priority 3: Data Consistency (HIGH)**
- Customer list matches backend filter
- Visit list matches backend filter
- Live location updates correctly

### **Priority 4: Regional Manager Scope (MEDIUM)**
- RM has multiple assigned cities
- RM sees aggregated data from team cities
- RM on mobile behaves like enhanced Field Officer (not full team management)

---

## 📝 **Next Steps**

1. Create automated mobile test script using curl
2. Test all 4 users (kushal_a, shilpa_t, VikramS, Payal)
3. Verify city filtering works correctly
4. Test create customer flow end-to-end
5. Test visit check-in/out workflow
6. Document any security issues found

