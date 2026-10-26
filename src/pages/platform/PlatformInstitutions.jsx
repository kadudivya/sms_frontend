import { useState } from 'react';
import { master } from '../../api/endpoints';
import { Async, Badge, Card, Empty, PageHeader, Pager, Table } from '../../components/ui';
import { humanize } from '../../lib/labels';
import { useApi } from '../../lib/useApi';
import { UniversityInviteModal } from './PlatformHome';

const TONE = { ACTIVE: 'green', PENDING: 'amber', MASTER: 'gray', SUSPENDED: 'red', REJECTED: 'red' };

export default function PlatformInstitutions() {
  // kind: which table to list. Colleges can be narrowed by their AISHE file type.
  const [draft, setDraft] = useState({ kind: 'college', q: '', institution_type: '', onboarding_status: '' });
  const [query, setQuery] = useState({ ...draft, page: 1 });
  const state = useApi(() => master.institutions(query), [JSON.stringify(query)]);
  const [modal, setModal] = useState(null);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Institutions"
        subtitle="Master data loaded from AISHE, plus institutions added by hand."
        actions={<><button type="button" className="btn-secondary" onClick={() => setModal('link')}>Send signup link</button><button type="button" className="btn" onClick={() => setModal('create')}>Create university</button></>}
      />
      <form className="card grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end" onSubmit={(e) => { e.preventDefault(); setQuery({ ...draft, institution_type: draft.kind === 'college' ? draft.institution_type : '', page: 1 }); }}>
        <label className="label">Show
          <select className="input" value={draft.kind} onChange={set('kind')}>
            <option value="college">Colleges and institutes</option><option value="university">Universities</option>
          </select>
        </label>
        <label className="label sm:col-span-2">Name or AISHE code<input className="input" value={draft.q} onChange={set('q')} /></label>
        <label className="label">Type
          <select className="input" value={draft.institution_type} onChange={set('institution_type')} disabled={draft.kind !== 'college'}>
            <option value="">All</option><option value="COLLEGE">College</option><option value="STANDALONE">Standalone</option>
            <option value="PM_VIDYALAXMI">PM Vidyalaxmi</option><option value="R&amp;D">R&amp;D institute</option>
          </select>
        </label>
        <label className="label">Onboarding
          <select className="input" value={draft.onboarding_status} onChange={set('onboarding_status')}>
            <option value="">All</option><option value="MASTER">Not onboarded</option><option value="PENDING">Pending</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        <button className="btn sm:col-span-5 sm:justify-self-end">Search</button>
      </form>
      <Card>
        <Async state={state} empty={<Empty title="No institutions match" />}>
          {(rows, meta) => (
            <>
              <Table
                rows={rows}
                columns={[
                  { key: 'aishe_code', header: 'AISHE', render: (i) => <strong>{i.aishe_code}</strong> },
                  { key: 'name', header: 'Name' },
                  { key: 'type', header: 'Type', render: (i) => (i.kind === 'UNIVERSITY' ? 'University' : i.institution_type === 'R&D' ? 'R&D institute' : humanize(i.institution_type)) },
                  { key: 'parent', header: 'Affiliated to', render: (i) => i.parent_name || '—' },
                  { key: 'loc', header: 'Location', render: (i) => [i.district_name, i.state_name].filter(Boolean).join(', ') || '—' },
                  { key: 'status', header: 'Onboarding', render: (i) => <Badge tone={TONE[i.onboarding_status]}>{i.onboarding_status === 'MASTER' ? 'Not onboarded' : humanize(i.onboarding_status)}</Badge> },
                ]}
              />
              <Pager meta={meta} onPage={(page) => setQuery({ ...query, page })} />
            </>
          )}
        </Async>
      </Card>
      {modal && <UniversityInviteModal mode={modal} onClose={() => setModal(null)} />}
    </>
  );
}
