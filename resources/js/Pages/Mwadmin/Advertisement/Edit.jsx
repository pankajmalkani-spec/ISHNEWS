import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function AdvertisementEdit({ authUser = {}, advertisementId }) {
    const dialog = useClassicDialog();
    const [subcategories, setSubcategories] = useState([]);
    const [form, setForm] = useState({
        title: '',
        company_name: '',
        contactperson_name: '',
        ad_url: '',
        email: '',
        mobile: '',
        brand: '',
        model: '',
        ad_type: '0',
        category_id: '',
        annual_rates: '0',
        start_date: '',
        end_date: '',
        status: '1',
        img: null,
    });
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const [{ data: opt }, { data: rowData }] = await Promise.all([
                    axios.get('/api/mwadmin/advertisements/options'),
                    axios.get(`/api/mwadmin/advertisements/${advertisementId}`),
                ]);
                if (c) return;
                setSubcategories(opt.subcategories || []);
                const r = rowData.data;
                setForm({
                    title: r.title || '',
                    company_name: r.company_name || '',
                    contactperson_name: r.contactperson_name || '',
                    ad_url: r.ad_url || '',
                    email: r.email || '',
                    mobile: r.mobile ? String(r.mobile) : '',
                    brand: r.brand || '',
                    model: r.model || '',
                    ad_type: String(r.ad_type ?? 0),
                    category_id: r.category_id ? String(r.category_id) : '',
                    annual_rates: String(r.annual_rates ?? '0'),
                    start_date: r.start_date || '',
                    end_date: r.end_date || '',
                    status: String(r.status ?? 1),
                    img: null,
                });
                setImageUrl(r.image_url || '');
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load advertisement.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [advertisementId]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('company_name', form.company_name);
            fd.append('contactperson_name', form.contactperson_name);
            fd.append('ad_url', form.ad_url);
            if (form.email) fd.append('email', form.email);
            if (form.mobile) fd.append('mobile', form.mobile);
            if (form.brand) fd.append('brand', form.brand);
            if (form.model) fd.append('model', form.model);
            fd.append('ad_type', form.ad_type);
            fd.append('category_id', form.category_id === '' ? '0' : form.category_id);
            fd.append('annual_rates', form.annual_rates);
            if (form.start_date) fd.append('start_date', form.start_date);
            if (form.end_date) fd.append('end_date', form.end_date);
            fd.append('status', form.status);
            if (form.img) fd.append('img', form.img);

            await axios.post(`/api/mwadmin/advertisements/${advertisementId}?_method=PUT`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            dialog.toast('Advertisement updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/advertisement'), 1500);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to update advertisement.';
            dialog.toast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (load) {
        return (
            <>
                <Head title="Edit Advertisement" />
                <MwadminLayout authUser={authUser} activeMenu="advertisement">
                    <div className="mwadmin-category-classic">
                        <p>Loading...</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    return (
        <>
            <Head title="Edit Advertisement" />
            <MwadminLayout authUser={authUser} activeMenu="advertisement">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Advertisement</span>{' '}
                        <span className="sep">›</span> <strong>Edit</strong>
                        <Link href="/mwadmin/advertisement" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit Advertisement</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <form onSubmit={onSubmit} className="mwadmin-form-grid">
                            <div>
                                <label>Title *</label>
                                <input
                                    value={form.title}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Company Name *</label>
                                <input
                                    value={form.company_name}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Contact Person *</label>
                                <input
                                    value={form.contactperson_name}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, contactperson_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Ad URL *</label>
                                <input
                                    type="url"
                                    value={form.ad_url}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, ad_url: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Mobile</label>
                                <input
                                    value={form.mobile}
                                    maxLength={20}
                                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Brand</label>
                                <input
                                    value={form.brand}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Model</label>
                                <input
                                    value={form.model}
                                    maxLength={150}
                                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Ad Type</label>
                                <select
                                    value={form.ad_type}
                                    onChange={(e) => setForm((f) => ({ ...f, ad_type: e.target.value }))}
                                >
                                    <option value="0">Type 0</option>
                                    <option value="1">Type 1</option>
                                </select>
                            </div>
                            <div>
                                <label>Subcategory</label>
                                <select
                                    value={form.category_id}
                                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                                >
                                    <option value="">— None —</option>
                                    {subcategories.map((s) => (
                                        <option key={s.id} value={String(s.id)}>
                                            {s.subcat_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Annual Rates *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={form.annual_rates}
                                    onChange={(e) => setForm((f) => ({ ...f, annual_rates: e.target.value }))}
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
                                <label>Image</label>
                                {imageUrl ? (
                                    <p>
                                        <img src={imageUrl} alt="" style={{ maxHeight: 48, verticalAlign: 'middle' }} />{' '}
                                        <span className="mwadmin-muted">Current</span>
                                    </p>
                                ) : null}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setForm((f) => ({ ...f, img: e.target.files?.[0] || null }))}
                                />
                            </div>
                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Update'}
                                </button>
                                <Link href="/mwadmin/advertisement">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
