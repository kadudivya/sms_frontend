import { dashboards } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import StatusCounts from '../../components/StatusCounts';
import { Async, PageHeader, TaskTile } from '../../components/ui';
import { fmtNum } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function UniversityHome() {
  const { membership } = useAuth();
  const id = membership?.institution_id;
  const state = useApi(() => dashboards.university(id), [id]);

  return (
    <Async state={state}>
      {(d) => {
        const p = d.pending_tasks;
        return (
          <>
            <PageHeader
              title={d.institution.name}
              subtitle={`${fmtNum(d.colleges.active)} of ${fmtNum(d.colleges.total)} affiliated colleges active · ${fmtNum(d.courses)} courses · ${fmtNum(d.offerings)} course offerings`}
            />
            <section aria-label="Pending work" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <TaskTile to="/university/approvals" label="Entry approvals" value={p.entry_approvals} hint="recommended by colleges" />
              <TaskTile to="/university/leaving" label="Migration certificates" value={p.leaving_approvals} hint="students leaving" />
              <TaskTile to="/university/colleges" label="College registrations" value={p.college_registrations} hint="awaiting approval" />
              <TaskTile to="/university/courses" label="Course requests" value={p.course_offering_requests} hint="from colleges" />
              <TaskTile to="/university/appeals" label="Appeals" value={p.appeals} />
              <TaskTile label="Escalated NOCs" value={p.escalated_nocs} hint="colleges past 7 days" warn={p.escalated_nocs > 0} />
              <TaskTile to="/university/team" label="Access requests" value={p.access_requests} />
              <TaskTile label="Seats across colleges" value={fmtNum(d.vacancies.seats)} hint={`${fmtNum(d.vacancies.available)} free · ${fmtNum(d.vacancies.blocked)} offered · ${fmtNum(d.vacancies.filled)} filled`} />
            </section>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <StatusCounts title="Students coming in" counts={d.incoming_by_status} />
              <StatusCounts title="Students going out" counts={d.outgoing_by_status} />
            </div>
          </>
        );
      }}
    </Async>
  );
}
