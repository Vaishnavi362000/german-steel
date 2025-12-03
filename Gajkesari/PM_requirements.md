# Frontend Implementation Guide - Customer/Store Management

**For:** Frontend Development Team  
**Date:** October 8, 2025  
**Status:** ✅ All Backend APIs Ready - Implement Immediately

---

## Overview

The PM has requested additional fields for different customer types. All fields are now implemented in the backend. This guide explains:
1. **Form Logic** - Which fields to show based on customer type
2. **API Calls** - Endpoints, payloads, and responses
3. **Display Logic** - What to show in Customer Detail view

---

## 🎯 Customer Types (clientType)

The system supports **3 customer types**:
1. **"Dealer"** - Dealer/Shop customers
2. **"Engineer"** / **"Architect"** / **"Contractor"** - Professional customers
3. **"Site Visit"** - Site/Project customers

---

## 📋 Form Logic - Create Customer Form

### **Step 1: Customer Type Selection**

Show a dropdown/radio button to select customer type:

```typescript
const customerTypes = [
  { value: "Dealer", label: "Dealer/Shop" },
  { value: "Engineer", label: "Engineer" },
  { value: "Architect", label: "Architect" },
  { value: "Contractor", label: "Contractor" },
  { value: "Site Visit", label: "Site Visit/Project" }
];
```

### **Step 2: Conditional Field Display**

Based on selected `clientType`, show/hide specific fields:

| Field | Dealer | Engineer/Architect/Contractor | Site Visit |
|-------|--------|-------------------------------|------------|
| **Basic Fields** (always show) | ✅ | ✅ | ✅ |
| - Store Name | ✅ | ✅ (as Firm Name) | ✅ (as Project Name) |
| - Owner First/Last Name | ✅ | ✅ | ✅ (Site Owner) |
| - Primary Contact | ✅ | ✅ | ✅ |
| - Email | ✅ | ✅ | ✅ |
| - Address | ✅ | ✅ | ✅ |
| - GPS (Lat/Long) | ✅ | ✅ | ✅ |
| **Dealer-Specific** | | | |
| - Shop Age (Years) | ✅ | ❌ | ❌ |
| - Ownership Type (RENTED/OWNED) | ✅ | ❌ | ❌ |
| - Dealer Type (ICON/NON_ICON) | ✅ | ❌ | ❌ |
| - Dealer SubType (EXCLUSIVE/NON_EXCLUSIVE) | ✅ | ❌ | ❌ |
| **Site Visit-Specific** | | | |
| - Contractor Selection | ❌ | ❌ | ✅ |
| - Engineer Selection | ❌ | ❌ | ✅ |
| - Project Type | ❌ | ❌ | ✅ |
| - Project Size (sq ft) | ❌ | ❌ | ✅ |

---

## 🔧 Implementation Logic (React Example)

