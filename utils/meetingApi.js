import axios from 'axios';

const API_BASE_URL = 'http://ec2-3-88-111-83.compute-1.amazonaws.com:8081';
const CUSTOMER_API_BASE_URL = 'https://api.gajkesaristeels.in';
const CREATE_MEETING_ENDPOINT = '/meeting/create';

export const DEFAULT_MEETING_TYPES = [
  'Counter',
  'Dealer',
  'Mason',
  'Contractor',
  'Engineer',
  'Architect',
];

export const DEFAULT_GIFT_ITEMS = ['Diary', 'Pen', 'Cap', 'T-shirt', 'Brochure', 'Sample Kit'];

export const DEFAULT_EXPENSE_HEADS = ['venue', 'food/snacks', 'travel', 'printing/material', 'gifts', 'other'];

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
  [MEETING_STATUSES.PENDING_APPROVAL]: 'Submitted for Approval',
  [MEETING_STATUSES.APPROVED]: 'Approved',
  [MEETING_STATUSES.EXECUTED]: 'Meeting Conducted',
  [MEETING_STATUSES.EXPENSE_SUBMITTED]: 'Expense Submitted',
  [MEETING_STATUSES.REPORT_SUBMITTED]: 'Submitted for Final Review',
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

const isEndpointUnavailable = (error) => [404, 405, 501].includes(error?.response?.status);

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

const normalizeFlagState = (value) => String(value || '').trim().replace(/[\s-]+/g, '_').toUpperCase();

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
  storeId: normalizeNumber(request.storeId),
  meetingDate: request.meetingDate,
  meetingTime: normalizeTimeForApi(request.meetingTime),
  city: request.city,
  state: request.state,
  location: request.location,
  customerReference: request.customerReference || request.referenceName,
  expectedAttendees: normalizeNumber(request.expectedTurnout || request.expectedAttendees || request.expectedAttendeeCount),
  objective: request.objective || request.purpose,
  expectedBusinessImpact: request.expectedBusinessImpact,
  expectedBudget: normalizeNumber(request.expectedBudget),
  expectedGiftsMaterials: request.expectedGiftsMaterials || request.expectedMaterials,
  allowWalkInAttendees: request.allowWalkInAttendees === undefined ? true : request.allowWalkInAttendees,
  remarks: request.remarks,
});

const jsonDetails = (items) => (Array.isArray(items) && items.length > 0 ? JSON.stringify(items) : undefined);

const parseJsonDetails = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const isJsonDetails = (value) => parseJsonDetails(value).length > 0
  || (typeof value === 'string' && value.trim().startsWith('['));

const buildPlanPayload = (payload = {}) => {
  const request = payload.request || {};
  const plannedExpenses = payload.plannedExpenses || [];
  const plannedGifts = payload.plannedGifts || [];

  return compactObject({
    expectedBudget: normalizeNumber(request.expectedBudget),
    plannedExpenseDetails: jsonDetails(plannedExpenses),
    expectedGiftsMaterials: jsonDetails(plannedGifts) || request.expectedGiftsMaterials || request.expectedMaterials,
    plannedGiftDetails: jsonDetails(plannedGifts),
    companyContribution: normalizeNumber(request.companyContribution),
    dealerContribution: normalizeNumber(request.dealerContribution),
    budgetRemarks: request.budgetRemarks,
  });
};

const buildCombinedDraftPayload = (payload = {}) => {
  const plan = buildPlanPayload(payload);
  return compactObject({
    ...mapRequestToBackend(payload.request, payload.creatorId || payload.creatorEmployeeId),
    plan: Object.keys(plan).length > 0 ? plan : undefined,
    attendees: (payload.expectedAttendees || []).map(mapAttendeeToBackend),
  });
};

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
    present: Boolean(attendee.present || attendee.attended || attendee.actualAttendance),
    attended: Boolean(attendee.attended || attendee.present || attendee.actualAttendance),
    attendanceSource: attendee.attendanceSource,
    categoryDetails: attendee.categoryDetails || '',
    remarks: attendee.remarks || '',
  };
};

