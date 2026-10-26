// One function per backend API. The comment on each line is the backend's
// unique API code, so a screen can be traced to the user_activity row it writes.
import { http, request } from './client';

export const auth = {
  login: (email, password) => http.post('/auth/login', { email, password }), // LOGIN
  verifyOtp: (otp) => http.post('/auth/login/verify-otp', { otp }, { usePreAuth: true }), // VERIFY_LOGIN_OTP
  resendOtp: () => http.post('/auth/login/resend-otp', {}, { usePreAuth: true }), // RESEND_LOGIN_OTP
  logout: () => http.post('/auth/logout'), // LOGOUT
  me: () => http.get('/auth/me'), // GET_CURRENT_USER
  changePassword: (body) => http.post('/auth/change-password', body), // CHANGE_PASSWORD
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }), // FORGOT_PASSWORD
  resetPassword: (body) => http.post('/auth/reset-password', body), // RESET_PASSWORD
  verifyEmail: (email, otp) => http.post('/auth/verify-email', { email, otp }), // VERIFY_EMAIL
  resendEmailOtp: (email) => http.post('/auth/resend-email-otp', { email }), // RESEND_EMAIL_OTP
  updatePreferences: (body) => http.patch('/auth/me/preferences', body), // UPDATE_MY_PREFERENCES
  sessions: () => http.get('/auth/sessions'), // LIST_MY_SESSIONS
};

export const master = {
  states: () => http.get('/states'), // LIST_STATES
  districts: (stateId) => http.get(`/states/${stateId}/districts`), // LIST_DISTRICTS
  institutions: (params) => http.get('/institutions', params), // LIST_INSTITUTIONS
  // kind is 'university' or 'college' (the table the id belongs to; see urlKind() in AuthContext)
  institution: (kind, id) => http.get(`/institutions/${kind}/${id}`), // GET_INSTITUTION
};

export const students = {
  register: (body) => http.post('/students', body), // CREATE_STUDENT
  me: () => http.get('/students/me'), // GET_STUDENT_PROFILE
  updateMe: (body) => http.patch('/students/me', body), // UPDATE_STUDENT_PROFILE
  submitEnrolment: (body, proof) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => v !== '' && v != null && fd.append(k, String(v)));
    if (proof) fd.append('proof', proof);
    return http.upload('/students/me/enrolment', fd); // SUBMIT_ENROLMENT_DETAILS
  },
  requestCollegeOnboarding: (body) => http.post('/students/me/college-onboarding', body), // REQUEST_COLLEGE_ONBOARDING
  records: () => http.get('/students/me/academic-records'), // LIST_ACADEMIC_RECORDS
  addRecord: (body) => http.post('/students/me/academic-records', body), // CREATE_ACADEMIC_RECORD
  enrolmentQueue: (params) => http.get('/enrolment-verifications', params), // LIST_ENROLMENT_VERIFICATIONS
  decideEnrolment: (studentId, approve, reason) =>
    http.post(`/enrolment-verifications/${studentId}/decision`, { approve, reason }), // DECIDE_ENROLMENT
};

export const documents = {
  mine: () => http.get('/documents/mine'), // LIST_MY_DOCUMENTS
  uploadMine: (docType, file, replaceId) => {
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('file', file);
    if (replaceId) fd.append('replace_document_id', String(replaceId));
    return http.upload('/documents/mine', fd); // UPLOAD_PROFILE_DOCUMENT
  },
  get: (id) => http.get(`/documents/${id}`), // GET_DOCUMENT
  verify: (id, decision, reason) => http.post(`/documents/${id}/verify`, { decision, reason }), // VERIFY_DOCUMENT
};

export const search = {
  offerings: (params) => http.get('/search/offerings', params), // SEARCH_OFFERINGS
  offering: (id) => http.get(`/search/offerings/${id}`), // GET_OFFERING_DETAILS
};

