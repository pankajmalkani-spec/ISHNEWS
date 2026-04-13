import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function SponsorEdit({ authUser = {}, sponsorId }) {
    const dialog = useClassicDialog();
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        sponsorcategory_id: '',
        organization_name: '',
        website: '',
        contact_name: '',
        email: '',
        mobile: '',
        amount_sponsored: '0',
        start_date: '',
        end_date: '',
        status: '1',
        logo: null,
    });
    const [logoUrl, setLogoUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const [{ data: catData }, { data: rowData }] = await Promise.all([
                    axios.get('/api/mwadmin/sponsorcategories', { params: { per_page: 'all' } }),
                    axios.get(`/api/mwadmin/sponsors/${sponsorId}`),
                ]);
                if (c) return;
                const all = catData.data || [];
                const r = rowData.data;
                const cid = String(r.sponsorcategory_id ?? '');
                const current = all.find((row) => String(row.id) === cid);
                const activeOnly = all.filter((row) => Number(row.status) === 1);
                let merged = activeOnly;
                if (current && Number(current.status) !== 1) {
                    merged = [
                        { ...current, name: `${current.name} (inactive)` },
                        ...activeOnly.filter((row) => String(row.id) !== cid),
                    ];
                }
                setCategories(merged);
                setForm({
                    sponsorcategory_id: String(r.sponsorcategory_id ?? ''),
                    organization_name: r.organization_name || '',
                    website: r.website || 'https://',
                    contact_name: r.contact_name || '',
                    email: r.email || '',
                    mobile: r.mobile || '',
                    amount_sponsored: String(r.amount_sponsored ?? 0),
                    start_date: r.start_date || '',
                    end_date: r.end_date || '',
                    status: String(r.status ?? 1),
                    logo: null,
                });
                setLogoUrl(r.logo_url || '');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [sponsorId]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.sponsorcategory_id) {
            dialog.toast('Sponsor category is required.', 'error');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('sponsorcategory_id', form.sponsorcategory_id);
            fd.append('organization_name', form.organization_name);
            fd.append('website', form.website);
            fd.append('contact_name', form.contact_name);
            if (form.email) fd.append('email', form.email);
            if (form.mobile) fd.append('mobile', form.mobile);
            fd.append('amount_sponsored', form.amount_sponsored);
            if (form.start_date) fd.append('start_date', form.start_date);
            if (form.end_date) fd.append('end_date', form.end_date);
            fd.append('status', form.status);
            if (form.logo) fd.append('logo', form.logo);

            await axios.post(`/api/mwadmin/sponsors/${sponsorId}?_method=PUT`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            dialog.toast('Sponsor updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/sponsor'), 1500);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to update sponsor.';
            dialog.toast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (load) {
        return (
            <>
                <Head title="Edit Sponsor" />
                <MwadminLayout authUser={authUser} activeMenu="sponsor">
                    <div className="mwadmin-category-classic">
                        <p>Loading...</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    return (
        <>
            <Head title="Edit Sponsor" />
            <MwadminLayout authUser={authUser} activeMenu="sponsor">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor</span>{' '}
                        <span className="sep">›</span> <strong>Edit</strong>
                        <Link href="/mwadmin/sponsor" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit Sponsor</h1>
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
                                {logoUrl ? (
                                    <p>
                                        <img src={logoUrl} alt="" style={{ maxHeight: 48, verticalAlign: 'middle' }} />{' '}
                                        <span className="mwadmin-muted">Current</span>
                                    </p>
                                ) : null}
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
                                    {saving ? 'Saving...' : 'Update'}
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
