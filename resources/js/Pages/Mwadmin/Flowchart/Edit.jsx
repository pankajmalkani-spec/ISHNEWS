import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { PLAN_OPTIONS } from './flowchartHelpers';

const mapActivity = (a) => ({
    plan: String(a.plan ?? ''),
    activity_name: a.activity_name || '',
    responsibility_id: a.responsibility_id ? String(a.responsibility_id) : '',
    sort: String(a.sort ?? 0),
});

export default function FlowchartEdit({ authUser = {}, flowchartId }) {
    const dialog = useClassicDialog();
    const [users, setUsers] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [form, setForm] = useState({
        name: '',
        description: '',
        defined_by: '',
        status: '1',
    });
    const [activities, setActivities] = useState([]);
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const [{ data: opt }, { data: rowData }] = await Promise.all([
                    axios.get('/api/mwadmin/flowcharts/options'),
                    axios.get(`/api/mwadmin/flowcharts/${flowchartId}`),
                ]);
                if (c) return;
                setDesignations(opt.designations || []);
                setUsers(opt.users || []);
                const r = rowData.data;
                setForm({
                    name: r.name || '',
                    description: r.description || '',
                    defined_by: String(r.defined_by ?? ''),
                    status: String(r.status ?? 1),
                });
                const acts = (r.activities || []).map(mapActivity);
                setActivities(acts.length ? acts : []);
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load flow chart.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [flowchartId]);

    const addRow = () => {
        const firstDes = designations[0]?.id;
        setActivities((a) => [
            ...a,
            {
                plan: '',
                activity_name: '',
                responsibility_id: firstDes ? String(firstDes) : '',
                sort: String(a.length + 1),
            },
        ]);
    };

    const removeRow = async (idx) => {
        const ok = await dialog.confirm(
            'Are you sure you want to remove Plan & its assigned Activity?',
            'Confirm!!'
        );
        if (!ok) return;
        setActivities((a) => a.filter((_, i) => i !== idx));
    };

    const patchActivity = (idx, patch) => {
        setActivities((a) => a.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.defined_by) {
            dialog.toast('Name and Defined By are required.', 'error');
            return;
        }
        if (activities.length < 1) {
            dialog.toast('Add at least one activity.', 'error');
            return;
        }
        const acts = activities.map((a, i) => ({
            plan: parseInt(a.plan, 10),
            activity_name: a.activity_name.trim(),
            responsibility_id: parseInt(a.responsibility_id, 10),
            sort: parseInt(a.sort, 10) || i + 1,
        }));
        if (acts.some((a) => !Number.isFinite(a.plan) || a.plan < 1 || a.plan > 3)) {
            dialog.toast('Each activity must have a plan selected.', 'error');
            return;
        }
        if (acts.some((a) => !a.activity_name || !Number.isFinite(a.responsibility_id))) {
            dialog.toast('Each activity needs a name and responsibility.', 'error');
            return;
        }
        setSaving(true);
        try {
            await axios.put(`/api/mwadmin/flowcharts/${flowchartId}`, {
                name: form.name.trim(),
                description: form.description || '',
                defined_by: parseInt(form.defined_by, 10),
                status: parseInt(form.status, 10),
                activities: acts,
            });
            dialog.toast('Flow chart updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/flowchart'), 1500);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to update flow chart.';
            dialog.toast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (load) {
        return (
            <>
                <Head title="Edit Flow Chart" />
                <MwadminLayout authUser={authUser} activeMenu="flowchart">
                    <div className="mwadmin-category-classic">
                        <p>Loading...</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    return (
        <>
            <Head title="Edit Flow Chart" />
            <MwadminLayout authUser={authUser} activeMenu="flowchart">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Flow Chart</span>{' '}
                        <span className="sep">›</span> <strong>Edit</strong>
                        <Link href="/mwadmin/flowchart" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit Flow Chart</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <form onSubmit={onSubmit}>
                            <div className="mwadmin-form-grid">
                                <div>
                                    <label>Flowchart name *</label>
                                    <input
                                        value={form.name}
                                        maxLength={200}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>Defined By *</label>
                                    <select
                                        value={form.defined_by}
                                        onChange={(e) => setForm((f) => ({ ...f, defined_by: e.target.value }))}
                                    >
                                        <option value="">— Select user —</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={String(u.id)}>
                                                {u.name?.trim() || u.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Status</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                    >
                                        <option value="1">Active</option>
                                        <option value="0">In Active</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Description</label>
                                    <textarea
                                        className="mwadmin-textarea"
                                        rows={3}
                                        maxLength={200}
                                        value={form.description}
                                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <h2 className="mwadmin-flowchart-activities-title">
                                Activities
                            </h2>
                            <div className="mwadmin-flowchart-activities-toolbar">
                                <button type="button" className="mwadmin-add-btn" onClick={addRow}>
                                    + Add an Activity
                                </button>
                            </div>
                            <div className="mwadmin-flowchart-table-wrap">
                                <table className="mwadmin-flowchart-table">
                                    <thead>
                                        <tr>
                                            <th>Plan *</th>
                                            <th>Activity *</th>
                                            <th>Responsibility *</th>
                                            <th>Sort</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="mwadmin-flowchart-empty">
                                                    Click &quot;Add an Activity&quot; to add rows.
                                                </td>
                                            </tr>
                                        ) : (
                                            activities.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="mwadmin-flowchart-cell-plan">
                                                        <select
                                                            value={row.plan}
                                                            onChange={(e) =>
                                                                patchActivity(idx, { plan: e.target.value })
                                                            }
                                                        >
                                                            <option value="">Choose Plan</option>
                                                            {PLAN_OPTIONS.map((p) => (
                                                                <option key={p.value} value={p.value}>
                                                                    {p.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="mwadmin-flowchart-cell-activity">
                                                        <input
                                                            value={row.activity_name}
                                                            maxLength={200}
                                                            onChange={(e) =>
                                                                patchActivity(idx, { activity_name: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td className="mwadmin-flowchart-cell-responsibility">
                                                        <select
                                                            value={row.responsibility_id}
                                                            onChange={(e) =>
                                                                patchActivity(idx, {
                                                                    responsibility_id: e.target.value,
                                                                })
                                                            }
                                                        >
                                                            <option value="">Choose Resp</option>
                                                            {designations.map((d) => (
                                                                <option key={d.id} value={String(d.id)}>
                                                                    {d.designation}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="mwadmin-flowchart-cell-sort">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={row.sort}
                                                            onChange={(e) =>
                                                                patchActivity(idx, { sort: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td className="mwadmin-flowchart-cell-remove">
                                                        <button
                                                            type="button"
                                                            className="mwadmin-flowchart-remove-btn"
                                                            title="Remove row"
                                                            onClick={() => removeRow(idx)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Update'}
                                </button>
                                <Link href="/mwadmin/flowchart">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
