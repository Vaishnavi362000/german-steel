import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL
const API_BASE_URL = 'https://unbalkingly-uncharged-elizabet.ngrok-free.dev';

/**
 * Get the default headers for API requests
 * Includes ngrok bypass headers to avoid HTML login page responses
 */
const getDefaultHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Bypass ngrok browser warning page
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'IconMobile',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Create an axios instance with default configuration
 */
const createApiInstance = async () => {
  const headers = await getDefaultHeaders();
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers,
    timeout: 30000, // 30 seconds timeout
  });
};

/**
 * API Service Object
 * Provides methods for making API calls with proper headers
 */
const api = {
  /**
   * Make a GET request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {object} config - Additional axios config
   */
  get: async (endpoint, config = {}) => {
    const instance = await createApiInstance();
    return instance.get(endpoint, config);
  },

  /**
   * Make a POST request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {object} data - Request body
   * @param {object} config - Additional axios config
   */
  post: async (endpoint, data, config = {}) => {
    const instance = await createApiInstance();
    return instance.post(endpoint, data, config);
  },

  /**
   * Make a PUT request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {object} data - Request body
   * @param {object} config - Additional axios config
   */
  put: async (endpoint, data, config = {}) => {
    const instance = await createApiInstance();
    return instance.put(endpoint, data, config);
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {object} config - Additional axios config
   */
  delete: async (endpoint, config = {}) => {
    const instance = await createApiInstance();
    return instance.delete(endpoint, config);
  },

  /**
   * Make a PATCH request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {object} data - Request body
   * @param {object} config - Additional axios config
   */
  patch: async (endpoint, data, config = {}) => {
    const instance = await createApiInstance();
    return instance.patch(endpoint, data, config);
  },

  /**
   * Upload files using FormData
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {FormData} formData - FormData with files
   */
  uploadFile: async (endpoint, formData) => {
    const token = await AsyncStorage.getItem('userToken');
    
    const headers = {
      'Content-Type': 'multipart/form-data',
      // Bypass ngrok browser warning page
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'IconMobile',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const instance = axios.create({
      baseURL: API_BASE_URL,
      headers,
      timeout: 60000, // 60 seconds for file uploads
    });

    return instance.post(endpoint, formData);
  },
};

/**
 * Specific API endpoints
 */
export const apiEndpoints = {
  // Auth
  login: '/user/token',
  logout: '/user/logout',
  
  // Version
  version: '/version/current',
  
  // Employee
  employeeMe: '/employee/me',
  employeeById: (id) => `/employee/get?id=${id}`,
  employeeAll: '/employee/getAll',
  employeeUpdate: (id) => `/employee/edit?empId=${id}`,
  employeeLiveLocation: (id) => `/employee/getLiveLocation?id=${id}`,
  employeeUpdateLiveLocation: (id, lat, lng) => `/employee/updateLiveLocation?id=${id}&latitude=${lat}&longitude=${lng}`,
  
  // Visit
  visitCreate: '/visit/create',
  visitById: (id) => `/visit/getById?id=${id}`,
  visitsByEmployee: (employeeId) => `/visit/getByEmployee?employeeId=${employeeId}`,
  visitsByDateRange: (start, end) => `/visit/getByDateRange?start=${start}&end=${end}`,
  visitsByEmployeeAndDateRange: (employeeId, start, end) => `/visit/getByEmployeeAndDateRange?employeeId=${employeeId}&start=${start}&end=${end}`,
  visitUpdate: (id) => `/visit/edit?id=${id}`,
  visitCheckIn: (id) => `/visit/checkIn?id=${id}`,
  visitCheckOut: (id) => `/visit/checkOut?id=${id}`,
  
  // Store
  storeById: (id) => `/store/getById?id=${id}`,
  storeCreate: '/store/create',
  storeUpdate: (id) => `/store/edit?id=${id}`,
  storesByEmployee: (employeeId) => `/store/getByEmployee?employeeId=${employeeId}`,
  storesFiltered: '/store/filteredValues',
  
  // Notes
  notesCreate: '/notes/create',
  notesById: (id) => `/notes/getById?id=${id}`,
  notesByStore: (storeId) => `/notes/getByStore?id=${storeId}`,
  notesByVisit: (visitId) => `/notes/getByVisit?id=${visitId}`,
  notesUpdate: (id) => `/notes/edit?id=${id}`,
  notesDelete: (id) => `/notes/delete?id=${id}`,
  
  // Tasks (Complaints/Requirements)
  taskCreate: '/task/create',
  taskById: (id) => `/task/getById?id=${id}`,
  tasksByVisit: (type, visitId) => `/task/getByVisit?type=${type}&visitId=${visitId}`,
  tasksByStore: (storeId) => `/task/getByStore?id=${storeId}`,
  taskUpdate: (id) => `/task/edit?id=${id}`,
  
  // Attendance
  attendanceCreate: (employeeId) => `/attendance-log/createAttendanceLog?employeeId=${employeeId}`,
  attendanceByRange: (start, end) => `/attendance-log/getForRange?start=${start}&end=${end}`,
  attendanceByEmployeeAndRange: (employeeId, start, end) => `/attendance-log/getForEmployeeAndRange?employeeId=${employeeId}&start=${start}&end=${end}`,
  
  // Expense
  expenseCreate: '/expense/create',
  expenseById: (id) => `/expense/getById?id=${id}`,
  expensesByDateRange: (start, end) => `/expense/getByDateRange?start=${start}&end=${end}`,
  expenseUpdate: (id) => `/expense/edit?id=${id}`,
  
  // Location data
  states: '/location/states',
  districts: (state) => `/location/districts?state=${state}`,
  cities: (district) => `/location/cities?district=${district}`,

  // File upload
  uploadImage: '/files/upload',
};

export default api;
export { API_BASE_URL, getDefaultHeaders };