```typescript
interface CustomerFormData {
  // Basic fields (always required)
  storeName: string;
  ownerFirstName: string;
  ownerLastName: string;
  primaryContact: number;
  email?: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: number;
  latitude?: number;
  longitude?: number;
  clientType: "Dealer" | "Engineer" | "Architect" | "Contractor" | "Site Visit";
  
  // Dealer-specific (show only if clientType === "Dealer")
  shopAgeYears?: number;
  ownershipType?: "RENTED" | "OWNED";
  dealerType?: "ICON" | "NON_ICON";
  dealerSubType?: "EXCLUSIVE" | "NON_EXCLUSIVE";
  
  // Site Visit-specific (show only if clientType === "Site Visit")
  contractorId?: number;
  engineerId?: number;
  projectType?: "HOME" | "APARTMENT" | "GOVT_PROJECT" | "COMMERCIAL" | "INDUSTRIAL" | "OTHERS";
  projectSizeSquareFeet?: number;
}

// Form rendering logic
function CustomerForm() {
  const [formData, setFormData] = useState<CustomerFormData>({...});
  const [clientType, setClientType] = useState<string>("");
  
  const showDealerFields = clientType === "Dealer";
  const showSiteVisitFields = clientType === "Site Visit";
  
  return (
    <form>
      {/* Basic Fields - Always Show */}
      <Input label="Customer Type" 
             value={clientType} 
             onChange={(e) => setClientType(e.target.value)} />
      
      <Input label={getLabelForStoreName(clientType)} name="storeName" />
      {/* If Dealer: "Shop Name"
          If Engineer/Architect/Contractor: "Firm Name" 
          If Site Visit: "Project Name" */}
      
      <Input label={getLabelForOwner(clientType)} name="ownerFirstName" />
      {/* If Dealer: "Owner Name"
          If Engineer/Architect/Contractor: "Owner Name"
          If Site Visit: "Site Owner Name" */}
      
      <Input label="Primary Contact" name="primaryContact" type="tel" />
      <Input label="Email" name="email" type="email" />
      <Input label="Address" name="addressLine1" />
      <Input label="City" name="city" />
      <Input label="State" name="state" />
      <Input label="Pincode" name="pincode" type="number" />
      <Input label="Latitude" name="latitude" type="number" />
      <Input label="Longitude" name="longitude" type="number" />
      
      {/* Dealer-Specific Fields */}
      {showDealerFields && (
        <>
          <Input label="Shop Age (Years)" name="shopAgeYears" type="number" />
          <Select label="Ownership Type" name="ownershipType">
            <option value="OWNED">Owned</option>
            <option value="RENTED">Rented</option>
          </Select>
          <Select label="Dealer Type" name="dealerType">
            <option value="ICON">ICON</option>
            <option value="NON_ICON">Non-ICON</option>
          </Select>
          <Select label="Dealer SubType" name="dealerSubType">
            <option value="EXCLUSIVE">Exclusive</option>
            <option value="NON_EXCLUSIVE">Non-Exclusive</option>
          </Select>
        </>
      )}
      
      {/* Site Visit-Specific Fields */}
      {showSiteVisitFields && (
        <>
          <Select label="Select Contractor" name="contractorId">
            {/* Fetch from GET /professional/list?role=Contractor */}
            {contractors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          
          <Select label="Select Engineer" name="engineerId">
            {/* Fetch from GET /professional/list?role=Engineer */}
            {engineers.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
          
          <Select label="Project Type" name="projectType">
            <option value="HOME">Home</option>
            <option value="APARTMENT">Apartment</option>
            <option value="GOVT_PROJECT">Government Project</option>
            <option value="COMMERCIAL">Commercial Building</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="OTHERS">Others</option>
          </Select>
          
          <Input label="Project Size (sq ft)" 
                 name="projectSizeSquareFeet" 
                 type="number" 
                 step="0.01" />
        </>
      )}
    </form>
  );
}

// Helper functions for dynamic labels
function getLabelForStoreName(clientType: string): string {
  switch(clientType) {
    case "Dealer": return "Shop Name";
    case "Engineer":
    case "Architect":
    case "Contractor": return "Firm Name";
    case "Site Visit": return "Project Name";
    default: return "Store Name";
  }
}

function getLabelForOwner(clientType: string): string {
  return clientType === "Site Visit" ? "Site Owner Name" : "Owner Name";
}
```

---

## 📡 API Endpoints

### **1. Create Customer/Store**

**Endpoint:** `POST /store/create`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

---

### **Payload Example 1: Dealer/Shop**

```json
{
  "storeName": "Kumar Steel Traders",
  "ownerFirstName": "Rajesh",
  "ownerLastName": "Kumar",
  "primaryContact": 9876543210,
  "secondaryContact": 9876543211,
  "email": "rajesh@kumarsteel.com",
  "industry": "Steel Trading",
  "companySize": 15,
  "gstNumber": "GST123456789",
  "addressLine1": "123 Steel Market",
  "addressLine2": "Shop No. 45",
  "city": "Mumbai",
  "landmark": "Near Railway Station",
  "district": "Mumbai",
  "subDistrict": "Andheri",
  "state": "Maharashtra",
  "country": "India",
  "pincode": 400058,
  "latitude": 19.076,
  "longitude": 72.8777,
  "shopAgeYears": 8,
  "ownershipType": "OWNED",
  "dealerType": "ICON",
  "dealerSubType": "EXCLUSIVE",
  "intent": 7,
  "monthlySale": 1500000.0,
  "clientType": "Dealer"
}
```

**Response:**
```json
{
  "storeId": 123,
  "message": "Store created successfully"
}
```

---

### **Payload Example 2: Engineer/Architect/Contractor (Firm)**

