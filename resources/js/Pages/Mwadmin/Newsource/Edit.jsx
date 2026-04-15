import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function NewsourceEdit({ authUser = {}, newsourceId }) {
    const dialog = useClassicDialog();
    const [form, setForm] = useState({ name: '', description: '', status: '1' });
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/newsources/${newsourceId}`);
                if (c) return;
                const r = data.data;
                setForm({
                    name: r.name || '',
                    description: r.description || '',
                    status: String(r.status ?? 1),
                });
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load news source.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [newsourceId]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            dialog.toast('News Source Name is required.', 'error');
            return;
        }
        setSaving(true);
        try {
            await axios.put(`/api/mwadmin/newsources/${newsourceId}`, form);
            dialog.toast('News Source updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/newsource'), 1500);
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to update news source.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (load) {
        return (
            <MwadminLayout authUser={authUser} activeMenu="newsource">
                <div className="mwadmin-category-classic mwadmin-panel">Loading...</div>
            </MwadminLayout>
        );
    }

    return (
        <>
            <Head title="Edit News Source" />
            <MwadminLayout authUser={authUser} activeMenu="newsource">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>News Source</span>{' '}
                        <span className="sep">›</span> <strong>Edit</strong>
                        <Link href="/mwadmin/newsource" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit News Source</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <form onSubmit={onSubmit} className="mwadmin-form-grid">
                            <div>
                                <label>News Source Name *</label>
                                <input
                                    value={form.name}
                                    maxLength={80}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                                <Link href="/mwadmin/newsource">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