export const migration = {
  create: (body) => http.post('/migration-requests', body), // CREATE_MIGRATION_REQUEST
  mine: () => http.get('/migration-requests/mine'), // LIST_MY_MIGRATION_REQUESTS
  get: (id) => http.get(`/migration-requests/${id}`), // GET_MIGRATION_REQUEST
  list: (params) => http.get('/migration-requests', params), // LIST_INSTITUTION_MIGRATION_REQUESTS
  uploadDocument: (id, docType, file) => {
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('file', file);
    return http.upload(`/migration-requests/${id}/documents`, fd); // UPLOAD_REQUEST_DOCUMENT
  },
  setConversion: (id, certificate, certifiedPercentage) => {
    const fd = new FormData();
    if (certificate) fd.append('certificate', certificate);
    if (certifiedPercentage !== undefined && certifiedPercentage !== '') fd.append('certified_percentage', String(certifiedPercentage));
    return request('PUT', `/migration-requests/${id}/grade-conversion`, { form: fd }); // SET_GRADE_CONVERSION
  },
  submit: (id) => http.post(`/migration-requests/${id}/submit`), // SUBMIT_MIGRATION_REQUEST
  resubmit: (id) => http.post(`/migration-requests/${id}/resubmit`), // RESUBMIT_MIGRATION_REQUEST
  withdraw: (id, reason) => http.post(`/migration-requests/${id}/withdraw`, { reason }), // WITHDRAW_MIGRATION_REQUEST
  acceptOffer: (id) => http.post(`/migration-requests/${id}/accept-offer`), // ACCEPT_OFFER
  declineOffer: (id, reason) => http.post(`/migration-requests/${id}/decline-offer`, { reason }), // DECLINE_OFFER
  appeal: (id, reason) => http.post(`/migration-requests/${id}/appeal`, { reason }), // FILE_APPEAL
  // college / university actions; `version` gives optimistic locking
  noc: (id, body) => http.post(`/migration-requests/${id}/noc`, body), // DECIDE_NOC
  transferCertificate: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.upload(`/migration-requests/${id}/transfer-certificate`, fd); // UPLOAD_TRANSFER_CERTIFICATE
  },
  universityRelease: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.upload(`/migration-requests/${id}/university-release`, fd); // RELEASE_FROM_UNIVERSITY
  },
  startReview: (id) => http.post(`/migration-requests/${id}/start-review`), // START_REVIEW
  returnForCorrection: (id, note, version) =>
    http.post(`/migration-requests/${id}/return-for-correction`, { note, version }), // RETURN_FOR_CORRECTION
  assessCredits: (id, decisions) => http.put(`/migration-requests/${id}/credits`, { decisions }), // ASSESS_CREDITS
  eligibilityCheck: (id) => http.post(`/migration-requests/${id}/eligibility-check`), // RUN_ELIGIBILITY_CHECK
  recommend: (id, note, version) => http.post(`/migration-requests/${id}/recommend`, { note, version }), // RECOMMEND_MIGRATION_REQUEST
  reject: (id, reason, version) => http.post(`/migration-requests/${id}/reject`, { reason, version }), // REJECT_MIGRATION_REQUEST
  confirmAdmission: (id, version) =>
    http.post(`/migration-requests/${id}/confirm-admission`, { fee_paid: true, version }), // CONFIRM_ADMISSION
  verifyOriginals: (id) => http.post(`/migration-requests/${id}/verify-originals`), // VERIFY_ORIGINALS
  approveEntry: (id, body) => http.post(`/migration-requests/${id}/approve-entry`, body), // APPROVE_ENTRY
  overrideEligibility: (id, reason, version) =>
    http.post(`/migration-requests/${id}/override-eligibility`, { reason, version }), // OVERRIDE_ELIGIBILITY
  appeals: (params) => http.get('/migration-requests/appeals', params), // LIST_APPEALS
  decideAppeal: (appealId, uphold, note) =>
    http.post(`/migration-requests/appeals/${appealId}/decision`, { uphold, note }), // DECIDE_APPEAL
};

export const interviews = {
  list: (params) => http.get('/interviews', params), // LIST_INTERVIEWS
  schedule: (body) => http.post('/interviews', body), // SCHEDULE_INTERVIEW
  outcome: (id, outcome, remarks) => http.post(`/interviews/${id}/outcome`, { outcome, remarks }), // RECORD_INTERVIEW_OUTCOME
  noShow: (id, note) => http.post(`/interviews/${id}/no-show`, { note }), // MARK_INTERVIEW_NO_SHOW
  updateMeetingLink: (id, meetingUrl, meetingInfo) =>
    http.put(`/interviews/${id}/meeting-link`, { meeting_url: meetingUrl, meeting_info: meetingInfo || null }), // UPDATE_INTERVIEW_MEETING_LINK
  hours: (collegeId) => http.get(`/colleges/${collegeId}/interview-hours`), // LIST_INTERVIEW_WORKING_HOURS
};

export const vacancies = {
  list: (params) => http.get('/vacancies', params), // LIST_VACANCIES
  upsert: (body) => http.put('/vacancies', body), // UPSERT_VACANCY
};

