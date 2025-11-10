# Ngrok API Fix Guide

## Problem
When making API requests to the ngrok server, the mobile app was receiving HTML login pages instead of JSON responses. This happened because ngrok requires special headers to bypass its browser warning page.

## Solution
Add these headers to **EVERY** API request:

```javascript
{
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'IconMobile',
}
```

## Files Already Fixed
The following files have been updated with the ngrok headers:

1. ✅ `screens/LoginScreen.js` - Version check and employee data fetch
2. ✅ `App.js` - Token verification on app startup
3. ✅ `services/api.js` - NEW centralized API service (recommended to use)

## Recommended Approach: Use the New API Service

We've created a centralized API service at `services/api.js` that automatically includes the ngrok headers in all requests.

### Migration Example

**❌ OLD WAY (Without ngrok headers):**
```javascript
import axios from 'axios';

const response = await axios.get(
  'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/me',
  {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  }
);
```

**✅ NEW WAY (Using centralized API service):**
```javascript
import api, { apiEndpoints } from '../services/api';

const response = await api.get('/employee/me');
// or using endpoints
const response = await api.get(apiEndpoints.employeeMe);
```

### Benefits of Using the API Service
1. ✅ Ngrok headers automatically included
2. ✅ Authorization token automatically added from AsyncStorage
3. ✅ Consistent error handling
4. ✅ Single place to update API configuration
5. ✅ Type-safe endpoint definitions

## Files That Still Need Migration

The following files make axios calls and should be migrated to use the new API service:

### High Priority (Main Screens)
- `screens/HomeScreen.js` - 5 axios calls
- `screens/VisitScreen.js` - 1 axios call
- `screens/CustomerListScreen.js` - 2 axios calls
- `screens/CustomerDetails.js` - Multiple axios calls
- `screens/VisitsList.js` - Multiple axios calls
- `screens/DashboardScreen.js` - Multiple axios calls

### Medium Priority (Feature Screens)
- `screens/AttendanceScreen.js`
- `screens/ExpenseScreen.js`
- `screens/ComplaintsScreen.js`
- `screens/RequirementsScreen.js`
- `screens/AddComplaintScreen.js`
- `screens/AddRequirementScreen.js`
- `screens/HomeLocationScreen.js`
- `screens/VisitsTimeline.js`

### Low Priority (Supporting Screens)
- `screens/Notes.js`
- `screens/NotesSection.js`
- `screens/Requirements.js`
- `screens/Complaints.js`
- `screens/BrandsProCons.js`
- `screens/BrandsSection.js`
- `screens/LikesSection.js`
- `screens/MonthlySales.js`
- `screens/Notifications1.js`
- `screens/CameraScreen.js`
- `screens/CheckInImages.js`
- `screens/ContactsManager.js`
- `screens/CreateCustomerComponent.js`
- `screens/CreateVisitModal.js`
- `screens/AddFollowUp.js`
- `screens/LocationService.js`

### Components
- `components/PendingCustomers.js`
- `components/AddCustomerModal.js`

### Hooks
- `hooks/useConnectivityStatus.js`

## Manual Fix (If Not Using API Service)

If you prefer to manually add headers to existing axios calls:

```javascript
const response = await axios.get(
  'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/me',
  {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Bypass ngrok browser warning page
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'IconMobile',
    },
  }
);
```

## Testing

After migrating, test the following scenarios:

1. ✅ Login flow
2. ✅ Fetching employee data
3. ✅ Fetching visits
4. ✅ Fetching customers/stores
5. ✅ Creating visits
6. ✅ Uploading images
7. ✅ Creating notes
8. ✅ Creating tasks (complaints/requirements)

## Next Steps

1. **Immediate**: The login flow should now work properly with the fixes applied.
2. **Short Term**: Migrate the remaining screens to use the centralized API service.
3. **Long Term**: Consider creating a custom axios instance that's pre-configured with these headers.

## Need Help?

If you encounter any issues:
1. Check that the headers are being sent (use console.log or a network inspector)
2. Verify the token is being stored correctly in AsyncStorage
3. Ensure the ngrok URL is still active and correct

## Alternative: Create Axios Instance

If you want a middle ground, you can create a pre-configured axios instance:

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createAxiosInstance = async () => {
  const token = await AsyncStorage.getItem('userToken');
  
  return axios.create({
    baseURL: 'https://unbalkingly-uncharged-elizabet.ngrok-free.dev',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'IconMobile',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

// Usage
const axiosInstance = await createAxiosInstance();
const response = await axiosInstance.get('/employee/me');
```

