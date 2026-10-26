import { Link } from 'react-router-dom';
import { dashboards } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, Empty, EnumBadge, Notice, PageHeader, StatusBadge } from '../../components/ui';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { DOC_TYPES, STUDENT_TASKS, VERIFICATION, humanize } from '../../lib/labels';
import { useApi } from '../../lib/useApi';

function taskLink(t) {
  if (t.request_id) return `/student/requests/${t.request_id}`;
  return '/student/profile';
}

export default function StudentHome() {
  const { user } = useAuth();
  const state = useApi(() => dashboards.student(), []);

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.full_name?.split(' ')[0] || 'there'}`}
        subtitle="Your migration requests and what needs your attention."
        actions={<Link to="/student/search" className="btn">Find a course</Link>}
      />
      <Async state={state}>
        {(d) => (
          <>
            {d.profile && (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong>{d.profile.current_college_name || 'Current college not set'}</strong>
                    <p className="text-sm muted">
                      {d.profile.current_course_name || 'Course not set'}
                      {d.profile.current_semester ? ` · semester ${d.profile.current_semester}` : ''}
                      {d.profile.abc_account_id ? ` · ABC ${d.profile.abc_account_id}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm"><span className="muted">Enrolment</span><EnumBadge map={VERIFICATION} value={d.profile.enrolment_status} /></div>
                </div>
                {d.profile.current_college_id && !d.profile.current_college_onboarded && (
                  <div className="mt-4"><Notice tone="amber">Your college is not on the platform yet, so it cannot confirm your enrolment. <Link to="/student/profile">Ask us to bring it on board</Link>.</Notice></div>
                )}
              </Card>
            )}

            <Card title="To do">
              {d.pending_tasks.length === 0 ? (
                <p className="muted">Nothing needs your attention right now.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-gray-100">
                  {d.pending_tasks.map((t, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <strong>{STUDENT_TASKS[t.task] || humanize(t.task)}</strong>
                        <p className="text-sm muted">
                          {t.task === 'UPLOAD_DOCUMENT' ? DOC_TYPES[t.detail] || t.detail
                            : Array.isArray(t.detail) ? `Missing: ${t.detail.map(humanize).join(', ')}` : t.detail}
                          {t.deadline && ` · by ${fmtDate(t.deadline)}`}
                        </p>
                      </div>
                      <Link to={taskLink(t)} className="btn-secondary">Open</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="My requests" className="lg:col-span-2" actions={<Link to="/student/requests" className="text-sm font-semibold">See all</Link>}>
                {d.requests.length === 0 ? (
                  <Empty title="No requests yet">Search for a course with open seats to start one.</Empty>
                ) : (
                  <ul className="flex flex-col divide-y divide-gray-100">
                    {d.requests.map((r) => (
                      <li key={r.id}>
                        <Link to={`/student/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-gray-900 hover:text-gray-900">
                          <div>
                            <strong>{r.course.name} · {r.destination_institution.name}</strong>
                            <p className="text-sm muted">{r.reference_no} · entry semester {r.entry_semester} · {r.academic_year}</p>
                          </div>
                          <StatusBadge status={r.request_status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Interviews">
                {d.upcoming_interviews.length === 0 ? <p className="muted">None scheduled.</p> : (
                  <ul className="flex flex-col gap-3">
                    {d.upcoming_interviews.map((iv) => (
                      <li key={iv.interview_id} className="rounded-lg bg-gray-50 p-3 text-sm">
                        <strong>{fmtDateTime(iv.when)}</strong>
                        <p className="muted">{humanize(iv.mode)}{iv.location ? ` · ${iv.location}` : ''} · <Link to={`/student/requests/${iv.request_id}`}>View request</Link></p>
                        {iv.meeting_url && <p><a href={iv.meeting_url} target="_blank" rel="noreferrer" className="font-semibold">Join the meeting</a>{iv.meeting_info ? <span className="muted"> · {iv.meeting_info}</span> : null}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </Async>
    </>
  );
}