```json
{
  "storeName": "Kumar Engineering Solutions",
  "ownerFirstName": "Amit",
  "ownerLastName": "Kumar",
  "primaryContact": 9876543212,
  "email": "amit@kumarengg.com",
  "industry": "Civil Engineering",
  "companySize": 25,
  "addressLine1": "456 Engineering Complex",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": 400059,
  "latitude": 19.0896,
  "longitude": 72.8656,
  "clientType": "Engineer"
}
```

**Response:**
```json
{
  "storeId": 124,
  "message": "Store created successfully"
}
```

---

### **Payload Example 3: Site Visit/Project**

```json
{
  "storeName": "Skyline Residential Tower Project",
  "ownerFirstName": "Ramesh",
  "ownerLastName": "Patel",
  "primaryContact": 9876543214,
  "email": "ramesh@skylineproject.com",
  "industry": "Real Estate Development",
  "addressLine1": "Plot No. 45, Sector 21",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": 400060,
  "latitude": 19.0825,
  "longitude": 72.8417,
  "contractorId": 2,
  "engineerId": 1,
  "projectType": "APARTMENT",
  "projectSizeSquareFeet": 25000.0,
  "clientType": "Site Visit"
}
```

**Response:**
```json
{
  "storeId": 125,
  "message": "Store created successfully"
}
```

---

### **2. Get Customer/Store Details**

**Endpoint:** `GET /store/getById?id={storeId}`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response Example 1: Dealer**
```json
{
  "storeId": 123,
  "storeName": "Kumar Steel Traders",
  "clientFirstName": "Rajesh",
  "clientLastName": "Kumar",
  "primaryContact": 9876543210,
  "secondaryContact": 9876543211,
  "email": "rajesh@kumarsteel.com",
  "industry": "Steel Trading",
  "companySize": 15,
  "gstNumber": "GST123456789",
  "addressLine1": "123 Steel Market",
  "addressLine2": "Shop No. 45",
  "city": "Mumbai",
  "landmark": "Near Railway Station",
  "district": "Mumbai",
  "subDistrict": "Andheri",
  "state": "Maharashtra",
  "country": "India",
  "pincode": 400058,
  "latitude": 19.076,
  "longitude": 72.8777,
  "shopAgeYears": 8,
  "ownershipType": "OWNED",
  "dealerType": "ICON",
  "dealerSubType": "EXCLUSIVE",
  "intent": 7,
  "monthlySale": 1500000.0,
  "clientType": "Dealer",
  "employeeId": 5,
  "employeeName": "Suresh Reddy",
  "createdAt": "2025-01-15",
  "updatedAt": "2025-10-08"
}
```

**Response Example 2: Site Visit**
```json
{
  "storeId": 125,
  "storeName": "Skyline Residential Tower Project",
  "clientFirstName": "Ramesh",
  "clientLastName": "Patel",
  "primaryContact": 9876543214,
  "email": "ramesh@skylineproject.com",
  "industry": "Real Estate Development",
  "addressLine1": "Plot No. 45, Sector 21",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": 400060,
  "latitude": 19.0825,
  "longitude": 72.8417,
  "contractorId": 2,
  "contractorName": "Vikram Builders",
  "engineerId": 1,
  "engineerName": "Amit Structural Engineers",
  "projectType": "APARTMENT",
  "projectSizeSquareFeet": 25000.0,
  "clientType": "Site Visit",
  "employeeId": 5,
  "employeeName": "Suresh Reddy",
  "createdAt": "2025-03-20",
  "updatedAt": "2025-10-08"
}
```

---

### **3. Get Professional List (for Site Visit dropdowns)**

**Endpoint:** `GET /professional/list?role={role}`

**Query Parameters:**
- `role` - "Engineer", "Architect", or "Contractor"

