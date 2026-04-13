import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function SponsorCreate({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        sponsorcategory_id: '',
        organization_name: '',
        website: 'https://',
        contact_name: '',
        email: '',
        mobile: '',
        amount_sponsored: '0',
        start_date: '',
        end_date: '',
        status: '1',
        logo: null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/sponsorcategories', { params: { per_page: 'all' } });
                if (!c) {
                    const list = data.data || [];
                    setCategories(list.filter((row) => Number(row.status) === 1));
                }
            } catch {
                if (!c) setCategories([]);
            }
        })();
        return () => {
            c = true;
        };
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.sponsorcategory_id) {
            dialog.toast('Sponsor category is required.', 'error');
            return;
        }
        if (!form.organization_name.trim()) {
            dialog.toast('Organization name is required.', 'error');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'logo') {
                    if (v) fd.append('logo', v);
                    return;
                }
                if (v !== null && v !== '') fd.append(k, v);
            });
            await axios.post('/api/mwadmin/sponsors', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            dialog.toast('Sponsor created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/sponsor'), 1500);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to create sponsor.';
            dialog.toast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Create Sponsor" />
            <MwadminLayout authUser={authUser} activeMenu="sponsor">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor</span>{' '}
                        <span className="sep">›</span> <strong>Create</strong>
                        <Link href="/mwadmin/sponsor" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Add Sponsor</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <form onSubmit={onSubmit} className="mwadmin-form-grid">
                            <div>
                                <label>Sponsor Category *</label>
                                <select
                                    value={form.sponsorcategory_id}
                                    onChange={(e) => setForm((f) => ({ ...f, sponsorcategory_id: e.target.value }))}
                                >
                                    <option value="">— Select —</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Organization Name *</label>
                                <input
                                    value={form.organization_name}
                                    maxLength={250}
                                    onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Website *</label>
                                <input
                                    type="url"
                                    value={form.website}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Contact Name *</label>
                                <input
                                    value={form.contact_name}
                                    maxLength={200}
                                    onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    maxLength={250}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Mobile</label>
                                <input
                                    value={form.mobile}
                                    maxLength={14}
                                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Amount Sponsored *</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.amount_sponsored}
                                    onChange={(e) => setForm((f) => ({ ...f, amount_sponsored: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
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
                                <label>Logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, logo: e.target.files?.[0] || null }))
                                    }
                                />
                            </div>
                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Submit'}
                                </button>
                                <Link href="/mwadmin/sponsor">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
