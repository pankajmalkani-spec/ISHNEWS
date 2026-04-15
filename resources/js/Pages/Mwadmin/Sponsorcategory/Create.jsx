import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

const NAME_MAX = 50;
const NOTE_MAX = 1000;

function formatApiErrors(err) {
    const d = err?.response?.data;
    if (d?.errors && typeof d.errors === 'object') {
        const lines = Object.entries(d.errors).flatMap(([key, val]) => {
            const msgs = Array.isArray(val) ? val : [String(val)];
            return msgs.map((m) => `${key}: ${m}`);
        });
        return lines.join('\n');
    }
    if (typeof d?.message === 'string') return d.message;
    return err?.message || 'Unable to create sponsor category.';
}

export default function SponsorCategoryCreate({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [form, setForm] = useState({ name: '', note: '', status: '1' });
    const [saving, setSaving] = useState(false);

    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);

    const validateClient = () => {
        const name = form.name.trim();
        if (!name) {
            notify('Sponsor category name is required.');
            return false;
        }
        if (name.length > NAME_MAX) {
            notify(`Name must be at most ${NAME_MAX} characters.`);
            return false;
        }
        const note = form.note ?? '';
        if (note.length > NOTE_MAX) {
            notify(`Note(s) must be at most ${NOTE_MAX} characters.`);
            return false;
        }
        if (form.status !== '0' && form.status !== '1') {
            notify('Please choose Active or In-Active for status.');
            return false;
        }
        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!validateClient()) return;

        setSaving(true);
        try {
            await axios.post('/api/mwadmin/sponsorcategories', {
                name: form.name.trim(),
                note: form.note ?? '',
                status: form.status,
            });
            dialog.toast('Sponsor Category created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/sponsorcategory'), 1200);
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Create Sponsor Category" />
            <MwadminLayout authUser={authUser} activeMenu="sponsorcategory">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor Category</span>{' '}
                        <span className="sep">›</span> <strong>Create New Sponsor Category</strong>
                        <Link href="/mwadmin/sponsorcategory" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Create Sponsor Category</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <form onSubmit={onSubmit} className="mwadmin-form-grid" noValidate>
                            <div>
                                <label>Sponsor Category Name *</label>
                                <input
                                    value={form.name}
                                    maxLength={NAME_MAX}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Status</label>
                                <div className="mwadmin-category-status-row">
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                    >
                                        <option value="1">Active</option>
                                        <option value="0">In-Active</option>
                                    </select>
                                    <MwadminStatusBadge value={form.status === '1' ? 1 : 0} />
                                </div>
                            </div>
                            <div className="mwadmin-form-grid-full">
                                <label>Note(s)</label>
                                <textarea
                                    className="mwadmin-textarea"
                                    rows={5}
                                    value={form.note}
                                    maxLength={NOTE_MAX}
                                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                                />
                            </div>
                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Submit'}
                                </button>
                                <Link href="/mwadmin/sponsorcategory">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