**Example:** `GET /professional/list?role=Contractor`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Vikram Sharma",
    "contact": "9876543213",
    "role": "Contractor",
    "email": "vikram@example.com",
    "experience": "20 years in residential and commercial construction",
    "storeId": 5,
    "storeName": "Sharma Construction Pvt Ltd"
  },
  {
    "id": 2,
    "name": "Rajesh Patel",
    "contact": "9876543214",
    "role": "Contractor",
    "email": "rajesh@example.com",
    "experience": "15 years",
    "storeId": null,
    "storeName": null
  }
]
```

---

## 🖥️ Customer Detail View - Display Logic

### **Layout Structure**

```typescript
function CustomerDetailView({ customerId }: { customerId: number }) {
  const [customer, setCustomer] = useState<StoreDto | null>(null);
  
  useEffect(() => {
    // Fetch customer details
    fetch(`/store/getById?id=${customerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setCustomer(data));
  }, [customerId]);
  
  if (!customer) return <Loading />;
  
  const isDealer = customer.clientType === "Dealer";
  const isSiteVisit = customer.clientType === "Site Visit";
  
  return (
    <div className="customer-detail">
      {/* Header Section */}
      <Header>
        <h1>{customer.storeName}</h1>
        <Badge>{customer.clientType}</Badge>
      </Header>
      
      {/* Basic Information - Always Show */}
      <Section title="Basic Information">
        <Row label="Owner Name" value={`${customer.clientFirstName} ${customer.clientLastName}`} />
        <Row label="Primary Contact" value={customer.primaryContact} />
        <Row label="Secondary Contact" value={customer.secondaryContact} />
        <Row label="Email" value={customer.email} />
        <Row label="Industry" value={customer.industry} />
        <Row label="Company Size" value={customer.companySize} />
        <Row label="GST Number" value={customer.gstNumber} />
      </Section>
      
      {/* Address Information - Always Show */}
      <Section title="Address">
        <Row label="Address Line 1" value={customer.addressLine1} />
        <Row label="Address Line 2" value={customer.addressLine2} />
        <Row label="City" value={customer.city} />
        <Row label="District" value={customer.district} />
        <Row label="Sub-District" value={customer.subDistrict} />
        <Row label="State" value={customer.state} />
        <Row label="Pincode" value={customer.pincode} />
        <Row label="Landmark" value={customer.landmark} />
        <Row label="GPS Coordinates" value={`${customer.latitude}, ${customer.longitude}`} />
      </Section>
      
      {/* Dealer-Specific Information */}
      {isDealer && (
        <Section title="Dealer Information">
          <Row label="Shop Age" value={`${customer.shopAgeYears} years`} />
          <Row label="Ownership" value={customer.ownershipType} />
          <Row label="Dealer Type" value={customer.dealerType} />
          <Row label="Dealer SubType" value={customer.dealerSubType} />
          <Row label="Monthly Sale" value={formatCurrency(customer.monthlySale)} />
        </Section>
      )}
      
      {/* Site Visit-Specific Information */}
      {isSiteVisit && (
        <Section title="Project Information">
          <Row label="Project Type" value={customer.projectType} />
          <Row label="Project Size" value={`${customer.projectSizeSquareFeet} sq ft`} />
          <Row label="Contractor" value={customer.contractorName} />
          <Row label="Engineer" value={customer.engineerName} />
        </Section>
      )}
      
      {/* Assigned Employee - Always Show */}
      <Section title="Assignment">
        <Row label="Assigned To" value={customer.employeeName} />
        <Row label="Created At" value={formatDate(customer.createdAt)} />
        <Row label="Last Updated" value={formatDate(customer.updatedAt)} />
      </Section>
    </div>
  );
}
```

---

## 📊 Field Display Summary

### **Always Display (All Customer Types)**
✅ Store Name (label changes based on type)
✅ Owner Name
✅ Contact Details (Primary, Secondary, Email)
✅ Complete Address
✅ GPS Coordinates (if available)
✅ Industry
✅ Assigned Employee
✅ Created/Updated timestamps

### **Display Only for Dealer**
✅ Shop Age (Years)
✅ Ownership Type (Rented/Owned)
✅ Dealer Type (ICON/Non-ICON)
✅ Dealer SubType (Exclusive/Non-Exclusive)
✅ Monthly Sale

### **Display Only for Site Visit**
✅ Project Type (Home/Apartment/etc)
✅ Project Size (sq ft)
✅ Contractor Name (with link to contractor details)
✅ Engineer Name (with link to engineer details)

---

## 🔐 Required Permissions

**To Create Customer:**
- Roles: ADMIN, COORDINATOR, REGIONAL_MANAGER, FIELD_OFFICER
- Permissions: STORE_MANAGEMENT, DATA_WRITE, FULL_ACCESS

**To View Customer Details:**
- Roles: All roles can view
- Permissions: DATA_READ

---

## ✅ Validation Rules

### **Required Fields (All Types)**
- `storeName` ✅ Required
- `ownerFirstName` ✅ Required
- `ownerLastName` ✅ Required
- `primaryContact` ✅ Required (must be unique, 10 digits)
- `addressLine1` ✅ Required
- `city` ✅ Required
- `state` ✅ Required
- `pincode` ✅ Required
- `clientType` ✅ Required

### **Optional But Recommended**
- `email` - Optional but recommended
- `latitude`, `longitude` - Optional but important for site visits
- `gstNumber` - Optional, must be unique if provided
- `secondaryContact` - Optional

### **Conditional Required (Dealer)**
- If `dealerType` is "ICON", then `dealerSubType` is recommended

### **Conditional Required (Site Visit)**
- `projectType` - Highly recommended for site visits
- `contractorId` OR `engineerId` - At least one is recommended

---

## 🎨 UI/UX Recommendations

### **1. Dynamic Form Labels**
Change labels based on `clientType`:
- Store Name → "Shop Name" (Dealer) / "Firm Name" (Engineer) / "Project Name" (Site Visit)
- Owner Name → "Owner Name" (Dealer/Engineer) / "Site Owner" (Site Visit)

### **2. Section Grouping**
Group related fields:
- **Basic Info** section
- **Address** section
- **Dealer Details** section (only for Dealer)
- **Project Details** section (only for Site Visit)

### **3. Progressive Disclosure**
- Show basic fields first
- Show type-specific fields after clientType is selected
- Use smooth transitions when showing/hiding fields

### **4. Dropdown Pre-population**
- For Site Visit: Pre-fetch contractor and engineer lists when form loads
- Cache the professional lists to avoid repeated API calls

### **5. GPS Integration**
- Add "Use Current Location" button to auto-fill latitude/longitude
- Show map preview if coordinates are provided

### **6. Validation Feedback**
- Real-time validation for contact number (10 digits)
- Email format validation
- GST number format validation (if provided)

---

## 📱 Mobile Considerations

- Make sure dropdowns are touch-friendly
- GPS capture should use device location API
- Consider splitting long forms into steps for better mobile UX
- Use appropriate input types (tel for phone, email for email, number for numeric fields)

---

## 🚀 Implementation Checklist

- [ ] Add clientType selector
- [ ] Implement conditional field display logic
- [ ] Add Dealer-specific fields (shopAgeYears, ownershipType, dealerType, dealerSubType)
- [ ] Add Site Visit-specific fields (contractorId, engineerId, projectType, projectSizeSquareFeet)
- [ ] Fetch professional list API for contractor/engineer dropdowns
- [ ] Implement dynamic labels based on clientType
- [ ] Add GPS location capture
- [ ] Update Customer Detail view to show conditional fields
- [ ] Add validation for all required fields
- [ ] Test with all 3 customer types
- [ ] Handle API error responses
- [ ] Add loading states

---

## 💡 Sample Code Snippets

### **Field Mapper for Display**

```typescript
const getFieldLabel = (field: string, clientType: string): string => {
  const labelMap: Record<string, Record<string, string>> = {
    storeName: {
      Dealer: "Shop Name",
      Engineer: "Firm Name",
      Architect: "Firm Name",
      Contractor: "Firm Name",
      "Site Visit": "Project Name"
    },
    ownerFirstName: {
      "Site Visit": "Site Owner First Name",
      default: "Owner First Name"
    }
  };
  
  return labelMap[field]?.[clientType] || labelMap[field]?.default || field;
};
```

### **Conditional Field Renderer**

```typescript
const shouldShowField = (field: string, clientType: string): boolean => {
  const dealerOnlyFields = ['shopAgeYears', 'ownershipType', 'dealerType', 'dealerSubType'];
  const siteVisitOnlyFields = ['contractorId', 'engineerId', 'projectType', 'projectSizeSquareFeet'];
  
  if (dealerOnlyFields.includes(field)) {
    return clientType === 'Dealer';
  }
  
  if (siteVisitOnlyFields.includes(field)) {
    return clientType === 'Site Visit';
  }
  
  return true; // Show basic fields for all types
};
```

---

**All backend APIs are ready and tested. Frontend can start implementation immediately!** 🎯

