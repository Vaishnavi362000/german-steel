import axios from 'axios';

const API_BASE_URL = 'http://ec2-3-88-111-83.compute-1.amazonaws.com:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
});

const getFullUrl = (config = {}) => {
  const baseUrl = config.baseURL || API_BASE_URL;
  const url = config.url || '';
  return `${baseUrl}${url}`;
};

api.interceptors.request.use((config) => {
  const hasAuth = Boolean(config.headers?.Authorization);
  console.log('[Meeting API Request]', {
    method: String(config.method || 'GET').toUpperCase(),
    url: getFullUrl(config),
    auth: hasAuth ? 'present' : 'missing',
    payload: config.data || null,
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[Meeting API Response]', {
      method: String(response.config?.method || 'GET').toUpperCase(),
      url: getFullUrl(response.config),
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.log('[Meeting API Error]', {
      method: String(error.config?.method || 'GET').toUpperCase(),
      url: getFullUrl(error.config),
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      auth: error.config?.headers?.Authorization ? 'present' : 'missing',
    });
    return Promise.reject(error);
  }
);

export const MEETING_STATUSES = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  EXECUTED: 'EXECUTED',
  EXPENSE_SUBMITTED: 'EXPENSE_SUBMITTED',
  REPORT_SUBMITTED: 'REPORT_SUBMITTED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  CORRECTION_REQUIRED: 'CORRECTION_REQUIRED',
  CANCELLED: 'CANCELLED',
};

const STATUS_LABELS = {
  [MEETING_STATUSES.DRAFT]: 'Draft',
  [MEETING_STATUSES.PENDING_APPROVAL]: 'Pending Approval',
  [MEETING_STATUSES.APPROVED]: 'Approved',
  [MEETING_STATUSES.EXECUTED]: 'Executed',
  [MEETING_STATUSES.EXPENSE_SUBMITTED]: 'Expense Submitted',
  [MEETING_STATUSES.REPORT_SUBMITTED]: 'Report Submitted',
  [MEETING_STATUSES.CLOSED]: 'Closed',
  [MEETING_STATUSES.REJECTED]: 'Rejected',
  [MEETING_STATUSES.CORRECTION_REQUIRED]: 'Correction Required',
  [MEETING_STATUSES.CANCELLED]: 'Cancelled',
};

const compactObject = (value) => Object.entries(value).reduce((result, [key, item]) => {
  if (item !== undefined && item !== null && item !== '') {
    result[key] = item;
  }
  return result;
}, {});

const requestConfig = (authToken) => ({
  headers: {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

const buildQuery = (params) => {
  const query = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return query ? `?${query}` : '';
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

const normalizeTimeForApi = (time) => {
  if (!time) return undefined;
  const value = String(time).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
};

const normalizeTimeForUi = (time) => {
  if (!time) return '';
  const value = String(time);
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
};

const toTitleCase = (value) => {
  if (!value) return '';
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const uniqueOptions = (values = []) => {
  const seen = new Set();
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const deriveAttendeeCategoryOptions = (attendees = []) => uniqueOptions(
  attendees.map((attendee) => toTitleCase(attendee?.category))
);

export const normalizeMeetingStatus = (status) => {
  if (!status) return MEETING_STATUSES.DRAFT;

  const rawStatus = String(status).trim();
  const normalizedStatus = rawStatus.replace(/[\s-]+/g, '_').toUpperCase();

  if (Object.values(MEETING_STATUSES).includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return rawStatus;
};

export const getStatusLabel = (status) => STATUS_LABELS[normalizeMeetingStatus(status)] || status || 'Draft';

const mapRequestToBackend = (request = {}, creatorId) => compactObject({
  meetingType: request.meetingType,
  creatorId: normalizeNumber(creatorId),
  meetingDate: request.meetingDate,
  meetingTime: normalizeTimeForApi(request.meetingTime),
  city: request.city,
  state: request.state,
  location: request.location,
  customerReference: request.customerReference || request.referenceName,
  expectedAttendees: normalizeNumber(request.expectedAttendees || request.expectedAttendeeCount),
  objective: request.objective || request.purpose,
  expectedBudget: normalizeNumber(request.expectedBudget),
  expectedGiftsMaterials: request.expectedGiftsMaterials || request.expectedMaterials,
  allowWalkInAttendees: request.allowWalkInAttendees === undefined ? true : request.allowWalkInAttendees,
  remarks: request.remarks,
});

const mapAttendeeToBackend = (attendee = {}) => compactObject({
  name: attendee.name,
  mobileNumber: attendee.mobileNumber || attendee.mobile,
  email: attendee.email,
  category: String(attendee.category || '').toLowerCase(),
  cityArea: attendee.cityArea,
  companyShopProject: attendee.companyShopProject || attendee.company,
  expected: attendee.expected === undefined ? true : attendee.expected,
  attendanceSource: attendee.attendanceSource,
  categoryDetails: attendee.categoryDetails,
  remarks: attendee.remarks,
});

const normalizeAttendee = (attendee = {}, index = 0) => {
  const mobile = attendee.mobile || attendee.mobileNumber || '';
  const company = attendee.company || attendee.companyShopProject || '';

  return {
    ...attendee,
    id: attendee.id || attendee.meetingAttendeeId || `attendee-${index}`,
    meetingAttendeeId: attendee.meetingAttendeeId || attendee.id,
    attendeeId: attendee.attendeeId,
    name: attendee.name || '',
    mobile,
    mobileNumber: mobile,
    email: attendee.email || '',
    category: toTitleCase(attendee.category) || 'Mason',
    cityArea: attendee.cityArea || '',
    company,
    companyShopProject: company,
    expected: attendee.expected === undefined ? true : attendee.expected,
    present: Boolean(attendee.present),
    attendanceSource: attendee.attendanceSource,
    categoryDetails: attendee.categoryDetails || '',
    remarks: attendee.remarks || '',
  };
};

export const normalizeMeeting = (meeting = {}) => {
  const status = normalizeMeetingStatus(meeting.status || meeting.meetingStatus);
  const requestSource = meeting.request || meeting;
  const attendeeSource = Array.isArray(meeting.attendees)
    ? meeting.attendees
    : Array.isArray(meeting.expectedAttendees)
      ? meeting.expectedAttendees
      : [];
  const attendees = attendeeSource.map(normalizeAttendee);
  const expectedAttendees = attendees.filter((attendee) => attendee.expected !== false);
  const expectedAttendeeCount = typeof meeting.expectedAttendees === 'number'
    ? meeting.expectedAttendees
    : requestSource.expectedAttendeeCount || expectedAttendees.length;
  const gifts = Array.isArray(meeting.gifts) ? meeting.gifts : [];
  const expenses = Array.isArray(meeting.expenses) ? meeting.expenses : [];
  const actualAttendeeCount = meeting.actualAttendeeCount === undefined || meeting.actualAttendeeCount === null
    ? attendees.filter((attendee) => attendee.present).length
    : meeting.actualAttendeeCount;

  return {
    ...meeting,
    id: meeting.id || meeting.meetingId,
    meetingId: meeting.meetingId || meeting.id,
    status,
    statusLabel: getStatusLabel(status),
    actualMeetingDate: meeting.actualMeetingDate || '',
    actualMeetingTime: normalizeTimeForUi(meeting.actualMeetingTime),
    actualLocation: meeting.actualLocation || '',
    actualAttendeeCount,
    meetingSummary: meeting.meetingSummary || '',
    keyDiscussionPoints: meeting.keyDiscussionPoints || '',
    leadsGenerated: meeting.leadsGenerated || '',
    interestedCustomers: meeting.interestedCustomers || '',
    competitorInformation: meeting.competitorInformation || '',
    finalRemarks: meeting.finalRemarks || '',
    finalReportApprovalRemarks: meeting.finalReportApprovalRemarks || '',
    finalReportApproved: Boolean(meeting.finalReportApproved || meeting.finalReportApprovedById || meeting.finalReportApprovedByName),
    request: {
      meetingType: requestSource.meetingType || '',
      meetingDate: requestSource.meetingDate || '',
      meetingTime: normalizeTimeForUi(requestSource.meetingTime),
      city: requestSource.city || '',
      state: requestSource.state || '',
      location: requestSource.location || '',
      referenceName: requestSource.referenceName || requestSource.customerReference || '',
      customerReference: requestSource.customerReference || requestSource.referenceName || '',
      purpose: requestSource.purpose || requestSource.objective || '',
      objective: requestSource.objective || requestSource.purpose || '',
      expectedBudget: requestSource.expectedBudget || 0,
      expectedAttendeeCount,
      expectedMaterials: requestSource.expectedMaterials || requestSource.expectedGiftsMaterials || '',
      expectedGiftsMaterials: requestSource.expectedGiftsMaterials || requestSource.expectedMaterials || '',
      allowWalkInAttendees: requestSource.allowWalkInAttendees === undefined ? true : requestSource.allowWalkInAttendees,
      remarks: requestSource.remarks || '',
    },
    attendees,
    expectedAttendees,
    gifts,
    expenses,
    approvalHistory: meeting.approvalHistory || meeting.approvals || [],
    tabs: meeting.tabs || {},
    allowedActions: meeting.allowedActions || [],
  };
};

export const getMeetingId = (responseData) => {
  if (typeof responseData === 'number' || typeof responseData === 'string') {
    return responseData;
  }

  return responseData?.meetingId
    || responseData?.id
    || responseData?.data?.meetingId
    || responseData?.data?.id
    || responseData?.data;
};

export const listMeetings = async ({ authToken, start, end, status, meetingType, city, state }) => {
  const response = await api.get(
    `/meeting/getAll${buildQuery({ start, end, status, meetingType, city, state })}`,
    requestConfig(authToken)
  );

  return Array.isArray(response.data) ? response.data.map(normalizeMeeting) : [];
};

export const loginMeetingUser = async ({ username, password }) => {
  const response = await api.post('/user/token', { username, password });
  return response.data;
};

export const getMeetingById = async ({ authToken, meetingId }) => {
  const response = await api.get(`/meeting/getById${buildQuery({ id: meetingId })}`, requestConfig(authToken));
  return normalizeMeeting(response.data);
};

export const getApprovalQueue = async ({ authToken }) => {
  const response = await api.get('/meeting/approvalQueue', requestConfig(authToken));
  return Array.isArray(response.data) ? response.data.map(normalizeMeeting) : [];
};

export const getAttendeeMaster = async ({ authToken }) => {
  const response = await api.get('/meeting/attendees/getAll', requestConfig(authToken));
  return Array.isArray(response.data) ? response.data.map(normalizeAttendee) : [];
};

export const getAttendeeCategoryOptions = async ({ authToken }) => {
  const attendees = await getAttendeeMaster({ authToken });
  return deriveAttendeeCategoryOptions(attendees);
};

export const saveExpectedAttendees = async ({ authToken, meetingId, attendees }) => {
  const payload = (attendees || []).map(mapAttendeeToBackend);
  const response = await api.put(
    `/meeting/attendees${buildQuery({ id: meetingId })}`,
    payload,
    requestConfig(authToken)
  );
  return response.data;
};

export const createMeetingDraft = async ({ authToken, payload }) => {
  const requestPayload = mapRequestToBackend(
    payload?.request,
    payload?.creatorId || payload?.creatorEmployeeId
  );
  const createResponse = await api.post('/meeting/create', requestPayload, requestConfig(authToken));
  const meetingId = getMeetingId(createResponse.data);

  if (meetingId && payload?.expectedAttendees?.length) {
    try {
      await saveExpectedAttendees({ authToken, meetingId, attendees: payload.expectedAttendees });
    } catch (error) {
      error.meetingId = meetingId;
      error.failedStep = 'ATTENDEES';
      throw error;
    }
  }

  return { meetingId, data: createResponse.data };
};

export const editMeeting = async ({ authToken, meetingId, payload }) => {
  const requestPayload = mapRequestToBackend(payload?.request);
  let editResponse = null;

  if (Object.keys(requestPayload).length > 0) {
    editResponse = await api.put(
      `/meeting/editRequest${buildQuery({ id: meetingId })}`,
      requestPayload,
      requestConfig(authToken)
    );
  }

  if (payload?.expectedAttendees) {
    await saveExpectedAttendees({ authToken, meetingId, attendees: payload.expectedAttendees });
  }

  return editResponse?.data;
};

export const submitMeeting = async ({ authToken, meetingId }) => {
  const response = await api.put(`/meeting/submit${buildQuery({ id: meetingId })}`, null, requestConfig(authToken));
  return response.data;
};

export const approveMeeting = async ({ authToken, meetingId, remarks }) => {
  const response = await api.put(
    `/meeting/approve${buildQuery({ id: meetingId })}`,
    { approvalRemarks: remarks },
    requestConfig(authToken)
  );
  return response.data;
};

export const rejectMeeting = async ({ authToken, meetingId, remarks }) => {
  const response = await api.put(
    `/meeting/reject${buildQuery({ id: meetingId })}`,
    { approvalRemarks: remarks },
    requestConfig(authToken)
  );
  return response.data;
};

export const requestMeetingCorrection = async ({ authToken, meetingId, remarks }) => {
  const response = await api.put(
    `/meeting/requestCorrection${buildQuery({ id: meetingId })}`,
    { approvalRemarks: remarks },
    requestConfig(authToken)
  );
  return response.data;
};

export const cancelMeeting = async ({ authToken, meetingId, remarks }) => {
  const response = await api.put(
    `/meeting/cancel${buildQuery({ id: meetingId })}`,
    { remarks },
    requestConfig(authToken)
  );
  return response.data;
};

export const startMeetingExecution = async ({ authToken, meetingId, payload }) => {
  const response = await api.put(
    `/meeting/execute${buildQuery({ id: meetingId })}`,
    {
      ...payload,
      actualMeetingTime: normalizeTimeForApi(payload?.actualMeetingTime),
    },
    requestConfig(authToken)
  );
  return response.data;
};

export const markMeetingAttendance = async ({ authToken, meetingId, attendees }) => {
  const response = await api.put(
    `/meeting/attendance${buildQuery({ id: meetingId })}`,
    attendees,
    requestConfig(authToken)
  );
  return response.data;
};

export const addWalkInAttendee = async ({ authToken, meetingId, attendee }) => {
  const response = await api.post(
    `/meeting/attendance/scan${buildQuery({ id: meetingId })}`,
    mapAttendeeToBackend({ ...attendee, expected: false }),
    requestConfig(authToken)
  );
  return normalizeAttendee(response.data);
};

export const saveMeetingGifts = async ({ authToken, meetingId, gifts }) => {
  const response = await api.put(
    `/meeting/gifts${buildQuery({ id: meetingId })}`,
    { gifts },
    requestConfig(authToken)
  );
  return response.data;
};

export const submitMeetingExpenses = async ({ authToken, meetingId, payload }) => {
  const response = await api.put(
    `/meeting/expenses${buildQuery({ id: meetingId })}`,
    payload,
    requestConfig(authToken)
  );
  return response.data;
};

export const submitMeetingReport = async ({ authToken, meetingId, payload }) => {
  const response = await api.put(
    `/meeting/finalReport${buildQuery({ id: meetingId })}`,
    payload,
    requestConfig(authToken)
  );
  return response.data;
};

export const getStatusColor = (status) => {
  switch (normalizeMeetingStatus(status)) {
    case MEETING_STATUSES.DRAFT:
      return '#64748B';
    case MEETING_STATUSES.PENDING_APPROVAL:
      return '#F59E0B';
    case MEETING_STATUSES.APPROVED:
      return '#2563EB';
    case MEETING_STATUSES.EXECUTED:
      return '#7C3AED';
    case MEETING_STATUSES.EXPENSE_SUBMITTED:
      return '#0891B2';
    case MEETING_STATUSES.REPORT_SUBMITTED:
      return '#4F46E5';
    case MEETING_STATUSES.CLOSED:
      return '#10B981';
    case MEETING_STATUSES.REJECTED:
    case MEETING_STATUSES.CANCELLED:
      return '#DC2626';
    case MEETING_STATUSES.CORRECTION_REQUIRED:
      return '#EA580C';
    default:
      return '#6B7280';
  }
};

export const isTabUnlocked = (tabKey, status) => {
  const rank = {
    [MEETING_STATUSES.DRAFT]: 0,
    [MEETING_STATUSES.CORRECTION_REQUIRED]: 1,
    [MEETING_STATUSES.PENDING_APPROVAL]: 1,
    [MEETING_STATUSES.REJECTED]: 1,
    [MEETING_STATUSES.CANCELLED]: 1,
    [MEETING_STATUSES.APPROVED]: 2,
    [MEETING_STATUSES.EXECUTED]: 3,
    [MEETING_STATUSES.EXPENSE_SUBMITTED]: 4,
    [MEETING_STATUSES.REPORT_SUBMITTED]: 5,
    [MEETING_STATUSES.CLOSED]: 6,
  };

  const requiredRank = {
    request: 0,
    attendees: 0,
    approval: 0,
    status: 0,
    execution: 2,
    gifts: 3,
    expenses: 3,
    report: 4,
    finalReport: 4,
  };

  return (rank[normalizeMeetingStatus(status)] ?? 0) >= requiredRank[tabKey];
};
