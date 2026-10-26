// Human labels and badge tones for backend enum values (app/enums.py).

export const ROLES = {
  PLATFORM_ADMIN: 'Platform Admin',
  UNIVERSITY_ADMIN: 'University Admin',
  UNIVERSITY_USER: 'University User',
  COLLEGE_ADMIN: 'College Admin',
  COLLEGE_USER: 'College User',
  STUDENT: 'Student',
};

// MigrationStatus -> [label, tone]
export const MIGRATION_STATUS = {
  DRAFT: ['Draft', 'gray'],
  SUBMITTED: ['Awaiting NOC', 'blue'],
  NOC_GRANTED: ['Awaiting review', 'blue'],
  UNDER_REVIEW: ['Under review', 'blue'],
  RETURNED_FOR_CORRECTION: ['Needs correction', 'amber'],
  INTERVIEW_SCHEDULED: ['Interview scheduled', 'blue'],
  RECOMMENDED: ['Recommended', 'blue'],
  ENTRY_APPROVED: ['Entry approved', 'green'],
  WAITLISTED: ['Waitlisted', 'amber'],
  PROVISIONAL_OFFER: ['Offer received', 'green'],
  OFFER_ACCEPTED: ['Offer accepted', 'green'],
  RELEASED: ['Released', 'green'],
  ADMITTED_ORIGINALS_PENDING: ['Admitted, originals pending', 'green'],
  ADMITTED: ['Admitted', 'green'],
  APPEALED: ['Appealed', 'amber'],
  REJECTED: ['Rejected', 'red'],
  WITHDRAWN: ['Withdrawn', 'gray'],
  OFFER_DECLINED: ['Offer declined', 'gray'],
  OFFER_EXPIRED: ['Offer expired', 'gray'],
  CANCELLED: ['Cancelled', 'gray'],
};

export const VERIFICATION = {
  PENDING: ['Pending', 'amber'],
  VERIFIED: ['Verified', 'green'],
  REJECTED: ['Rejected', 'red'],
  CORRECTION_REQUESTED: ['Correction requested', 'amber'],
  NOT_SUBMITTED: ['Not submitted', 'gray'],
};

export const ELIGIBILITY = {
  PENDING: ['Pending', 'gray'],
  ELIGIBLE: ['Eligible', 'green'],
  INELIGIBLE: ['Not eligible', 'red'],
  MANUAL_REVIEW: ['Manual review', 'amber'],
  OVERRIDDEN: ['Overridden', 'blue'],
};

export const DOC_TYPES = {
  PHOTO: 'Photograph',
  ID_PROOF: 'ID proof',
  CLASS_10_MARKSHEET: 'Class 10 marksheet',
  CLASS_12_MARKSHEET: 'Class 12 marksheet',
  SEMESTER_MARKSHEET: 'Semester marksheets',
  ENROLMENT_PROOF: 'Enrolment proof',
  CONVERSION_CERTIFICATE: 'Grade conversion certificate',
  CATEGORY_CERTIFICATE: 'Category certificate',
  GAP_CERTIFICATE: 'Gap certificate',
  ABC_CREDIT_STATEMENT: 'ABC credit statement',
  ANTI_RAGGING_AFFIDAVIT: 'Anti-ragging affidavit',
  NOC: 'No objection certificate',
  TRANSFER_CERTIFICATE: 'Transfer certificate',
  MIGRATION_CERTIFICATE: 'Migration certificate',
};

export const STUDENT_TASKS = {
  COMPLETE_PROFILE: 'Complete your profile',
  SUBMIT_ENROLMENT: 'Submit your enrolment details',
  MAKE_CORRECTIONS: 'Make the corrections your new college asked for',
  ACCEPT_OR_DECLINE_OFFER: 'Accept or decline your offer',
  REPORT_WITH_ORIGINALS: 'Report to college with original documents',
  UPLOAD_DOCUMENT: 'Upload a document',
};

export const CATEGORIES = { OPEN: 'Open', SC: 'SC', ST: 'ST', OBC_NCL: 'OBC (non-creamy layer)', EWS: 'EWS', PWD: 'PwD' };

export const label = (map, value) => (map[value] ? (Array.isArray(map[value]) ? map[value][0] : map[value]) : value || '—');
export const tone = (map, value) => (Array.isArray(map[value]) ? map[value][1] : 'gray');
const ACRONYMS = new Set(['noc', 'tc', 'abc', 'cgpa', 'sgpa', 'aishe', 'id', 'sc', 'st', 'obc', 'ews', 'pwd', 'ug', 'pg', 'ips']);
export const humanize = (s) => (s
  ? s.toLowerCase().split('_').map((w, i) => (ACRONYMS.has(w) ? w.toUpperCase() : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')
  : '—');
