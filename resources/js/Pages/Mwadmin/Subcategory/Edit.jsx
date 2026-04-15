import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MwadminFieldError } from '../../../Components/Mwadmin/MwadminMotionFeedback';

const BANNER_OUT = { w: 1280, h: 360 };
const BOX_OUT = { w: 640, h: 640 };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const NAME_RE = /^[a-zA-Z_.\s-]+$/;

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
    return err?.message || 'Unable to update sub-category.';
}

export default function SubcategoryEdit({ authUser = {}, subcategoryId }) {
    const dialog = useClassicDialog();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        subcat_code: '',
        name: '',
        category_id: '',
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
    const [sortError, setSortError] = useState('');
    const [saving, setSaving] = useState(false);

    const notify = useCallback(
        (message) => dialog.toast(message, 'error'),
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
                const [{ data: opts }, { data: one }] = await Promise.all([
                    axios.get('/api/mwadmin/subcategories/options'),
                    axios.get(`/api/mwadmin/subcategories/${subcategoryId}`),
                ]);
                if (canceled) return;
                const item = one.data || {};
                const optsList = opts.categories || [];
                const cid = String(item.category_id || '');
                const hasCat = optsList.some((c) => String(c.id) === cid);
                const mergedCats =
                    !hasCat && cid && item.category_title
                        ? [{ id: Number(cid), title: `${item.category_title} (inactive)` }, ...optsList]
                        : optsList;
                setCategories(mergedCats);
                setForm({
                    subcat_code: item.subcat_code || '',
                    name: item.name || '',
                    category_id: String(item.category_id || ''),
                    color: item.color || '#ffffff',
                    sort: String(item.sort ?? ''),
                    status: String(item.status ?? '1'),
                });
                setBannerPreview(item.banner_img_url || '');
                setBoxPreview(item.box_img_url || '');
            } catch (err) {
                if (!canceled) dialog.toast(err?.response?.data?.message || 'Unable to load sub-category.', 'error');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [subcategoryId, dialog]);

    const verifySort = async (value) => {
        setSortError('');
        if (value === '' || value === null || value === undefined) return;
        const { data } = await axios.get('/api/mwadmin/subcategories/verify-sort', {
            params: { sort: value, ignore_id: subcategoryId },
        });
        if (data?.exists) setSortError(data.message || 'Sort number already exists.');
    };

    const setBannerFromFile = (file) => {
        if (file.size > MAX_IMAGE_BYTES) {
            notify(`Banner image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
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
            notify(`Box image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
            return;
        }
        setBoxFile(file);
        setBoxPreview((prev) => {
            if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    };

    const validateClient = () => {
        const code = form.subcat_code.trim();
        const name = form.name.trim();
        if (!code) {
            notify('Sub category code is required.');
            return false;
        }
        if (code.length > 25) {
            notify('Sub category code must be at most 25 characters.');
            return false;
        }
        if (!name) {
            notify('Sub category name is required.');
            return false;
        }
        if (name.length > 250) {
            notify('Sub category name must be at most 250 characters.');
            return false;
        }
        if (!NAME_RE.test(name)) {
            notify('Sub category name may only contain letters, spaces, underscore, hyphen, and period.');
            return false;
        }
        if (!form.category_id) {
            notify('Please select a category.');
            return false;
        }
        if (!form.color || !/^#[0-9A-Fa-f]{6}$/.test(form.color)) {
            notify('Please choose a valid color.');
            return false;
        }
        if (form.sort === '' || form.sort === null) {
            notify('Sort order is required.');
            return false;
        }
        const sortNum = Number(form.sort);
        if (!Number.isInteger(sortNum) || sortNum < 0) {
            notify('Sort must be a non-negative whole number.');
            return false;
        }
        if (sortError) {
            notify(sortError);
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
            const payload = new FormData();
            payload.append('subcat_code', form.subcat_code.trim().toUpperCase());
            payload.append('name', form.name.trim());
            payload.append('category_id', form.category_id);
            payload.append('color', form.color);
            payload.append('sort', String(Number(form.sort)));
            payload.append('status', form.status);
            if (bannerFile) payload.append('banner_img', bannerFile);
            if (boxFile) payload.append('box_img', boxFile);

            payload.append('_method', 'PUT');
            await axios.post(`/api/mwadmin/subcategories/${subcategoryId}`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            dialog.toast('Sub-Category updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/subcategory'), 1200);
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Edit Sub-Category" />
            <MwadminLayout authUser={authUser} activeMenu="subcategory">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administration</span> <span className="sep">›</span> <span>Sub-Category</span>{' '}
                        <span className="sep">›</span> <strong>Edit Sub-Category</strong>
                        <Link href="/mwadmin/subcategory" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit Sub-Category</h1>

                    <section className="mwadmin-panel mwadmin-form-panel">
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <form onSubmit={onSubmit} className="mwadmin-form-grid" noValidate>
                                <div>
                                    <label>Sub Category Code *</label>
                                    <input
                                        value={form.subcat_code}
                                        onChange={(e) => setForm((f) => ({ ...f, subcat_code: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                                <div>
                                    <label>Sub Category Name *</label>
                                    <input
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>Category Title *</label>
                                    <select
                                        value={form.category_id}
                                        onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.title}
                                            </option>
                                        ))}
                                    </select>
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
                                        onBlur={(e) => verifySort(e.target.value)}
                                    />
                                    <MwadminFieldError message={sortError} />
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
                                    <Link href="/mwadmin/subcategory">Cancel</Link>
                                </div>
                            </form>
                        )}
                    </section>
                </div>

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
