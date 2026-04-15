import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function DesignationEdit({ authUser = {}, designationId }) {
    const dialog = useClassicDialog();
    const [form, setForm] = useState({ designation: '', description: '', status: '1' });
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/designations/${designationId}`);
                if (c) return;
                const r = data.data;
                setForm({
                    designation: r.designation || '',
                    description: r.description || '',
                    status: String(r.status ?? 1),
                });
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load designation.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [designationId]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.designation.trim()) {
            dialog.toast('Designation is required.', 'error');
            return;
        }
        setSaving(true);
        try {
            await axios.put(`/api/mwadmin/designations/${designationId}`, form);
            dialog.toast('Designation updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/designation'), 1500);
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to update designation.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (load) {
        return (
            <MwadminLayout authUser={authUser} activeMenu="designation">
                <div className="mwadmin-category-classic mwadmin-panel">Loading...</div>
            </MwadminLayout>
        );
    }

    return (
        <>
            <Head title="Edit Designation" />
            <MwadminLayout authUser={authUser} activeMenu="designation">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Designation</span>{' '}
                        <span className="sep">›</span> <strong>Edit</strong>
                        <Link href="/mwadmin/designation" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit Designation</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <form onSubmit={onSubmit} className="mwadmin-form-grid">
                            <div>
                                <label>Designation *</label>
                                <input
                                    value={form.designation}
                                    maxLength={80}
                                    onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="1">Active</option>
                                    <option value="0">In-Active</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Description</label>
                                <textarea
                                    className="mwadmin-textarea"
                                    rows={4}
                                    maxLength={80}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Update'}
                                </button>
                                <Link href="/mwadmin/designation">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
