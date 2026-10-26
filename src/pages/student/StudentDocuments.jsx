import { useState } from 'react';
import { documents } from '../../api/endpoints';
import { Async, Card, Empty, EnumBadge, ErrorNote, Field, PageHeader, Table } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { DOC_TYPES, VERIFICATION } from '../../lib/labels';
import { useAction, useApi } from '../../lib/useApi';

const PROFILE_TYPES = ['PHOTO', 'ID_PROOF', 'CLASS_10_MARKSHEET', 'CLASS_12_MARKSHEET', 'SEMESTER_MARKSHEET', 'ENROLMENT_PROOF',
  'ABC_CREDIT_STATEMENT', 'CATEGORY_CERTIFICATE', 'GAP_CERTIFICATE', 'ANTI_RAGGING_AFFIDAVIT'];

export default function StudentDocuments() {
  const state = useApi(() => documents.mine(), []);
  const [docType, setDocType] = useState(PROFILE_TYPES[0]);
  const [file, setFile] = useState(null);
  const { run, busy, error } = useAction();

  const upload = (e) => {
    e.preventDefault();
    const existing = (state.data || []).find((d) => d.doc_type === docType);
    run(async () => { await documents.uploadMine(docType, file, existing?.id); setFile(null); e.target.reset(); state.reload(); }).catch(() => {});
  };

  return (
    <>
      <PageHeader title="Documents" subtitle="Upload once and reuse them in every request. PDF, JPG or PNG up to 5 MB." />
      <form className="card flex flex-wrap items-end gap-4" onSubmit={upload}>
        <div className="min-w-[220px] flex-1">
          <Field label="Document type">
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {PROFILE_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPES[t]}</option>)}
            </select>
          </Field>
        </div>
        <div className="min-w-[220px] flex-1"><Field label="File"><input type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></Field></div>
        <button className="btn" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload'}</button>
        <div className="w-full"><ErrorNote error={error} /></div>
      </form>
      <Card>
        <Async state={state} empty={<Empty title="No documents yet" />}>
          {(rows) => (
            <Table
              rows={rows}
              columns={[
                { key: 'type', header: 'Document', render: (d) => DOC_TYPES[d.doc_type] || d.doc_type },
                { key: 'file', header: 'File', render: (d) => d.original_filename },
                { key: 'v', header: 'Version', render: (d) => `v${d.version_no}` },
                { key: 'at', header: 'Uploaded', render: (d) => fmtDate(d.created_at) },
                { key: 's', header: 'Status', render: (d) => <EnumBadge map={VERIFICATION} value={d.verification_status} /> },
              ]}
            />
          )}
        </Async>
      </Card>
    </>
  );
}
