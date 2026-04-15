import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MwadminErrorBanner } from '../../../Components/Mwadmin/MwadminMotionFeedback';

const BANNER_OUT = { w: 1280, h: 360 };
const BOX_OUT = { w: 640, h: 640 };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
    return err?.message || 'Unable to update category.';
}

export default function CategoryEdit({ authUser = {}, categoryId }) {
    const dialog = useClassicDialog();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        code: '',
        title: '',
        color: '#ffffff',
        sort: '',
        status: '1',
    });
    const [bannerFile, setBannerFile] = useState(null);
    const [boxFile, setBoxFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState('');
    const [boxPreview, setBoxPreview] = useState('');
    const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
    const [boxEditorOpen, setBoxEditorOpen] = useState(false);

    const notify = useCallback(
        (message, title = 'Validation') => dialog.alert(message, title),
        [dialog]
    );

    useEffect(() => {
        return () => {
            if (bannerPreview.startsWith('blob:')) URL.revokeObjectURL(bannerPreview);
            if (boxPreview.startsWith('blob:')) URL.revokeObjectURL(boxPreview);
        };
    }, [bannerPreview, boxPreview]);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/categories/${categoryId}`);
                if (canceled) return;
                const item = data?.data || {};
                setForm({
                    code: item.code || '',
                    title: item.title || '',
                    color: item.color || '#ffffff',
                    sort: String(item.sort ?? ''),
                    status: String(item.status ?? '1'),
                });
                setBannerPreview(item.banner_img_url || '');
                setBoxPreview(item.box_img_url || '');
            } catch {
                if (!canceled) setError('Unable to load category.');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [categoryId]);

    const setBannerFromFile = (file) => {
        if (file.size > MAX_IMAGE_BYTES) {
            notify(`Banner image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`, 'Validation');
            return;
        }
        setBannerFile(file);
        setBannerPreview((prev) => {
            if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    };

    const setBoxFromFile = (file) => {
        if (file.size > MAX_IMAGE_BYTES) {
            notify(`Box image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`, 'Validation');
            return;
        }
        setBoxFile(file);
        setBoxPreview((prev) => {
            if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    };

    const validateClient = async () => {
        const code = form.code.trim();
        const title = form.title.trim();
        if (!code) {
            await notify('Category code is required.', 'Validation');
            return false;
        }
        if (code.length > 25) {
            await notify('Category code must be at most 25 characters.', 'Validation');
            return false;
        }
        if (!title) {
            await notify('Category title is required.', 'Validation');
            return false;
        }
        if (title.length > 250) {
            await notify('Category title must be at most 250 characters.', 'Validation');
            return false;
        }
        if (!/^[a-zA-Z\s]+$/.test(title)) {
            await notify('Category title may only contain letters and spaces.', 'Validation');
            return false;
        }
        if (!form.color || !/^#[0-9A-Fa-f]{6}$/.test(form.color)) {
            await notify('Please choose a valid color.', 'Validation');
            return false;
        }
        if (form.sort === '' || form.sort === null) {
            await notify('Sort order is required.', 'Validation');
            return false;
        }
        const sortNum = Number(form.sort);
        if (!Number.isInteger(sortNum) || sortNum < 0) {
            await notify('Sort must be a non-negative whole number.', 'Validation');
            return false;
        }
        if (form.status !== '0' && form.status !== '1') {
            await notify('Please choose Active or In-Active for status.', 'Validation');
            return false;
        }
        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!(await validateClient())) return;

        setSaving(true);
        try {
            const payload = new FormData();
            payload.append('code', form.code.trim().toUpperCase());
            payload.append('title', form.title.trim());
            payload.append('color', form.color);
            payload.append('sort', String(Number(form.sort)));
            payload.append('status', form.status);
            if (bannerFile) payload.append('banner_img', bannerFile);
            if (boxFile) payload.append('box_img', boxFile);

            /* POST + _method=PUT: some PHP/SAPI setups mishandle multipart bodies on real PUT. */
            payload.append('_method', 'PUT');
            await axios.post(`/api/mwadmin/categories/${categoryId}`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            await dialog.alertTimed('Category updated successfully.', 'Success', 2000);
            window.location.assign('/mwadmin/category');
        } catch (err) {
            await dialog.alert(formatApiErrors(err), 'Validation');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Edit Category" />
            <MwadminLayout authUser={authUser} activeMenu="category">
                <div className="mwadmin-pagebar">
                    <span>Administration</span> <span className="sep">›</span> <span>Category</span>{' '}
                    <span className="sep">›</span> <strong>Edit Category</strong>
                    <Link href="/mwadmin/category" className="mwadmin-back-btn">
                        Back
                    </Link>
                </div>
                <h1 className="mwadmin-title">Edit Category</h1>

                <section className="mwadmin-panel mwadmin-form-panel">
                    <MwadminErrorBanner message={error} />
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <form onSubmit={onSubmit} className="mwadmin-form-grid" noValidate>
                            <div>
                                <label>Category Code *</label>
                                <input
                                    value={form.code}
                                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                                />
                            </div>
                            <div>
                                <label>Category Title *</label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Color *</label>
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Sort *</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={form.sort}
                                    onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
                                />
                            </div>

                            <div className="mwadmin-form-grid-full mwadmin-category-images-row">
                                <div className="mwadmin-category-image-block">
                                    <label>Banner Image</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--banner mwadmin-category-image-preview-wrap--clickable"
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Open banner image editor"
                                            onClick={() => setBannerEditorOpen(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setBannerEditorOpen(true);
                                                }
                                            }}
                                        >
                                            {bannerPreview ? (
                                                <img src={bannerPreview} alt="" className="mwadmin-category-image-preview" />
                                            ) : (
                                                <div className="mwadmin-category-image-placeholder-card">
                                                    NO IMAGE AVAILABLE
                                                    <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mwadmin-category-image-block">
                                    <label>Box Image</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-category-image-preview-wrap--clickable"
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Open box image editor"
                                            onClick={() => setBoxEditorOpen(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setBoxEditorOpen(true);
                                                }
                                            }}
                                        >
                                            {boxPreview ? (
                                                <img src={boxPreview} alt="" className="mwadmin-category-image-preview" />
                                            ) : (
                                                <div className="mwadmin-category-image-placeholder-card">
                                                    NO IMAGE AVAILABLE
                                                    <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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

                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Update'}
                                </button>
                                <Link href="/mwadmin/category">Cancel</Link>
                            </div>
                        </form>
                    )}
                </section>

                <MwadminImageEditorModal
                    open={bannerEditorOpen}
                    onClose={() => setBannerEditorOpen(false)}
                    title="Banner Image"
                    outputWidth={BANNER_OUT.w}
                    outputHeight={BANNER_OUT.h}
                    notify={notify}
                    onApply={(file) => setBannerFromFile(file)}
                />
                <MwadminImageEditorModal
                    open={boxEditorOpen}
                    onClose={() => setBoxEditorOpen(false)}
                    title="Box Image"
                    outputWidth={BOX_OUT.w}
                    outputHeight={BOX_OUT.h}
                    notify={notify}
                    onApply={(file) => setBoxFromFile(file)}
                />
            </MwadminLayout>
        </>
    );
}
