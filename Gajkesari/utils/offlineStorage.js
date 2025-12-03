import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_CUSTOMERS_KEY = 'pending_customers';

export const storePendingCustomer = async (customerData) => {
  try {
    const existingPendingCustomers = await getPendingCustomers();
    
    // Check if a customer with the same phone number already exists in pending storage
    const isDuplicate = existingPendingCustomers.some(
      customer => customer.primaryContact === customerData.primaryContact
    );

    if (isDuplicate) {
      console.log('Customer with this phone number already exists in pending storage');
      return false;
    }

    const updatedPendingCustomers = [...existingPendingCustomers, {
      ...customerData,
      id: Date.now().toString(), // Temporary ID for local tracking
      createdAt: new Date().toISOString(),
    }];
    await AsyncStorage.setItem(PENDING_CUSTOMERS_KEY, JSON.stringify(updatedPendingCustomers));
    return true;
  } catch (error) {
    console.error('Error storing pending customer:', error);
    return false;
  }
};

export const getPendingCustomers = async () => {
  try {
    const pendingCustomers = await AsyncStorage.getItem(PENDING_CUSTOMERS_KEY);
    return pendingCustomers ? JSON.parse(pendingCustomers) : [];
  } catch (error) {
    console.error('Error getting pending customers:', error);
    return [];
  }
};

export const removePendingCustomer = async (customerId) => {
  try {
    const existingPendingCustomers = await getPendingCustomers();
    const updatedPendingCustomers = existingPendingCustomers.filter(
      customer => customer.id !== customerId
    );
    await AsyncStorage.setItem(PENDING_CUSTOMERS_KEY, JSON.stringify(updatedPendingCustomers));
    return true;
  } catch (error) {
    console.error('Error removing pending customer:', error);
    return false;
  }
}; 