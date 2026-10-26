import { useEffect, useState } from 'react';
import { master } from '../api/endpoints';
import { Field } from './ui';

// Manual institution details, used when an AISHE code is not in the master data.
export default function InstitutionDetails({ value, onChange, errors = {} }) {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });

  useEffect(() => { master.states().then((r) => setStates(r.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!value.state_id) { setDistricts([]); return; }
    master.districts(value.state_id).then((r) => setDistricts(r.data || [])).catch(() => setDistricts([]));
  }, [value.state_id]);

  return (
    <fieldset className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold">Institution details</legend>
      <div className="sm:col-span-2"><Field label="Institution name" error={errors.name}><input className="input" value={value.name || ''} onChange={set('name')} required /></Field></div>
      <Field label="State" error={errors.state_id}>
        <select className="input" value={value.state_id || ''} onChange={(e) => onChange({ ...value, state_id: e.target.value, district_id: '' })} required>
          <option value="">Select a state</option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="District" error={errors.district_id}>
        <select className="input" value={value.district_id || ''} onChange={set('district_id')} required disabled={!districts.length}>
          <option value="">Select a district</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2"><Field label="Address" error={errors.address_line}><input className="input" value={value.address_line || ''} onChange={set('address_line')} required /></Field></div>
      <Field label="City" error={errors.city}><input className="input" value={value.city || ''} onChange={set('city')} /></Field>
      <Field label="PIN code" error={errors.pincode}><input className="input" inputMode="numeric" maxLength={6} value={value.pincode || ''} onChange={set('pincode')} required /></Field>
      <Field label="Website" error={errors.website}><input className="input" value={value.website || ''} onChange={set('website')} /></Field>
      <Field label="Phone" error={errors.phone}><input className="input" value={value.phone || ''} onChange={set('phone')} /></Field>
    </fieldset>
  );
}

// Convert manual details (string ids from selects) for the API
export function cleanDetails(d) {
  const out = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== '' && v != null));
  if (out.state_id) out.state_id = Number(out.state_id);
  if (out.district_id) out.district_id = Number(out.district_id);
  return out;
}

// Build multipart body: objects are JSON-encoded (the backend decodes them)
export function toFormData(obj, file, fileField = 'authorization_letter') {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  if (file) fd.append(fileField, file);
  return fd;
}
