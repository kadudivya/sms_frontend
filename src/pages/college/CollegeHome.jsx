import { dashboards } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import StatusCounts from '../../components/StatusCounts';
import { Async, PageHeader, TaskTile } from '../../components/ui';
import { fmtNum } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function CollegeHome() {
  const { membership } = useAuth();
  const id = membership?.institution_id;
  const state = useApi(() => dashboards.college(id), [id]);

  return (
    <Async state={state}>
      {(d) => {
        const p = d.pending_tasks;
        return (
          <>
            <PageHeader title={d.institution.name} subtitle="What is waiting on your college today." />
            <section aria-label="Pending work" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <TaskTile to="/college/enrolments" label="Enrolment checks" value={p.enrolment_verifications} hint="students to confirm" />
              <TaskTile to="/college/outgoing" label="NOC decisions" value={p.noc_decisions} hint="students leaving" warn={p.noc_decisions > 0} />
              <TaskTile to="/college/incoming" label="Requests to review" value={p.requests_to_review} hint="students joining" />
              <TaskTile to="/college/interviews" label="Interviews today" value={p.interviews_today} />
              <TaskTile to="/college/outgoing" label="Releases to issue" value={p.releases_to_issue} hint="upload the TC" />
              <TaskTile to="/college/incoming" label="Admissions to confirm" value={p.admissions_to_confirm} />
              <TaskTile to="/college/incoming" label="Originals pending" value={p.originals_pending} />
              <TaskTile to="/college/team" label="Access requests" value={p.access_requests} />
            </section>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <StatusCounts title="Coming in" counts={d.incoming_by_status} />
              <StatusCounts title="Going out" counts={d.outgoing_by_status} />
            </div>
            <section className="card grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><span className="muted">Vacancy rows</span><p className="text-xl font-bold">{fmtNum(d.vacancies.rows)}</p></div>
              <div><span className="muted">Seats</span><p className="text-xl font-bold">{fmtNum(d.vacancies.total_seats)}</p></div>
              <div><span className="muted">Available</span><p className="text-xl font-bold">{fmtNum(d.vacancies.available)}</p></div>
              <div><span className="muted">Courses without vacancies</span><p className="text-xl font-bold">{fmtNum(d.vacancies.offerings_without_vacancy)}</p></div>
            </section>
          </>
        );
      }}
    </Async>
  );
}