export const normalizeMeeting = (meeting = {}) => {
  const status = normalizeMeetingStatus(meeting.status || meeting.meetingStatus);
  const requestSource = meeting.request || meeting;
  const planSource = meeting.plan || meeting.meetingPlan || meeting;
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
  const expectedTurnout = meeting.expectedTurnout
    || requestSource.expectedTurnout
    || expectedAttendeeCount;
  const gifts = Array.isArray(meeting.gifts) ? meeting.gifts : [];
  const expenses = Array.isArray(meeting.expenses) ? meeting.expenses : [];
  const plannedGifts = parseJsonDetails(
    planSource.plannedGiftDetails
    || requestSource.plannedGiftDetails
    || (isJsonDetails(planSource.expectedGiftsMaterials) ? planSource.expectedGiftsMaterials : '')
    || (isJsonDetails(requestSource.expectedGiftsMaterials) ? requestSource.expectedGiftsMaterials : '')
  );
  const plannedExpenses = parseJsonDetails(planSource.plannedExpenseDetails || requestSource.plannedExpenseDetails);
  const expectedMaterialsText = [
    requestSource.expectedMaterials,
    requestSource.expectedGiftsMaterials,
    planSource.expectedGiftsMaterials,
  ].find((value) => value && !isJsonDetails(value)) || '';
  const actualAttendeeCount = meeting.actualAttendeeCount === undefined || meeting.actualAttendeeCount === null
    ? attendees.filter((attendee) => attendee.present).length
    : meeting.actualAttendeeCount;

  return {
    ...meeting,
    id: meeting.id || meeting.meetingId,
    meetingId: meeting.meetingId || meeting.id,
    status,
    statusLabel: meeting.statusLabel || getStatusLabel(status),
    stageLabel: meeting.stageLabel || '',
    actualMeetingDate: meeting.actualMeetingDate || '',
    actualMeetingTime: normalizeTimeForUi(meeting.actualMeetingTime),
    actualLocation: meeting.actualLocation || '',
    actualAttendeeCount,
    meetingSummary: meeting.meetingSummary || '',
    keyDiscussionPoints: meeting.keyDiscussionPoints || '',
    leadsGenerated: meeting.leadsGenerated || '',
    leadCount: meeting.leadCount || '',
    leadDetails: meeting.leadDetails || '',
    interestedCustomers: meeting.interestedCustomers || '',
    competitorInformation: meeting.competitorInformation || '',
    actualBusinessOutcome: meeting.actualBusinessOutcome || '',
    finalRemarks: meeting.finalRemarks || '',
    correctionStage: meeting.correctionStage || '',
    correctionRemarks: meeting.correctionRemarks || meeting.approvalRemarks || '',
    correctionRequestedBy: meeting.correctionRequestedBy || meeting.correctionRequestedByName || '',
    correctionRequestedAt: meeting.correctionRequestedAt || '',
    returnStatus: meeting.returnStatus || '',
    rejectedBy: meeting.rejectedBy || meeting.rejectedByName || '',
    rejectedAt: meeting.rejectedAt || '',
    rejectionReason: meeting.rejectionReason || meeting.approvalRemarks || '',
    cancellationReason: meeting.cancellationReason || meeting.cancellationRemarks || '',
    cancellationRequested: Boolean(meeting.cancellationRequested),
    rescheduleRequested: Boolean(meeting.rescheduleRequested),
    meetingNotHeldReason: meeting.meetingNotHeldReason || '',
    attendanceFinalized: Boolean(meeting.attendanceFinalized || meeting.attendanceFinalised),
    giftsCompleted: ['giftsCompleted', 'giftCompleted', 'noGifts', 'giftCompletionState']
      .some((key) => meeting[key] !== undefined && meeting[key] !== null && meeting[key] !== '')
      ? Boolean(
        meeting.giftsCompleted
        || meeting.giftCompleted
        || meeting.noGifts
        || ['COMPLETED', 'NO_GIFTS'].includes(normalizeFlagState(meeting.giftCompletionState))
      )
      : undefined,
    noGifts: meeting.noGifts === undefined && meeting.giftCompletionState === undefined
      ? undefined
      : Boolean(meeting.noGifts || normalizeFlagState(meeting.giftCompletionState) === 'NO_GIFTS'),
    giftCompletionState: meeting.giftCompletionState || '',
    expensesCompleted: ['expensesCompleted', 'expenseCompleted', 'noExpenses', 'expenseCompletionState']
      .some((key) => meeting[key] !== undefined && meeting[key] !== null && meeting[key] !== '')
      ? Boolean(
        meeting.expensesCompleted
        || meeting.expenseCompleted
        || meeting.noExpenses
        || ['COMPLETED', 'NO_EXPENSES'].includes(normalizeFlagState(meeting.expenseCompletionState))
      )
      : undefined,
    noExpenses: meeting.noExpenses === undefined && meeting.expenseCompletionState === undefined
      ? undefined
      : Boolean(meeting.noExpenses || normalizeFlagState(meeting.expenseCompletionState) === 'NO_EXPENSES'),
    expenseCompletionState: meeting.expenseCompletionState || '',
    finalReportApprovalRemarks: meeting.finalReportApprovalRemarks || '',
    finalReportApproved: Boolean(meeting.finalReportApproved || meeting.finalReportApprovedById || meeting.finalReportApprovedByName),
    request: {
      meetingType: requestSource.meetingType || '',
      meetingDate: requestSource.meetingDate || '',
      meetingTime: normalizeTimeForUi(requestSource.meetingTime),
      city: requestSource.city || '',
      state: requestSource.state || '',
      location: requestSource.location || '',
      storeId: requestSource.storeId || meeting.storeId || '',
      storeName: requestSource.storeName || meeting.storeName || meeting.dealerName || '',
      referenceName: requestSource.referenceName || requestSource.customerReference || '',
      customerReference: requestSource.customerReference || requestSource.referenceName || '',
      purpose: requestSource.purpose || requestSource.objective || '',
      objective: requestSource.objective || requestSource.purpose || '',
      expectedBudget: requestSource.expectedBudget || 0,
      expectedAttendeeCount,
      expectedTurnout,
      expectedBusinessImpact: requestSource.expectedBusinessImpact || meeting.expectedBusinessImpact || '',
      expectedMaterials: expectedMaterialsText,
      expectedGiftsMaterials: expectedMaterialsText,
      companyContribution: planSource.companyContribution ?? requestSource.companyContribution ?? '',
      dealerContribution: planSource.dealerContribution ?? requestSource.dealerContribution ?? '',
      budgetRemarks: planSource.budgetRemarks || requestSource.budgetRemarks || '',
      allowWalkInAttendees: requestSource.allowWalkInAttendees === undefined ? true : requestSource.allowWalkInAttendees,
      remarks: requestSource.remarks || '',
    },
    attendees,
    expectedAttendees,
    plannedGifts,
    plannedExpenses,
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

export const getMeetingTypes = async ({ authToken }) => {
  try {
    const response = await api.get('/meeting/config/types', requestConfig(authToken));
    const values = Array.isArray(response.data)
      ? response.data
        .filter((type) => type?.active !== false)
        .map((type) => String(type?.name || type || '').trim())
      : [];
    return uniqueOptions(values.length > 0 ? values : DEFAULT_MEETING_TYPES);
  } catch (error) {
    console.warn('Unable to fetch meeting types, using defaults:', error.message);
    return DEFAULT_MEETING_TYPES;
  }
};

const normalizeConfigOptions = (data) => (Array.isArray(data)
  ? uniqueOptions(
    data
      .filter((item) => item?.active !== false)
      .map((item) => String(item?.name || item?.giftItem || item?.expenseHead || item || '').trim())
  )
  : []);

export const getGiftItems = async ({ authToken }) => {
  try {
    const response = await api.get('/meeting/config/giftItems', requestConfig(authToken));
    const values = normalizeConfigOptions(response.data);
    return values.length > 0 ? values : DEFAULT_GIFT_ITEMS;
  } catch (error) {
    console.warn('Unable to fetch gift items, using defaults:', error.message);
    return DEFAULT_GIFT_ITEMS;
  }
};

export const getExpenseHeads = async ({ authToken }) => {
  try {
    const response = await api.get('/meeting/config/expenseHeads', requestConfig(authToken));
    const values = normalizeConfigOptions(response.data);
    return values.length > 0 ? values : DEFAULT_EXPENSE_HEADS;
  } catch (error) {
    console.warn('Unable to fetch expense heads, using defaults:', error.message);
    return DEFAULT_EXPENSE_HEADS;
  }
};

export const getDealerShops = async ({ authToken, employeeId, search = '', page = 0, size = 20 }) => {
  if (!employeeId) return [];

  const query = buildQuery({
    id: employeeId,
    page,
    size,
    sortBy: 'storeName',
    sortOrder: 'asc',
    storeName: search,
  });
  const url = `${CUSTOMER_API_BASE_URL}/store/getByEmployeeWithSort${query}`;

  console.log('[Dealer Shop API Request]', {
    method: 'GET',
    url,
    auth: authToken ? 'present' : 'missing',
    payload: null,
  });

  const response = await axios.get(url, requestConfig(authToken));
  console.log('[Dealer Shop API Response]', {
    method: 'GET',
    url,
    status: response.status,
    data: response.data,
  });

  const stores = Array.isArray(response.data?.content) ? response.data.content : Array.isArray(response.data) ? response.data : [];
  return stores.map((store) => ({
    ...store,
    storeId: store.storeId || store.id,
    storeName: store.storeName || store.name || [store.clientFirstName, store.clientLastName].filter(Boolean).join(' '),
    ownerName: [store.clientFirstName, store.clientLastName].filter(Boolean).join(' '),
    mobile: store.primaryContact || store.mobileNumber || store.mobile || '',
    city: store.city || store.storeCity || '',
    area: store.area || store.cityArea || store.address || '',
  }));
};

export const getAttendeeCategoryOptions = async ({ authToken }) => {
  const attendees = await getAttendeeMaster({ authToken });
  return deriveAttendeeCategoryOptions(attendees);
};

export const saveExpectedAttendees = async ({ authToken, meetingId, attendees }) => {
  const payload = (attendees || []).map(mapAttendeeToBackend);
  let response;
  try {
    response = await api.put(
      `/meeting/attendees/replace${buildQuery({ id: meetingId })}`,
      payload,
      requestConfig(authToken)
    );
  } catch (error) {
    if (!isEndpointUnavailable(error)) throw error;
    response = await api.put(
      `/meeting/attendees${buildQuery({ id: meetingId })}`,
      payload,
      requestConfig(authToken)
    );
  }
  return response.data;
};

export const deleteExpectedAttendee = async ({ authToken, meetingId, meetingAttendeeId }) => {
  const response = await api.delete(
    `/meeting/attendees/delete${buildQuery({ id: meetingId, meetingAttendeeId })}`,
    requestConfig(authToken)
  );
  return response.data;
};

export const createMeetingDraft = async ({ authToken, payload }) => {
  const combinedPayload = buildCombinedDraftPayload(payload);
  const createResponse = await api.post(CREATE_MEETING_ENDPOINT, combinedPayload, requestConfig(authToken));
  const meetingId = getMeetingId(createResponse.data);
  return { meetingId, data: createResponse.data };
};

export const editMeeting = async ({ authToken, meetingId, payload }) => {
  const requestPayload = mapRequestToBackend(payload?.request);
  const planPayload = buildPlanPayload(payload);
  const editPayload = compactObject({
    ...requestPayload,
    plan: Object.keys(planPayload).length > 0 ? planPayload : undefined,
  });
  let editResponse = null;

  if (Object.keys(editPayload).length > 0) {
    editResponse = await api.put(
      `/meeting/editRequest${buildQuery({ id: meetingId })}`,
      editPayload,
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

export const resubmitMeetingCorrection = async ({ authToken, meetingId }) => {
  const response = await api.put(`/meeting/resubmitCorrection${buildQuery({ id: meetingId })}`, null, requestConfig(authToken));
  return response.data;
};

export const resubmitFinalReportCorrection = async ({ authToken, meetingId, payload }) => {
  const response = await api.put(
    `/meeting/finalReport${buildQuery({ id: meetingId })}`,
    payload,
    requestConfig(authToken)
  );
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

export const requestMeetingCorrection = async ({ authToken, meetingId, remarks, correctionStage = 'REQUEST' }) => {
  const response = await api.put(
    `/meeting/requestCorrection${buildQuery({ id: meetingId })}`,
    {
      correctionStage,
      correctionRemarks: remarks,
      approvalRemarks: remarks,
    },
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

export const finaliseMeetingAttendance = async ({ authToken, meetingId, payload }) => {
  const response = await api.put(
    `/meeting/attendance/finalise${buildQuery({ id: meetingId })}`,
    {
      ...payload,
      actualMeetingTime: normalizeTimeForApi(payload?.actualMeetingTime),
      attendees: payload?.attendees || [],
    },
    requestConfig(authToken)
  );
  return response.data;
};

export const saveMeetingGifts = async ({ authToken, meetingId, gifts }) => {
  const response = await api.put(
    `/meeting/gifts${buildQuery({ id: meetingId })}`,
    { gifts },
    requestConfig(authToken)
  );
  return response.data;
};

export const markNoGifts = async ({ authToken, meetingId, remarks }) => {
  const response = await api.put(
    `/meeting/gifts/noGifts${buildQuery({ id: meetingId })}`,
    { remarks },
    requestConfig(authToken)
  );
  return response.data;
};

export const deleteMeetingGift = async ({ authToken, meetingId, giftId }) => {
  const response = await api.delete(
    `/meeting/gifts/delete${buildQuery({ id: meetingId, giftId })}`,
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

export const markNoExpenses = async ({ authToken, meetingId, remarks }) => {
  const response = await api.put(
    `/meeting/expenses/noExpenses${buildQuery({ id: meetingId })}`,
    { remarks },
    requestConfig(authToken)
  );
  return response.data;
};

export const deleteMeetingExpense = async ({ authToken, meetingId, expenseId }) => {
  const response = await api.delete(
    `/meeting/expenses/delete${buildQuery({ id: meetingId, expenseId })}`,
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
