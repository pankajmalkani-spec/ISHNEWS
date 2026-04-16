import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MWADMIN_NEWS_BANNER, MWADMIN_NEWS_COVER } from '../../../lib/mwadminImageEditorTargets';

const MAX_NEWS_IMAGE_BYTES = 8 * 1024 * 1024;

const today = () => new Date().toISOString().slice(0, 10);

const DRAFT_STATUS = ['Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold'];

const TAB_DISABLED = [
    { id: 'checklist', label: 'P2D CheckList' },
    { id: 'text', label: 'Text Article' },
    { id: 'media', label: 'Multimedia' },
    { id: 'review', label: "Review's" },
];

function Req() {
    return <span className="mwadmin-required"> *</span>;
}

export default function NewslistingCreate({ authUser = {} }) {
    const dialog = useClassicDialog();
    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [newsSources, setNewsSources] = useState([]);
    const [form, setForm] = useState({
        category_id: '',
        subcategory_id: '',
        title: '',
        seo_keyword: '',
        news_source: '',
        prepared_by: '',
        authorized_by: '',
        permalink: '',
        status1: 'Pending',
        due_date: today(),
        p2d_date: today(),
        completion_date: '',
        description: '',
        shared_folder: '',
        last_serialno: '1',
        p2d_caseno: '',
        featured_content: false,
        schedule_date: '',
        schedule_time: '',
    });
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerSourceFile, setBannerSourceFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [coverSourceFile, setCoverSourceFile] = useState(null);
    const [bannerPickUrl, setBannerPickUrl] = useState('');
    const [coverPickUrl, setCoverPickUrl] = useState('');
    const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
    const [coverEditorOpen, setCoverEditorOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!bannerFile) {
            setBannerPickUrl('');
            return undefined;
        }
        const u = URL.createObjectURL(bannerFile);
        setBannerPickUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [bannerFile]);

    useEffect(() => {
        if (!coverFile) {
            setCoverPickUrl('');
            return undefined;
        }
        const u = URL.createObjectURL(coverFile);
        setCoverPickUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [coverFile]);

    const setBannerFromFile = useCallback(
        (file, meta = {}) => {
            const src = meta?.editorSourceFile;
            if (file.size > MAX_NEWS_IMAGE_BYTES) {
                notify(`Banner image must be ${MAX_NEWS_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            if (src instanceof File && src.size > MAX_NEWS_IMAGE_BYTES) {
                notify(`Banner image must be ${MAX_NEWS_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            setBannerFile(file);
            if (src instanceof File) setBannerSourceFile(src);
        },
        [notify]
    );

    const setCoverFromFile = useCallback(
        (file, meta = {}) => {
            const src = meta?.editorSourceFile;
            if (file.size > MAX_NEWS_IMAGE_BYTES) {
                notify(`Cover image must be ${MAX_NEWS_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            if (src instanceof File && src.size > MAX_NEWS_IMAGE_BYTES) {
                notify(`Cover image must be ${MAX_NEWS_IMAGE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            setCoverFile(file);
            if (src instanceof File) setCoverSourceFile(src);
        },
        [notify]
    );

    const titleOk = form.title.trim().length > 0;

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options');
                if (c) return;
                setCategories(data.categories || []);
                setNewsSources(data.news_sources || []);
                const sid = data.suggested_next_id ?? '';
                setForm((f) => ({ ...f, p2d_caseno: sid ? String(sid) : f.p2d_caseno }));
            } catch {
                dialog.toast('Unable to load form options.', 'error');
            }
        })();
        return () => {
            c = true;
        };
    }, []);

    useEffect(() => {
        const cid = form.category_id;
        if (!cid) {
            setSubcategories([]);
            return;
        }
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options', {
                    params: { category_id: cid },
                });
                if (c) return;
                setSubcategories(data.subcategories || []);
                const { data: meta } = await axios.get('/api/mwadmin/newslistings/next-meta', {
                    params: { category_id: cid },
                });
                if (c) return;
                setForm((f) => ({
                    ...f,
                    last_serialno: String(meta.last_serialno ?? 1),
                    p2d_caseno: meta.suggested_p2d_caseno ? String(meta.suggested_p2d_caseno) : f.p2d_caseno,
                }));
            } catch {
                if (!c) dialog.toast('Unable to load sub-categories.', 'error');
            }
        })();
        return () => {
            c = true;
        };
    }, [form.category_id]);

    const onAddMembersClick = () => {
        if (!titleOk) {
            dialog.toast('Please Enter News Title, to unlock Add Members button..', 'error');
            return;
        }
        dialog.toast(
            'After you save this content, open Edit to assign members (designation / user) in the full workflow.',
            'info'
        );
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.category_id || !form.subcategory_id) {
            dialog.toast('Category and sub-category are required.', 'error');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('category_id', form.category_id);
            fd.append('subcategory_id', form.subcategory_id);
            fd.append('title', form.title.trim());
            fd.append('seo_keyword', form.seo_keyword.trim());
            fd.append('news_source', form.news_source);
            fd.append('prepared_by', form.prepared_by.trim());
            fd.append('authorized_by', form.authorized_by.trim());
            fd.append('permalink', form.permalink.trim());
            fd.append('status1', form.status1);
            fd.append('due_date', form.due_date);
            fd.append('p2d_date', form.p2d_date);
            fd.append('last_serialno', form.last_serialno);
            fd.append('p2d_caseno', form.p2d_caseno.trim());
            if (form.description) fd.append('description', form.description);
            if (form.shared_folder) fd.append('shared_folder', form.shared_folder);
            if (form.completion_date) fd.append('completion_date', form.completion_date);
            if (form.featured_content) fd.append('featured_content', '1');
            if (form.schedule_date) {
                fd.append('schedule_date', form.schedule_date);
                fd.append('schedule_time', form.schedule_time || '00:00');
            }
            if (bannerFile) fd.append('banner_img', bannerFile);
            if (coverFile) fd.append('cover_img', coverFile);

            await axios.post('/api/mwadmin/newslistings', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            dialog.toast('News content created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/newslisting'), 1200);
        } catch (err) {
            const d = err?.response?.data;
            if (d?.errors) {
                const first = Object.values(d.errors)[0]?.[0];
                dialog.toast(first || 'Validation failed.', 'error');
            } else {
                dialog.toast(d?.message || 'Unable to create content.', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Create News Content" />
            <MwadminLayout authUser={authUser} activeMenu="newslisting">
                <div className="mwadmin-category-classic mwadmin-news-create">
                    <div className="mwadmin-pagebar">
                        <span>Content</span> <span className="sep">›</span> <span>Manage Content</span>{' '}
                        <span className="sep">›</span> <strong>Create</strong>
                        <Link href="/mwadmin/newslisting" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Add News Content</h1>

                    <section className="mwadmin-panel mwadmin-form-panel">
                        <ul className="mwadmin-news-create-tabs" role="tablist">
                            <li className="active" role="tab" aria-selected>
                                P2D Process
                            </li>
                            {TAB_DISABLED.map((t) => (
                                <li
                                    key={t.id}
                                    className="disabled"
                                    title="Available after P2D Process steps (legacy workflow)."
                                >
                                    {t.label}
                                </li>
                            ))}
                        </ul>

                        <form onSubmit={onSubmit} className="mwadmin-form-grid mwadmin-news-create-form">
                            <input type="hidden" name="last_serialno" value={form.last_serialno} readOnly />

                            <div>
                                <label>P2D Case No.</label>
                                <input
                                    value={form.p2d_caseno}
                                    readOnly
                                    className="mwadmin-input-readonly"
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>
                            <div>
                                <label>
                                    P2D Date (<span className="mwadmin-label-hint">d-m-Y</span>)<Req />
                                </label>
                                <input
                                    type="date"
                                    value={form.p2d_date}
                                    onChange={(e) => setForm((f) => ({ ...f, p2d_date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label>
                                    Release Date (<span className="mwadmin-label-hint">d-m-Y</span>)
                                </label>
                                <input
                                    type="date"
                                    value={form.schedule_date}
                                    onChange={(e) => setForm((f) => ({ ...f, schedule_date: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>
                                    Time (<span className="mwadmin-label-hint">Hrs:Min</span>)
                                </label>
                                <input
                                    type="time"
                                    value={form.schedule_time}
                                    onChange={(e) => setForm((f) => ({ ...f, schedule_time: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label>
                                    Status<Req />
                                </label>
                                <select
                                    value={form.status1}
                                    onChange={(e) => setForm((f) => ({ ...f, status1: e.target.value }))}
                                    required
                                >
                                    <option value="">Please Select</option>
                                    {DRAFT_STATUS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>
                                    Due Date (<span className="mwadmin-label-hint">d-m-Y</span>)<Req />
                                </label>
                                <input
                                    type="date"
                                    value={form.due_date}
                                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label>
                                    Completion Date (<span className="mwadmin-label-hint">d-m-Y</span>)
                                </label>
                                <input
                                    type="date"
                                    value={form.completion_date}
                                    onChange={(e) => setForm((f) => ({ ...f, completion_date: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label>
                                    Category<Req />
                                </label>
                                <select
                                    value={form.category_id}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            category_id: e.target.value,
                                            subcategory_id: '',
                                        }))
                                    }
                                    required
                                >
                                    <option value="">Please Select</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>
                                    Sub Category<Req />
                                </label>
                                <select
                                    value={form.subcategory_id}
                                    onChange={(e) => setForm((f) => ({ ...f, subcategory_id: e.target.value }))}
                                    required
                                    disabled={!form.category_id}
                                >
                                    <option value="">Please Select</option>
                                    {subcategories.map((s) => (
                                        <option key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>
                                    News Title<Req />
                                </label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label>
                                    Permalink URL Structure<Req />
                                </label>
                                <input
                                    value={form.permalink}
                                    onChange={(e) => setForm((f) => ({ ...f, permalink: e.target.value }))}
                                    required
                                    autoComplete="off"
                                />
                            </div>

                            <div>
                                <label>Summary</label>
                                <textarea
                                    className="mwadmin-textarea"
                                    rows={5}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder=""
                                />
                            </div>
                            <div className="mwadmin-news-create-aside">
                                <div>
                                    <label>
                                        SEO Keyword<Req />
                                    </label>
                                    <input
                                        value={form.seo_keyword}
                                        maxLength={50}
                                        onChange={(e) => setForm((f) => ({ ...f, seo_keyword: e.target.value }))}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="mwadmin-news-create-featured">
                                    <label>Featured Content</label>
                                    <label className="mwadmin-news-create-check">
                                        <input
                                            type="checkbox"
                                            checked={form.featured_content}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, featured_content: e.target.checked }))
                                            }
                                        />
                                        <span>Featured</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label>
                                    News Source<Req />
                                </label>
                                <select
                                    value={form.news_source}
                                    onChange={(e) => setForm((f) => ({ ...f, news_source: e.target.value }))}
                                    required
                                >
                                    <option value="">Please Select</option>
                                    {newsSources.map((n) => (
                                        <option key={n.id} value={String(n.id)}>
                                            {n.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Shared Folder</label>
                                <input
                                    value={form.shared_folder}
                                    onChange={(e) => setForm((f) => ({ ...f, shared_folder: e.target.value }))}
                                    autoComplete="off"
                                />
                            </div>

                            <div>
                                <label>
                                    Prepared By<Req />
                                </label>
                                <input
                                    value={form.prepared_by}
                                    maxLength={50}
                                    onChange={(e) => setForm((f) => ({ ...f, prepared_by: e.target.value }))}
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label>
                                    Authorized By<Req />
                                </label>
                                <input
                                    value={form.authorized_by}
                                    maxLength={100}
                                    onChange={(e) => setForm((f) => ({ ...f, authorized_by: e.target.value }))}
                                    required
                                    autoComplete="off"
                                />
                            </div>

                            <div className="mwadmin-form-grid-full mwadmin-category-images-row">
                                <div className="mwadmin-category-image-block">
                                    <label>Banner image</label>
                                    <p className="mwadmin-field-hint">
                                        {MWADMIN_NEWS_BANNER.w}px × {MWADMIN_NEWS_BANNER.h}px — click to crop
                                    </p>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--banner mwadmin-category-image-preview-wrap--clickable"
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Open banner editor"
                                            onClick={() => setBannerEditorOpen(true)}
                                            onKeyDown={(ev) => {
                                                if (ev.key === 'Enter' || ev.key === ' ') {
                                                    ev.preventDefault();
                                                    setBannerEditorOpen(true);
                                                }
                                            }}
                                        >
                                            {bannerPickUrl ? (
                                                <img src={bannerPickUrl} alt="" className="mwadmin-category-image-preview" />
                                            ) : (
                                                <div className="mwadmin-category-image-placeholder-card">
                                                    NO BANNER
                                                    <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mwadmin-category-image-block">
                                    <label>Cover image</label>
                                    <p className="mwadmin-field-hint">
                                        {MWADMIN_NEWS_COVER.w}px × {MWADMIN_NEWS_COVER.h}px — click to crop
                                    </p>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-category-image-preview-wrap--clickable"
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Open cover editor"
                                            onClick={() => setCoverEditorOpen(true)}
                                            onKeyDown={(ev) => {
                                                if (ev.key === 'Enter' || ev.key === ' ') {
                                                    ev.preventDefault();
                                                    setCoverEditorOpen(true);
                                                }
                                            }}
                                        >
                                            {coverPickUrl ? (
                                                <img src={coverPickUrl} alt="" className="mwadmin-category-image-preview" />
                                            ) : (
                                                <div className="mwadmin-category-image-placeholder-card">
                                                    NO COVER
                                                    <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mwadmin-news-members-block">
                                <button
                                    type="button"
                                    className="mwadmin-news-members-btn"
                                    onClick={onAddMembersClick}
                                >
                                    + Add Members Assigned
                                </button>
                                <div className="mwadmin-news-members-table-wrap">
                                    <table className="mwadmin-news-members-table">
                                        <thead>
                                            <tr>
                                                <th>Designation</th>
                                                <th>User</th>
                                                <th>Character / Instructions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colSpan={3} className="mwadmin-news-members-empty">
                                                    No members added yet. Enter a News Title to use Add Members, then
                                                    save and continue in Edit for the full assignment workflow.
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mwadmin-form-actions mwadmin-news-create-actions">
                                <button type="submit" className="mwadmin-news-create-submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Submit'}
                                </button>
                                <Link href="/mwadmin/newslisting" className="mwadmin-news-create-cancel">
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </section>
                </div>
                <MwadminImageEditorModal
                    open={bannerEditorOpen}
                    onClose={() => setBannerEditorOpen(false)}
                    title="News banner image"
                    outputWidth={MWADMIN_NEWS_BANNER.w}
                    outputHeight={MWADMIN_NEWS_BANNER.h}
                    notify={notify}
                    placeholderBlurb="BANNER IMAGE"
                    initialImageFile={bannerSourceFile || bannerFile}
                    initialImageUrl={bannerSourceFile || bannerFile ? null : bannerPickUrl || null}
                    onApply={(file, meta) => setBannerFromFile(file, meta)}
                />
                <MwadminImageEditorModal
                    open={coverEditorOpen}
                    onClose={() => setCoverEditorOpen(false)}
                    title="News cover image"
                    outputWidth={MWADMIN_NEWS_COVER.w}
                    outputHeight={MWADMIN_NEWS_COVER.h}
                    notify={notify}
                    placeholderBlurb="COVER IMAGE"
                    initialImageFile={coverSourceFile || coverFile}
                    initialImageUrl={coverSourceFile || coverFile ? null : coverPickUrl || null}
                    onApply={(file, meta) => setCoverFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
