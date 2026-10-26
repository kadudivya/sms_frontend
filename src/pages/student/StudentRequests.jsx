import { Link } from 'react-router-dom';
import { migration } from '../../api/endpoints';
import { Async, Card, Empty, PageHeader, StatusBadge, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useApi } from '../../lib/useApi';

export default function StudentRequests() {
  const state = useApi(() => migration.mine(), []);
  return (
    <>
      <PageHeader title="My requests" actions={<Link to="/student/search" className="btn">Start a new request</Link>} />
      <Card>
        <Async state={state} empty={<Empty title="No requests yet">Search for a course to start one.</Empty>}>
          {(rows) => (
            <Table
              rows={rows}
              columns={[
                { key: 'ref', header: 'Reference', render: (r) => <Link to={`/student/requests/${r.id}`} className="font-semibold">{r.reference_no}</Link> },
                { key: 'course', header: 'Course', render: (r) => r.course.name },
                { key: 'dest', header: 'College', render: (r) => r.destination_institution.name },
                { key: 'sem', header: 'Entry sem', render: (r) => r.entry_semester },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.request_status} /> },
                { key: 'updated', header: 'Updated', render: (r) => fmtDate(r.updated_at) },
              ]}
            />
          )}
        </Async>
      </Card>
    </>
  );
}
