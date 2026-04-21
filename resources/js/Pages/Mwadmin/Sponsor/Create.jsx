import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { laravelErrorFirstLine } from '../../../lib/laravelApiError';
import { dmyToIsoDate, normalizeWebsiteUrl, SPONSOR_LOGO_EXPORT, SPONSOR_LOGO_SLOT_STYLE } from './sponsorDateFormat';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export default function SponsorCreate({ authUser = {} }) {
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
    const [logoFile, setLogoFile] = useState(null);
    /** Full-resolution file for re-opening the editor (saved export is small fixed dimensions). */
    const [logoSourceFile, setLogoSourceFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [logoEditorOpen, setLogoEditorOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);

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

    useEffect(() => {
        return () => {
            if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        };
    }, [logoPreview]);

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
            setLogoPreview((prev) => {
                if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
            if (src instanceof File) setLogoSourceFile(src);
            else setLogoSourceFile(null);
        },
        [notify]
    );

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
            if (startIso) fd.append('start_date', startIso);
            if (endIso) fd.append('end_date', endIso);
            if (logoFile) fd.append('logo', logoFile);

            await axios.post('/api/mwadmin/sponsors', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            dialog.toast('Sponsor created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/sponsor'), 1200);
        } catch (err) {
            dialog.toast(laravelErrorFirstLine(err, 'Unable to create sponsor.'), 'error');
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
                    <h1 className="mwadmin-title">Create Sponsor</h1>
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

                            <div className="mwadmin-form-grid-full mwadmin-category-images-row mwadmin-category-images-row--align-form">
                                <div className="mwadmin-category-image-block">
                                    <label>Sponsor Logo (196px × 160px)</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-sponsor-logo-preview mwadmin-category-image-preview-wrap--clickable"
                                            style={SPONSOR_LOGO_SLOT_STYLE}
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
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="" className="mwadmin-category-image-preview" />
                                            ) : (
                                                <div className="mwadmin-category-image-placeholder-card">
                                                    NO IMAGE AVAILABLE
                                                    <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        alignSelf: 'start',
                                        justifySelf: 'stretch',
                                        width: '100%',
                                        minWidth: 0,
                                    }}
                                >
                                    <label>Website *</label>
                                    <input
                                        type="url"
                                        value={form.website}
                                        maxLength={150}
                                        onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                                    />
                                </div>
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
                            <div aria-hidden="true" />
                            <div>
                                <label>Status *</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="1">Active</option>
                                    <option value="0">In-Active</option>
                                </select>
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
                <MwadminImageEditorModal
                    open={logoEditorOpen}
                    onClose={() => setLogoEditorOpen(false)}
                    title="Sponsor Logo"
                    outputWidth={SPONSOR_LOGO_EXPORT.w}
                    outputHeight={SPONSOR_LOGO_EXPORT.h}
                    notify={notify}
                    initialImageFile={logoSourceFile || logoFile}
                    initialImageUrl={logoSourceFile || logoFile ? null : logoPreview || null}
                    onApply={(file, meta) => setLogoFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
