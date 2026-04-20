import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

// Legacy mwadmin category cropper exports square 220x220 for both banner and box.
const BANNER_OUT = { w: 220, h: 220 };
const BOX_OUT = { w: 220, h: 220 };
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
    return err?.message || 'Unable to create category.';
}

export default function CategoryCreate({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [form, setForm] = useState({
        code: '',
        title: '',
        color: '#ffffff',
        sort: '',
        status: '1',
    });
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerSourceFile, setBannerSourceFile] = useState(null);
    const [boxFile, setBoxFile] = useState(null);
    const [boxSourceFile, setBoxSourceFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState('');
    const [boxPreview, setBoxPreview] = useState('');
    const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
    const [boxEditorOpen, setBoxEditorOpen] = useState(false);
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

    const setBannerFromFile = (file, meta = {}) => {
        const src = meta?.editorSourceFile;
        if (file.size > MAX_IMAGE_BYTES) {
            notify(`Banner image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
            return;
        }
        if (src instanceof File && src.size > MAX_IMAGE_BYTES) {
            notify(`Banner image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
            return;
        }
        setBannerFile(file);
        setBannerPreview((prev) => {
            if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
        if (src instanceof File) setBannerSourceFile(src);
        else setBannerSourceFile(null);
    };

    const setBoxFromFile = (file, meta = {}) => {
        const src = meta?.editorSourceFile;
        if (file.size > MAX_IMAGE_BYTES) {
            notify(`Box image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
            return;
        }
        if (src instanceof File && src.size > MAX_IMAGE_BYTES) {
            notify(`Box image must be ${MAX_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
            return;
        }
        setBoxFile(file);
        setBoxPreview((prev) => {
            if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
        if (src instanceof File) setBoxSourceFile(src);
        else setBoxSourceFile(null);
    };

    const validateClient = async () => {
        const code = form.code.trim();
        const title = form.title.trim();
        if (!code) {
            notify('Category code is required.');
            return false;
        }
        if (code.length > 25) {
            notify('Category code must be at most 25 characters.');
            return false;
        }
        if (!title) {
            notify('Category title is required.');
            return false;
        }
        if (title.length > 250) {
            notify('Category title must be at most 250 characters.');
            return false;
        }
        if (!/^[a-zA-Z\s]+$/.test(title)) {
            notify('Category title may only contain letters and spaces.');
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
        if (form.status !== '0' && form.status !== '1') {
            notify('Please choose Active or In-Active for status.');
            return false;
        }
        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
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

            await axios.post('/api/mwadmin/categories', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            dialog.toast('Category created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/category'), 1200);
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Create Category" />
            <MwadminLayout authUser={authUser} activeMenu="category">
                <div className="mwadmin-pagebar">
                    <span>Administration</span> <span className="sep">›</span> <span>Category</span>{' '}
                    <span className="sep">›</span> <strong>Create New Category</strong>
                    <Link href="/mwadmin/category" className="mwadmin-back-btn">
                        Back
                    </Link>
                </div>
                <h1 className="mwadmin-title">Create Category</h1>

                <section className="mwadmin-panel mwadmin-form-panel">
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
                                        className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-category-image-preview-wrap--clickable"
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
                                {saving ? 'Saving...' : 'Submit'}
                            </button>
                            <Link href="/mwadmin/category">Cancel</Link>
                        </div>
                    </form>
                </section>

                <MwadminImageEditorModal
                    open={bannerEditorOpen}
                    onClose={() => setBannerEditorOpen(false)}
                    title="Banner Image"
                    outputWidth={BANNER_OUT.w}
                    outputHeight={BANNER_OUT.h}
                    notify={notify}
                    initialImageFile={bannerSourceFile || bannerFile}
                    initialImageUrl={bannerSourceFile || bannerFile ? null : bannerPreview || null}
                    onApply={(file, meta) => setBannerFromFile(file, meta)}
                />
                <MwadminImageEditorModal
                    open={boxEditorOpen}
                    onClose={() => setBoxEditorOpen(false)}
                    title="Box Image"
                    outputWidth={BOX_OUT.w}
                    outputHeight={BOX_OUT.h}
                    notify={notify}
                    initialImageFile={boxSourceFile || boxFile}
                    initialImageUrl={boxSourceFile || boxFile ? null : boxPreview || null}
                    onApply={(file, meta) => setBoxFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
