# Student Migration System: frontend

React 18 + Vite + Tailwind CSS. It talks to the Flask backend (`sms_backend`) at `/api/v1`.

## Run it

```bash
# 1. Backend (from sms_backend), with debug OTPs on in development
flask run                      # http://localhost:5000/api/v1

# 2. Frontend
cp .env.example .env
npm install
npm run dev                    # http://localhost:5173
```

The Vite dev server proxies `/api` to `BACKEND_URL` (default `http://localhost:5000`), so the browser sees a single origin.

For production, run `npm run build` and serve `dist/` behind the same domain as the API. Configure the web server to send unknown paths to `index.html` so client-side routes still load. If the API is on another host, set `VITE_API_BASE_URL=https://api.example.in/api/v1` before building, and add the frontend origin to the backend's `CORS_ORIGINS`.

## How it fits the backend

| Concern | Where |
|---|---|
| Response envelope `{success, api_code, data, errors, meta}` | `src/api/client.js` turns failures into `ApiError` (`code`, `fieldErrors`, `requestId`) |
| One function per API, each tagged with its unique API code (`CREATE_STUDENT`, `APPROVE_ENTRY` …) | `src/api/endpoints.js` |
| Login: password, then an emailed OTP for admins and approvers (`pre_auth_token`) | `src/auth/AuthContext.jsx`, `src/pages/public/Login.jsx` |
| Roles, the active institution (a user can belong to several) and permission checks with `can('APPROVE_ENTRY')` | `AuthContext` (from `/auth/me`) |
| Optimistic locking: actions send the request `version`; a 409 `CONCURRENT_UPDATE` shows a reload-and-retry message | `client.js` and the review and approval screens |
| Multipart uploads (documents, TC, migration certificate, authorisation letter) | `endpoints.js`, `InstitutionDetails.toFormData` |
| Enum labels and badge colours (`MigrationStatus`, `VerificationStatus` …) | `src/lib/labels.js` |

The token is held in memory and in `sessionStorage`, so it lasts only while the tab is open. The backend allows one active session per user, so signing in elsewhere ends this one, and the app then returns to the sign-in page.

## Screens by role

| Role | Routes |
|---|---|
| Public | `/login` (with OTP step), `/register` (student), `/verify-email`, `/forgot-password`, `/reset-password`, `/institution-register` (admin access request with AISHE lookup and authorisation letter), `/invite/:token` (invitations and signup links), `/pending` |
| Student | `/student` dashboard and tasks, `/student/search` (courses with seats, start a draft), `/student/requests/:id` (checklist uploads, grade conversion, submit, corrections, accept/decline offer, withdraw, appeal, history), `/student/profile` (profile, ABC ID, enrolment claim, ask to onboard a college), `/student/records`, `/student/documents` |
| College Admin / User | `/college` dashboard, `/college/enrolments`, `/college/incoming` and `/college/incoming/:id` (start review, verify documents, credit-by-credit decisions, eligibility re-run, return/reject/recommend, confirm admission, verify originals), `/college/outgoing` (NOC grant/refuse with fixed reasons, TC upload), `/college/interviews` (schedule, join, outcome, no-show), `/college/vacancies` (seats by category, request a course), `/college/team` |
| University Admin / User | `/university` dashboard, `/university/approvals` (equivalence decision, approve entry, reject, override eligibility), `/university/leaving` (migration certificate), `/university/colleges` (invite or send signup links, review college registrations), `/university/courses` (courses, syllabus versions and publishing, course requests, assign to college), `/university/appeals`, `/university/team` |
| Platform Admin | `/platform` dashboard (pending work, alerts, students waiting on colleges not yet onboarded), `/platform/registrations` (including second-admin claims), `/platform/institutions` (AISHE master data, create university, signup links) |
| Everyone signed in | `/notifications` |

Sidebar items are hidden when the user's permission bundles do not include them. The backend still checks every permission itself.

## Project layout

```
src/
  api/          client.js (fetch + envelope), endpoints.js (all API calls)
  auth/         AuthContext.jsx (session, roles, memberships, can())
  components/   AppShell (sidebar layout), ui.jsx (Card, Table, Badge, Modal, Field …),
                RegistrationReview, StatusCounts, InstitutionDetails
  lib/          labels.js, format.js (IST dates), useApi.js (load and action hooks)
  pages/        public/, student/, college/, university/, platform/, shared/
```

## Design

The visual language matches the clickable prototype: Public Sans, a navy logo mark, a blue primary (`#1D4ED8`) and a light grey canvas. The layout works down to phone width, with a collapsible menu below the `lg` breakpoint.
