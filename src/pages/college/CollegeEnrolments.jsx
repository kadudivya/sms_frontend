import { useState } from 'react';
import { students } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { Async, Card, Empty, PageHeader, ReasonModal, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useAction, useApi } from '../../lib/useApi';

export default function CollegeEnrolments() {
  const { membership } = useAuth();
  const state = useApi(() => students.enrolmentQueue({ college_id: membership?.institution_id }), [membership?.institution_id]);
  const { run, busy, error } = useAction();
  const [rejecting, setRejecting] = useState(null);
  const [done, setDone] = useState({});

  const decide = (s, approve, reason) => run(async () => {
    await students.decideEnrolment(s.id, approve, reason);
    setDone((d) => ({ ...d, [s.id]: approve ? 'Confirmed' : 'Rejected' }));
    setRejecting(null);
  }).catch(() => {});

  return (
    <>
      <PageHeader title="Enrolment checks" subtitle="Confirm that these students study here before they can send a migration request." />
      <Card>
        <Async state={state} empty={<Empty title="No students waiting">New registrations appear here.</Empty>}>
          {(rows) => (
            <Table
              rows={rows}
              columns={[
                { key: 'name', header: 'Student', render: (s) => <><strong>{s.student_name}</strong><br /><span className="text-sm muted">{s.email}</span></> },
                { key: 'enr', header: 'Enrolment no.', render: (s) => s.enrolment_number },
                { key: 'course', header: 'Course', render: (s) => `${s.current_course_name} · sem ${s.current_semester}` },
                { key: 'batch', header: 'Batch', render: (s) => s.batch_year },
                { key: 'abc', header: 'ABC ID', render: (s) => s.abc_account_id || '—' },
                { key: 'at', header: 'Submitted', render: (s) => fmtDate(s.updated_at) },
                {
                  key: 'act', header: <span className="sr-only">Actions</span>,
                  render: (s) => done[s.id] ? <strong className="text-sm">{done[s.id]}</strong> : (
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary" disabled={busy} onClick={() => decide(s, true)}>Confirm</button>
                      <button type="button" className="btn-danger" disabled={busy} onClick={() => setRejecting(s)}>Reject</button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Async>
      </Card>
      {rejecting && (
        <ReasonModal title={`Reject ${rejecting.student_name}'s enrolment`} cta="Reject" danger busy={busy} error={error}
          onClose={() => setRejecting(null)} onConfirm={(reason) => decide(rejecting, false, reason)} />
      )}
    </>
  );
}