export const academics = {
  courses: (universityId, params) => http.get(`/universities/${universityId}/courses`, params), // LIST_COURSES
  offerings: (params) => http.get('/course-offerings', params), // LIST_COURSE_OFFERINGS
  academicYears: (params) => http.get('/academic-years', params), // LIST_ACADEMIC_YEARS
  assignCourse: (courseId, body) => http.post(`/courses/${courseId}/offerings`, body), // ASSIGN_COURSE_TO_COLLEGE
  syllabi: (universityId) => http.get(`/universities/${universityId}/syllabi`), // LIST_SYLLABI
  syllabus: (id) => http.get(`/syllabi/${id}`), // GET_SYLLABUS
  publishSyllabus: (id) => http.post(`/syllabi/${id}/publish`), // PUBLISH_SYLLABUS
  offeringRequests: (params) => http.get('/offering-requests', params), // LIST_OFFERING_REQUESTS
  requestOffering: (collegeId, body) => http.post(`/colleges/${collegeId}/offering-requests`, body), // REQUEST_COURSE_OFFERING
  decideOfferingRequest: (id, body) => http.post(`/offering-requests/${id}/decision`, body), // DECIDE_OFFERING_REQUEST
};

export const staff = {
  bundles: () => http.get('/permission-bundles'), // LIST_PERMISSION_BUNDLES
  members: (kind, id) => http.get(`/institutions/${kind}/${id}/members`), // LIST_INSTITUTION_USERS
  invite: (kind, id, body) => http.post(`/institutions/${kind}/${id}/invitations`, body), // INVITE_STAFF_USER
  accessRequests: (kind, id) => http.get(`/institutions/${kind}/${id}/access-requests`), // LIST_ACCESS_REQUESTS
  decideAccess: (membershipId, body) => http.post(`/memberships/${membershipId}/access-decision`, body), // DECIDE_ACCESS_REQUEST
  updatePermissions: (membershipId, body) => http.put(`/memberships/${membershipId}/permissions`, body), // UPDATE_USER_PERMISSIONS
};

export const onboarding = {
  lookup: (aisheCode) => http.get('/onboarding/lookup', { aishe_code: aisheCode }), // LOOKUP_INSTITUTION_BY_AISHE
  invitation: (token) => http.get(`/onboarding/invitations/${token}`), // GET_INVITATION
  acceptInvitation: (token, body) => http.post(`/onboarding/invitations/${token}/accept`, body), // ACCEPT_INVITATION
  submitRegistration: (body) => http.post('/onboarding/registrations', body), // SUBMIT_INSTITUTION_REGISTRATION
  registrations: (params) => http.get('/onboarding/registrations', params), // LIST_REGISTRATION_REQUESTS
  registration: (id) => http.get(`/onboarding/registrations/${id}`), // GET_REGISTRATION_REQUEST
  approve: (id, note) => http.post(`/onboarding/registrations/${id}/approve`, { note }), // APPROVE_REGISTRATION
  reject: (id, reason) => http.post(`/onboarding/registrations/${id}/reject`, { reason }), // REJECT_REGISTRATION
  createUniversity: (body) => http.post('/onboarding/universities', body), // CREATE_UNIVERSITY
  sendUniversitySignupLink: (body) => http.post('/onboarding/universities/signup-links', body), // SEND_UNIVERSITY_SIGNUP_LINK
  createCollege: (uniId, body) => http.post(`/onboarding/universities/${uniId}/colleges`, body), // CREATE_COLLEGE
  sendCollegeSignupLink: (uniId, body) =>
    http.post(`/onboarding/universities/${uniId}/colleges/signup-links`, body), // SEND_COLLEGE_SIGNUP_LINK
};

export const dashboards = {
  student: () => http.get('/dashboards/student'), // GET_STUDENT_DASHBOARD
  college: (id) => http.get(`/dashboards/college/${id}`), // GET_COLLEGE_DASHBOARD
  university: (id) => http.get(`/dashboards/university/${id}`), // GET_UNIVERSITY_DASHBOARD
  platform: () => http.get('/dashboards/platform'), // GET_PLATFORM_DASHBOARD
};

export const notifications = {
  list: (params) => http.get('/notifications', params), // LIST_MY_NOTIFICATIONS
  markRead: (id) => http.post(`/notifications/${id}/read`), // MARK_NOTIFICATION_READ
  markAll: () => http.post('/notifications/read-all'), // MARK_ALL_NOTIFICATIONS_READ
};

export { request };
