import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { homePath, useAuth } from './auth/AuthContext';
import AppShell from './components/AppShell';
import { Spinner } from './components/ui';

import Login from './pages/public/Login';
import Register from './pages/public/Register';
import VerifyEmail from './pages/public/VerifyEmail';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import AcceptInvite from './pages/public/AcceptInvite';
import InstitutionRegister from './pages/public/InstitutionRegister';
import Pending from './pages/public/Pending';

import StudentHome from './pages/student/StudentHome';
import StudentSearch from './pages/student/StudentSearch';
import StudentRequests from './pages/student/StudentRequests';
import StudentRequest from './pages/student/StudentRequest';
import StudentProfile from './pages/student/StudentProfile';
import StudentRecords from './pages/student/StudentRecords';
import StudentDocuments from './pages/student/StudentDocuments';

import CollegeHome from './pages/college/CollegeHome';
import CollegeEnrolments from './pages/college/CollegeEnrolments';
import RequestQueue from './pages/college/RequestQueue';
import CollegeReview from './pages/college/CollegeReview';
import CollegeOutgoing from './pages/college/CollegeOutgoing';
import CollegeInterviews from './pages/college/CollegeInterviews';
import CollegeVacancies from './pages/college/CollegeVacancies';

import UniversityHome from './pages/university/UniversityHome';
import UniversityApprovals from './pages/university/UniversityApprovals';
import UniversityLeaving from './pages/university/UniversityLeaving';
import UniversityColleges from './pages/university/UniversityColleges';
import UniversityCourses from './pages/university/UniversityCourses';
import UniversityAppeals from './pages/university/UniversityAppeals';

import PlatformHome from './pages/platform/PlatformHome';
import PlatformRegistrations from './pages/platform/PlatformRegistrations';
import PlatformInstitutions from './pages/platform/PlatformInstitutions';

import Team from './pages/shared/Team';
import Notifications from './pages/shared/Notifications';
import NotFound from './pages/shared/NotFound';

// Gate a route by signed-in state and role(s)
function Guard({ roles, children }) {
  const { user, ready, membership } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.some((r) => user.roles?.includes(r))) return <Navigate to={homePath(user, membership)} replace />;
  return children;
}

// Institution areas also need an approved membership of the matching type
function InstitutionGuard({ type, children }) {
  const { user, membership } = useAuth();
  if (user?.roles?.includes('PLATFORM_ADMIN')) return children;
  if (!membership) return <Navigate to="/pending" replace />;
  const isCollege = membership.institution_kind === 'COLLEGE';
  if ((type === 'COLLEGE') !== isCollege) return <Navigate to={homePath(user, membership)} replace />;
  return children;
}

function Home() {
  const { user, ready, membership } = useAuth();
  if (!ready) return <Spinner />;
  return <Navigate to={homePath(user, membership)} replace />;
}

const COLLEGE = ['COLLEGE_ADMIN', 'COLLEGE_USER'];
const UNIVERSITY = ['UNIVERSITY_ADMIN', 'UNIVERSITY_USER'];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />
      <Route path="/institution-register" element={<InstitutionRegister />} />
      <Route path="/pending" element={<Guard><Pending /></Guard>} />

      <Route path="/notifications" element={<Guard><AppShell area="notifications" /></Guard>}>
        <Route index element={<Notifications />} />
      </Route>

      <Route path="/student" element={<Guard roles={['STUDENT']}><AppShell area="student" /></Guard>}>
        <Route index element={<StudentHome />} />
        <Route path="search" element={<StudentSearch />} />
        <Route path="requests" element={<StudentRequests />} />
        <Route path="requests/:id" element={<StudentRequest />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="records" element={<StudentRecords />} />
        <Route path="documents" element={<StudentDocuments />} />
      </Route>

      <Route path="/college" element={<Guard roles={COLLEGE}><InstitutionGuard type="COLLEGE"><AppShell area="college" /></InstitutionGuard></Guard>}>
        <Route index element={<CollegeHome />} />
        <Route path="enrolments" element={<CollegeEnrolments />} />
        <Route path="incoming" element={<RequestQueue direction="incoming" base="/college/incoming" title="Incoming requests" />} />
        <Route path="incoming/:id" element={<CollegeReview />} />
        <Route path="outgoing" element={<CollegeOutgoing />} />
        <Route path="interviews" element={<CollegeInterviews />} />
        <Route path="vacancies" element={<CollegeVacancies />} />
        <Route path="team" element={<Team />} />
      </Route>

      <Route path="/university" element={<Guard roles={UNIVERSITY}><InstitutionGuard type="UNIVERSITY"><AppShell area="university" /></InstitutionGuard></Guard>}>
        <Route index element={<UniversityHome />} />
        <Route path="approvals" element={<UniversityApprovals />} />
        <Route path="leaving" element={<UniversityLeaving />} />
        <Route path="colleges" element={<UniversityColleges />} />
        <Route path="courses" element={<UniversityCourses />} />
        <Route path="appeals" element={<UniversityAppeals />} />
        <Route path="team" element={<Team />} />
      </Route>

      <Route path="/platform" element={<Guard roles={['PLATFORM_ADMIN']}><AppShell area="platform" /></Guard>}>
        <Route index element={<PlatformHome />} />
        <Route path="registrations" element={<PlatformRegistrations />} />
        <Route path="institutions" element={<PlatformInstitutions />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
