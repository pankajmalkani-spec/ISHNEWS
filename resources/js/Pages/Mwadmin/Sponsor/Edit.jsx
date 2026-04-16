import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { laravelErrorFirstLine } from '../../../lib/laravelApiError';
import { dmyToIsoDate, isoDateToDmy, normalizeWebsiteUrl, SPONSOR_LOGO_EXPORT } from './sponsorDateFormat';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

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
    });
    const [serverLogoUrl, setServerLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoSourceFile, setLogoSourceFile] = useState(null);
    const [logoBlobPreview, setLogoBlobPreview] = useState('');
    const [logoEditorOpen, setLogoEditorOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);

    useEffect(() => {
        return () => {
            if (logoBlobPreview.startsWith('blob:')) URL.revokeObjectURL(logoBlobPreview);
        };
    }, [logoBlobPreview]);

    const setLogoFromFile = useCallback(
        (file, meta = {}) => {
            const src = meta?.editorSourceFile;
            if (file.size > MAX_LOGO_BYTES) {
                notify(`Logo must be ${MAX_LOGO_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            if (src instanceof File && src.size > MAX_LOGO_BYTES) {
                notify(`Logo must be ${MAX_LOGO_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            setLogoFile(file);
            setLogoBlobPreview((prev) => {
                if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
            if (src instanceof File) setLogoSourceFile(src);
        },
        [notify]
    );

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
                    website: r.website || '',
                    contact_name: r.contact_name || '',
                    email: r.email || '',
                    mobile: r.mobile || '',
                    amount_sponsored: String(r.amount_sponsored ?? 0),
                    start_date: isoDateToDmy(r.start_date) || '',
                    end_date: isoDateToDmy(r.end_date) || '',
                    status: String(r.status ?? 1),
                });
                setServerLogoUrl(r.logo_url || '');
                setLogoFile(null);
                setLogoSourceFile(null);
                setLogoBlobPreview((prev) => {
                    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                    return '';
                });
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load sponsor.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [sponsorId, dialog]);

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
        if (!form.contact_name.trim()) {
            dialog.toast('Contact name is required.', 'error');
            return;
        }
        if (!form.website.trim()) {
            dialog.toast('Website is required.', 'error');
            return;
        }
        const startIso = dmyToIsoDate(form.start_date);
        const endIso = dmyToIsoDate(form.end_date);
        if (startIso === 'INVALID' || endIso === 'INVALID') {
            dialog.toast('Start and end dates must be valid (dd-mm-yyyy) or left blank.', 'error');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('sponsorcategory_id', form.sponsorcategory_id);
            fd.append('organization_name', form.organization_name);
            fd.append('website', normalizeWebsiteUrl(form.website));
            fd.append('contact_name', form.contact_name);
            if (form.email) fd.append('email', form.email);
            if (form.mobile) fd.append('mobile', form.mobile);
            fd.append('amount_sponsored', String(Math.max(0, parseInt(String(form.amount_sponsored), 10) || 0)));
            fd.append('status', form.status);
            fd.append('start_date', startIso || '');
            fd.append('end_date', endIso || '');
            if (logoFile) fd.append('logo', logoFile);
            fd.append('_method', 'PUT');

            await axios.post(`/api/mwadmin/sponsors/${sponsorId}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            dialog.toast('Sponsor updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/sponsor'), 1200);
        } catch (err) {
            dialog.toast(laravelErrorFirstLine(err, 'Unable to update sponsor.'), 'error');
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

    const logoDisplaySrc = logoBlobPreview || serverLogoUrl;

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
                                <label>Start Date (dd-mm-yyyy)</label>
                                <DmyDateInput
                                    value={form.start_date}
                                    onChange={(dmy) => setForm((f) => ({ ...f, start_date: dmy }))}
                                />
                            </div>
                            <div>
                                <label>End Date (dd-mm-yyyy)</label>
                                <DmyDateInput
                                    value={form.end_date}
                                    onChange={(dmy) => setForm((f) => ({ ...f, end_date: dmy }))}
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
                            <div className="mwadmin-form-grid-full mwadmin-user-profile-photo-row">
                                <div>
                                    <label>Logo</label>
                                    <p className="mwadmin-field-hint">
                                        Image size — {SPONSOR_LOGO_EXPORT.w}px × {SPONSOR_LOGO_EXPORT.h}px
                                    </p>
                                </div>
                                <div className="mwadmin-category-image-field">
                                    <div
                                        className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-sponsor-logo-preview mwadmin-category-image-preview-wrap--clickable mwadmin-user-profile-preview"
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open logo editor"
                                        onClick={() => setLogoEditorOpen(true)}
                                        onKeyDown={(ev) => {
                                            if (ev.key === 'Enter' || ev.key === ' ') {
                                                ev.preventDefault();
                                                setLogoEditorOpen(true);
                                            }
                                        }}
                                    >
                                        {logoDisplaySrc ? (
                                            <img src={logoDisplaySrc} alt="" className="mwadmin-category-image-preview" />
                                        ) : (
                                            <div className="mwadmin-category-image-placeholder-card">
                                                NO LOGO
                                                <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                <MwadminImageEditorModal
                    open={logoEditorOpen}
                    onClose={() => setLogoEditorOpen(false)}
                    title="Sponsor Logo"
                    outputWidth={SPONSOR_LOGO_EXPORT.w}
                    outputHeight={SPONSOR_LOGO_EXPORT.h}
                    notify={notify}
                    placeholderBlurb="SPONSOR LOGO GOES HERE"
                    initialImageFile={logoSourceFile || logoFile}
                    initialImageUrl={logoSourceFile || logoFile ? null : logoDisplaySrc || null}
                    onApply={(file, meta) => setLogoFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
