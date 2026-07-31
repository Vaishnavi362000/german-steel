import * as XLSX from 'xlsx';

export const ATTENDEE_IMPORT_REQUIRED_HEADERS = [
  'Name',
  'Mobile Number',
];

export const ATTENDEE_IMPORT_OPTIONAL_HEADERS = [
  'Category',
  'City / Area',
  'Company / Shop / Project',
  'Email',
  'Expected',
  'Category Details',
  'Remarks',
];

export const ATTENDEE_IMPORT_HEADERS = [
  ...ATTENDEE_IMPORT_REQUIRED_HEADERS,
  ...ATTENDEE_IMPORT_OPTIONAL_HEADERS,
];

const HEADER_KEYS = {
  name: 'Name',
  mobile: 'Mobile Number',
  category: 'Category',
  cityArea: 'City / Area',
  company: 'Company / Shop / Project',
  email: 'Email',
  expected: 'Expected',
  categoryDetails: 'Category Details',
  remarks: 'Remarks',
};

const HEADER_ALIASES = {
  name: 'name',
  'attendee name': 'name',
  fullname: 'name',
  'full name': 'name',
  mobile: 'mobile',
  mobilenumber: 'mobile',
  'mobile number': 'mobile',
  'mobile no': 'mobile',
  'mobile no.': 'mobile',
  phone: 'mobile',
  phonenumber: 'mobile',
  'phone number': 'mobile',
  contact: 'mobile',
  contactnumber: 'mobile',
  'contact number': 'mobile',
  category: 'category',
  'attendee category': 'category',
  type: 'category',
  cityarea: 'cityArea',
  'city area': 'cityArea',
  area: 'cityArea',
  locality: 'cityArea',
  city: 'cityArea',
  company: 'company',
  companyshopproject: 'company',
  'company shop project': 'company',
  'company shop': 'company',
  'shop project': 'company',
  shop: 'company',
  project: 'company',
  companyshopprojectname: 'company',
  email: 'email',
  emailid: 'email',
  'email id': 'email',
  expected: 'expected',
  'is expected': 'expected',
  categorydetails: 'categoryDetails',
  'category details': 'categoryDetails',
  'category notes': 'categoryDetails',
  remarks: 'remarks',
  notes: 'remarks',
};

const normalizeHeader = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const toText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeMobile = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  const text = toText(value);
  const decimalTextMatch = text.match(/^(\d{10})\.0+$/);
  if (decimalTextMatch) return decimalTextMatch[1];

  return text.replace(/\D/g, '');
};

const parseExpected = (value) => {
  const normalized = toText(value).toLowerCase();
  if (!normalized) return { value: true, valid: true };
  if (['true', 'yes', 'y', '1'].includes(normalized)) return { value: true, valid: true };
  if (['false', 'no', 'n', '0'].includes(normalized)) return { value: false, valid: true };
  return { value: true, valid: false };
};

const addError = (errors, row, column, message) => {
  errors.push({ row, column, message });
};

const buildHeaderMap = (headerRow) => headerRow.reduce((result, value, index) => {
  const normalized = normalizeHeader(value);
  const key = HEADER_ALIASES[normalized] || HEADER_ALIASES[normalized.replace(/\s/g, '')];
  if (key && result[key] === undefined) {
    return { ...result, [key]: index };
  }
  return result;
}, {});

const rowHasAnyValue = (row) => Array.isArray(row) && row.some((value) => !isBlank(value));

const readCell = (row, headerMap, key) => {
  const index = headerMap[key];
  return index === undefined ? '' : row[index];
};

export const formatAttendeeImportErrors = (errors = [], limit = 8) => {
  const visible = errors.slice(0, limit).map((error) => {
    const rowPrefix = error.row ? `Row ${error.row}` : 'File';
    return `${rowPrefix} - ${error.column}: ${error.message}`;
  });
  const remaining = errors.length - visible.length;
  return remaining > 0
    ? `${visible.join('\n')}\n...and ${remaining} more issue(s).`
    : visible.join('\n');
};

export const validateAttendeeImportRows = (rows, { existingAttendees = [] } = {}) => {
  const errors = [];
  const headerRowIndex = rows.findIndex(rowHasAnyValue);

  if (headerRowIndex < 0) {
    return { attendees: [], errors: [{ row: null, column: 'File', message: 'No header row was found.' }] };
  }

  const headerMap = buildHeaderMap(rows[headerRowIndex]);
  ATTENDEE_IMPORT_REQUIRED_HEADERS.forEach((header) => {
    const key = Object.entries(HEADER_KEYS).find(([, label]) => label === header)?.[0];
    if (key && headerMap[key] === undefined) {
      addError(errors, null, header, 'Required header is missing.');
    }
  });

  if (errors.length > 0) return { attendees: [], errors };

  const existingMobiles = new Set(
    existingAttendees
      .map((attendee) => normalizeMobile(attendee?.mobile || attendee?.mobileNumber))
      .filter(Boolean)
  );
  const importedMobiles = new Set();
  const attendees = [];

  rows.slice(headerRowIndex + 1).forEach((row, index) => {
    if (!rowHasAnyValue(row)) return;

    const rowNumber = headerRowIndex + index + 2;
    const name = toText(readCell(row, headerMap, 'name'));
    const mobile = normalizeMobile(readCell(row, headerMap, 'mobile'));
    const category = toText(readCell(row, headerMap, 'category'));
    const company = toText(readCell(row, headerMap, 'company'));
    const expected = parseExpected(readCell(row, headerMap, 'expected'));

    if (!name) addError(errors, rowNumber, HEADER_KEYS.name, 'Name is required.');
    if (mobile.length !== 10) addError(errors, rowNumber, HEADER_KEYS.mobile, 'Mobile Number must be 10 digits.');
    if (!expected.valid) addError(errors, rowNumber, HEADER_KEYS.expected, 'Use true/false, yes/no, y/n, or 1/0.');

    if (mobile.length === 10) {
      if (existingMobiles.has(mobile)) {
        addError(errors, rowNumber, HEADER_KEYS.mobile, 'Mobile Number is already added to this meeting.');
      }
      if (importedMobiles.has(mobile)) {
        addError(errors, rowNumber, HEADER_KEYS.mobile, 'Duplicate Mobile Number in this file.');
      }
      importedMobiles.add(mobile);
    }

    attendees.push({
      name,
      mobile,
      mobileNumber: mobile,
      category,
      cityArea: toText(readCell(row, headerMap, 'cityArea')),
      company,
      companyShopProject: company,
      email: toText(readCell(row, headerMap, 'email')),
      categoryDetails: toText(readCell(row, headerMap, 'categoryDetails')),
      remarks: toText(readCell(row, headerMap, 'remarks')),
      expected: expected.value,
    });
  });

  if (attendees.length === 0 && errors.length === 0) {
    addError(errors, null, 'File', 'No attendee rows were found.');
  }

  return { attendees: errors.length > 0 ? [] : attendees, errors };
};

export const parseAttendeeImportWorkbook = (base64Workbook, options = {}) => {
  try {
    const workbook = XLSX.read(base64Workbook, { type: 'base64', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { attendees: [], errors: [{ row: null, column: 'File', message: 'No worksheet was found.' }] };
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      header: 1,
      raw: true,
      defval: '',
    });

    return validateAttendeeImportRows(rows, options);
  } catch (error) {
    return {
      attendees: [],
      errors: [{
        row: null,
        column: 'File',
        message: error?.message ? `Unable to read file: ${error.message}` : 'Unable to read file.',
      }],
    };
  }
};
