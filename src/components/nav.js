// Sidebar items per area. `permission` hides an item from users whose bundles lack it.
export const NAV = {
  student: [
    { to: '/student', label: 'Home', end: true },
    { to: '/student/search', label: 'Find a course' },
    { to: '/student/requests', label: 'My requests' },
    { to: '/student/profile', label: 'Profile and enrolment' },
    { to: '/student/records', label: 'Academic records' },
    { to: '/student/documents', label: 'Documents' },
  ],
  college: [
    { to: '/college', label: 'Dashboard', end: true },
    { to: '/college/enrolments', label: 'Enrolment checks', permission: 'VERIFY_ENROLMENT' },
    { to: '/college/incoming', label: 'Incoming requests', permission: 'REVIEW_REQUEST' },
    { to: '/college/outgoing', label: 'Outgoing requests', permission: 'DECIDE_NOC' },
    { to: '/college/interviews', label: 'Interviews', permission: 'CONDUCT_INTERVIEW' },
    { to: '/college/vacancies', label: 'Courses and vacancies', permission: 'MANAGE_VACANCIES' },
    { to: '/college/team', label: 'Team and permissions', permission: 'MANAGE_INSTITUTION_USERS' },
  ],
  university: [
    { to: '/university', label: 'Dashboard', end: true },
    { to: '/university/approvals', label: 'Entry approvals', permission: 'APPROVE_ENTRY' },
    { to: '/university/leaving', label: 'Leaving approvals', permission: 'ISSUE_RELEASE' },
    { to: '/university/colleges', label: 'College registrations', permission: 'APPROVE_COLLEGE_REGISTRATION' },
    { to: '/university/courses', label: 'Courses and syllabus', permission: 'MANAGE_COURSES' },
    { to: '/university/appeals', label: 'Appeals', permission: 'DECIDE_APPEAL' },
    { to: '/university/team', label: 'Team and permissions', permission: 'MANAGE_INSTITUTION_USERS' },
  ],
  platform: [
    { to: '/platform', label: 'Dashboard', end: true },
    { to: '/platform/registrations', label: 'Registrations' },
    { to: '/platform/institutions', label: 'Institutions' },
  ],
};
