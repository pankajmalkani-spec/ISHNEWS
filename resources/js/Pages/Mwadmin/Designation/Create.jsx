import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function DesignationCreate({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [form, setForm] = useState({ designation: '', description: '', status: '1' });
    const [saving, setSaving] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.designation.trim()) {
            dialog.toast('Designation is required.', 'error');
            return;
        }
        setSaving(true);
        try {
            await axios.post('/api/mwadmin/designations', form);
            dialog.toast('Designation created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/designation'), 1500);
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to create designation.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Create Designation" />
            <MwadminLayout authUser={authUser} activeMenu="designation">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Designation</span>{' '}
                        <span className="sep">›</span> <strong>Create</strong>
                        <Link href="/mwadmin/designation" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Add Designation</h1>
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
                                    {saving ? 'Saving...' : 'Submit'}
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
