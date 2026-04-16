import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MWADMIN_AD_IMAGE } from '../../../lib/mwadminImageEditorTargets';
import { validateMwadminAdvertisementForm } from '../../../lib/mwadminAdvertisementFormValidate';
import { dmyToIsoDate, isoDateToDmy } from '../Sponsor/sponsorDateFormat';

const MAX_AD_IMAGE_BYTES = 5 * 1024 * 1024;

export default function AdvertisementEdit({ authUser = {}, advertisementId }) {
    const dialog = useClassicDialog();
    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);
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
    const [imgSourceFile, setImgSourceFile] = useState(null);
    const [imgBlobPreview, setImgBlobPreview] = useState('');
    const [imgEditorOpen, setImgEditorOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        return () => {
            if (imgBlobPreview.startsWith('blob:')) URL.revokeObjectURL(imgBlobPreview);
        };
    }, [imgBlobPreview]);

    const setImageFromFile = useCallback(
        (file, meta = {}) => {
            const src = meta?.editorSourceFile;
            if (file.size > MAX_AD_IMAGE_BYTES) {
                notify(`Image must be ${MAX_AD_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            if (src instanceof File && src.size > MAX_AD_IMAGE_BYTES) {
                notify(`Image must be ${MAX_AD_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            setForm((f) => ({ ...f, img: file }));
            setImgBlobPreview((prev) => {
                if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
            if (src instanceof File) setImgSourceFile(src);
        },
        [notify]
    );

    const imgDisplaySrc = imgBlobPreview || imageUrl;

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
                const adType = String(r.ad_type ?? 0);
                setForm({
                    title: r.title || '',
                    company_name: r.company_name || '',
                    contactperson_name: r.contactperson_name || '',
                    ad_url: r.ad_url || '',
                    email: r.email || '',
                    mobile: r.mobile ? String(r.mobile) : '',
                    brand: r.brand || '',
                    model: r.model || '',
                    ad_type: adType,
                    category_id: adType === '0' ? '' : r.category_id ? String(r.category_id) : '',
                    annual_rates: String(r.annual_rates ?? '0'),
                    start_date: isoDateToDmy(r.start_date),
                    end_date: isoDateToDmy(r.end_date),
                    status: String(r.status ?? 1),
                    img: null,
                });
                setImageUrl(r.image_url || '');
                setImgSourceFile(null);
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
        const err = validateMwadminAdvertisementForm(form);
        if (err) {
            dialog.toast(err, 'error');
            return;
        }
        setSaving(true);
        try {
            const startDateIso = dmyToIsoDate(form.start_date);
            const endDateIso = dmyToIsoDate(form.end_date);
            if (startDateIso === 'INVALID' || endDateIso === 'INVALID') {
                dialog.toast('Start and end dates must be valid (dd-mm-yyyy) or left blank.', 'error');
                setSaving(false);
                return;
            }
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
            if (startDateIso) fd.append('start_date', startDateIso);
            if (endDateIso) fd.append('end_date', endDateIso);
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
                                <label>Ad Type *</label>
                                <select
                                    value={form.ad_type}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setForm((f) => ({
                                            ...f,
                                            ad_type: v,
                                            category_id: v === '0' ? '' : f.category_id,
                                        }));
                                    }}
                                >
                                    <option value="0">Global</option>
                                    <option value="1">Specific Category</option>
                                </select>
                            </div>
                            <div>
                                <label>Category{form.ad_type === '1' ? ' *' : ''}</label>
                                <select
                                    value={form.category_id}
                                    disabled={form.ad_type !== '1'}
                                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                                >
                                    <option value="">{form.ad_type === '1' ? '— Select category —' : '— Not used for Global —'}</option>
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
                                <label>Start Date (dd-mm-yyyy)</label>
                                <DmyDateInput value={form.start_date} onChange={(dmy) => setForm((f) => ({ ...f, start_date: dmy }))} />
                            </div>
                            <div>
                                <label>End Date (dd-mm-yyyy)</label>
                                <DmyDateInput value={form.end_date} onChange={(dmy) => setForm((f) => ({ ...f, end_date: dmy }))} />
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
                                    <label>Image</label>
                                    <p className="mwadmin-field-hint">
                                        {MWADMIN_AD_IMAGE.w}px × {MWADMIN_AD_IMAGE.h}px — click to crop
                                    </p>
                                </div>
                                <div className="mwadmin-category-image-field">
                                    <div
                                        className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--clickable mwadmin-fixed-aspect-preview"
                                        style={{
                                            aspectRatio: `${MWADMIN_AD_IMAGE.w} / ${MWADMIN_AD_IMAGE.h}`,
                                            maxWidth: 560,
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Open image editor"
                                        onClick={() => setImgEditorOpen(true)}
                                        onKeyDown={(ev) => {
                                            if (ev.key === 'Enter' || ev.key === ' ') {
                                                ev.preventDefault();
                                                setImgEditorOpen(true);
                                            }
                                        }}
                                    >
                                        {imgDisplaySrc ? (
                                            <img src={imgDisplaySrc} alt="" className="mwadmin-category-image-preview" />
                                        ) : (
                                            <div className="mwadmin-category-image-placeholder-card">
                                                NO IMAGE
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
                                <Link href="/mwadmin/advertisement">Cancel</Link>
                            </div>
                        </form>
                    </section>
                </div>
                <MwadminImageEditorModal
                    open={imgEditorOpen}
                    onClose={() => setImgEditorOpen(false)}
                    title="Advertisement image"
                    outputWidth={MWADMIN_AD_IMAGE.w}
                    outputHeight={MWADMIN_AD_IMAGE.h}
                    notify={notify}
                    placeholderBlurb="AD IMAGE"
                    initialImageFile={imgSourceFile || form.img}
                    initialImageUrl={imgSourceFile || form.img ? null : imgDisplaySrc || null}
                    onApply={(file, meta) => setImageFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
