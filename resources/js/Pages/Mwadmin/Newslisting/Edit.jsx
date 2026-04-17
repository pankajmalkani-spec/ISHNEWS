import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import MwadminTimeInput from '../../../Components/Mwadmin/MwadminTimeInput';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MWADMIN_NEWS_BANNER, MWADMIN_NEWS_COVER } from '../../../lib/mwadminImageEditorTargets';
import { dmyToIsoDate, isoDateToDmy } from '../Sponsor/sponsorDateFormat';

const MAX_NEWS_IMAGE_BYTES = 8 * 1024 * 1024;

const DRAFT_STATUS = ['Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold'];
const EDIT_STATUS = [...DRAFT_STATUS, 'Released', 'Booked'];

/** Legacy mwadmin/newslisting/edit/{id}/{step}: 1=P2D, 2=Checklist, 3=Text, 4=Multimedia, 5=Comments, 6=Reviews */
const LEGACY_EDIT_STEPS = [
    { id: 1, label: 'P2D Process' },
    { id: 2, label: 'P2D CheckList' },
    { id: 3, label: 'Text Article' },
    { id: 4, label: 'Multimedia' },
    { id: 5, label: 'Comments' },
    { id: 6, label: "Review's" },
];

function clampStep(n) {
    const x = Number(n);
    if (Number.isNaN(x)) return 1;
    return Math.min(6, Math.max(1, x));
}

export default function NewslistingEdit({ authUser = {}, newslistingId, initialStep = 1 }) {
    const dialog = useClassicDialog();
    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [newsSources, setNewsSources] = useState([]);
    const [load, setLoad] = useState(true);
    const [activeStep, setActiveStep] = useState(() => clampStep(initialStep));
    const [flowchartTemplateId, setFlowchartTemplateId] = useState(0);
    const [articleContent, setArticleContent] = useState('');
    const [savingArticle, setSavingArticle] = useState(false);

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
        due_date: '',
        p2d_date: '',
        completion_date: '',
        description: '',
        shared_folder: '',
        last_serialno: '1',
        p2d_caseno: '',
        featured_content: false,
        schedule_date: '',
        schedule_time: '',
        youtube_url_check: false,
        youtube_url: '',
        youtube_video_check: false,
        youtube_video: '',
        youtube_subtitles: '',
    });
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerSourceFile, setBannerSourceFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [coverSourceFile, setCoverSourceFile] = useState(null);
    const [bannerImgUrl, setBannerImgUrl] = useState('');
    const [coverImgUrl, setCoverImgUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [bannerPickUrl, setBannerPickUrl] = useState('');
    const [coverPickUrl, setCoverPickUrl] = useState('');
    const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
    const [coverEditorOpen, setCoverEditorOpen] = useState(false);

    useEffect(() => {
        setActiveStep(clampStep(initialStep));
    }, [initialStep]);

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

    const bannerDisplaySrc = bannerPickUrl || bannerImgUrl;
    const coverDisplaySrc = coverPickUrl || coverImgUrl;

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
            else setBannerSourceFile(null);
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
            else setCoverSourceFile(null);
        },
        [notify]
    );

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const [{ data: opts }, { data: row }] = await Promise.all([
                    axios.get('/api/mwadmin/newslistings/options'),
                    axios.get(`/api/mwadmin/newslistings/${newslistingId}`),
                ]);
                if (c) return;
                setCategories(opts.categories || []);
                setNewsSources(opts.news_sources || []);
                const d = row.data;
                const catId = String(d.category_id ?? '');
                const { data: sub } = await axios.get('/api/mwadmin/newslistings/options', {
                    params: { category_id: catId },
                });
                if (c) return;
                setSubcategories(sub.subcategories || []);
                setFlowchartTemplateId(Number(d.flowchart_templateid ?? 0) || 0);
                setArticleContent(d.article_content != null ? String(d.article_content) : '');
                setForm({
                    category_id: catId,
                    subcategory_id: String(d.subcategory_id ?? ''),
                    title: d.title ?? '',
                    seo_keyword: d.seo_keyword ?? '',
                    news_source: String(d.news_source ?? ''),
                    prepared_by: d.prepared_by ?? '',
                    authorized_by: d.authorized_by ?? '',
                    permalink: d.permalink ?? '',
                    status1: d.status1 ?? 'Pending',
                    due_date: d.due_date || '',
                    p2d_date: d.p2d_date || '',
                    completion_date: d.completion_date || '',
                    description: d.description ?? '',
                    shared_folder: d.shared_folder ?? '',
                    last_serialno: String(d.last_serialno ?? 1),
                    p2d_caseno: d.p2d_caseno ?? '',
                    featured_content: d.featured_content === '1' || d.featured_content === 1,
                    schedule_date: d.schedule_date || '',
                    schedule_time: d.schedule_time || '',
                    youtube_url_check: d.youtube_url_check === '1' || d.youtube_url_check === 1,
                    youtube_url: d.youtube_url != null ? String(d.youtube_url) : '',
                    youtube_video_check: d.youtube_video_check === '1' || d.youtube_video_check === 1,
                    youtube_video: d.youtube_video != null ? String(d.youtube_video) : '',
                    youtube_subtitles: d.youtube_subtitles != null ? String(d.youtube_subtitles) : '',
                });
                setBannerImgUrl(d.banner_img_url && String(d.banner_img_url).trim() ? String(d.banner_img_url) : '');
                setCoverImgUrl(d.cover_img_url && String(d.cover_img_url).trim() ? String(d.cover_img_url) : '');
                setBannerSourceFile(null);
                setCoverSourceFile(null);
            } catch {
                if (!c) dialog.toast('Unable to load content.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [newslistingId]);

    useEffect(() => {
        const cid = form.category_id;
        if (!cid || load) {
            return;
        }
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options', {
                    params: { category_id: cid },
                });
                if (!c) setSubcategories(data.subcategories || []);
            } catch {
                if (!c) setSubcategories([]);
            }
        })();
        return () => {
            c = true;
        };
    }, [form.category_id, load]);

    const goToStep = (stepId) => {
        const s = clampStep(stepId);
        router.visit(`/mwadmin/newslisting/${newslistingId}/edit/${s}`, { preserveScroll: true });
    };

    const appendCommonFields = (fd) => {
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
        fd.append('youtube_url_check', form.youtube_url_check ? '1' : '0');
        fd.append('youtube_url', form.youtube_url || '');
        fd.append('youtube_video_check', form.youtube_video_check ? '1' : '0');
        fd.append('youtube_video', form.youtube_video || '');
        fd.append('youtube_subtitles', form.youtube_subtitles || '');
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.category_id || !form.subcategory_id) {
            dialog.toast('Category and sub-category are required.', 'error');
            return;
        }
        if (!form.p2d_date || !form.due_date) {
            dialog.toast('P2D Date and Due Date are required (d-m-Y).', 'error');
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            appendCommonFields(fd);
            if (bannerFile) fd.append('banner_img', bannerFile);
            if (coverFile) fd.append('cover_img', coverFile);

            await axios.post(`/api/mwadmin/newslistings/${newslistingId}?_method=PUT`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const { data: refreshed } = await axios.get(`/api/mwadmin/newslistings/${newslistingId}`);
            const r = refreshed.data;
            setBannerImgUrl(r.banner_img_url && String(r.banner_img_url).trim() ? String(r.banner_img_url) : '');
            setCoverImgUrl(r.cover_img_url && String(r.cover_img_url).trim() ? String(r.cover_img_url) : '');
            setBannerFile(null);
            setCoverFile(null);
            setBannerSourceFile(null);
            setCoverSourceFile(null);
            setArticleContent(r.article_content != null ? String(r.article_content) : articleContent);
            dialog.toast('News content updated successfully.', 'success');
        } catch (err) {
            const d = err?.response?.data;
            if (d?.errors) {
                const first = Object.values(d.errors)[0]?.[0];
                dialog.toast(first || 'Validation failed.', 'error');
            } else {
                dialog.toast(d?.message || 'Unable to update content.', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const onSaveTextArticle = async (e) => {
        e.preventDefault();
        setSavingArticle(true);
        try {
            await axios.put(
                `/api/mwadmin/newslistings/${newslistingId}/text-article`,
                { article_content: articleContent },
                { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
            );
            dialog.toast('Text article saved.', 'success');
        } catch (err) {
            const d = err?.response?.data;
            dialog.toast(d?.message || 'Unable to save text article.', 'error');
        } finally {
            setSavingArticle(false);
        }
    };

    const releaseStatusReady = form.status1 === 'Ready';

    useEffect(() => {
        if (releaseStatusReady) return;
        setForm((f) => ({ ...f, schedule_date: '', schedule_time: '' }));
    }, [releaseStatusReady]);

    if (load) {
        return (
            <>
                <Head title="Edit News Content" />
                <MwadminLayout authUser={authUser} activeMenu="newslisting">
                    <div className="mwadmin-category-classic">
                        <p className="mwadmin-title">Loading…</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    return (
        <>
            <Head title="Edit News Content" />
            <MwadminLayout authUser={authUser} activeMenu="newslisting">
                <div className="mwadmin-category-classic mwadmin-news-create">
                    <div className="mwadmin-pagebar">
                        <span>Content</span> <span className="sep">›</span> <span>Manage Content</span>{' '}
                        <span className="sep">›</span> <strong>Edit</strong>
                        <Link href="/mwadmin/newslisting" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit News Content</h1>

                    <section className="mwadmin-panel mwadmin-form-panel">
                        <ul className="mwadmin-news-create-tabs" role="tablist">
                            {LEGACY_EDIT_STEPS.map((t) => {
                                const isActive = activeStep === t.id;
                                const isComments = t.id === 5;
                                return (
                                    <li
                                        key={t.id}
                                        role="tab"
                                        aria-selected={isActive}
                                        className={
                                            isActive ? 'active' : isComments ? 'disabled' : ''
                                        }
                                        title={
                                            isComments
                                                ? 'Comments tab is not used in legacy workflow.'
                                                : undefined
                                        }
                                    >
                                        {isComments ? (
                                            <span>{t.label}</span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="mwadmin-news-edit-tab-btn"
                                                onClick={() => goToStep(t.id)}
                                            >
                                                {t.label}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {activeStep === 1 && (
                            <form onSubmit={onSubmit} className="mwadmin-form-grid mwadmin-news-create-form">
                                <div>
                                    <label>Category *</label>
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
                                        <option value="">Select</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                                {c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Sub-Category *</label>
                                    <select
                                        value={form.subcategory_id}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, subcategory_id: e.target.value }))
                                        }
                                        required
                                        disabled={!form.category_id}
                                    >
                                        <option value="">Select</option>
                                        {subcategories.map((s) => (
                                            <option key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>P2D Case No. *</label>
                                    <input
                                        value={form.p2d_caseno}
                                        onChange={(e) => setForm((f) => ({ ...f, p2d_caseno: e.target.value }))}
                                        maxLength={50}
                                        style={{ textTransform: 'uppercase' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label>Serial No. *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={form.last_serialno}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, last_serialno: e.target.value }))
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label>
                                        P2D Date (<span className="mwadmin-label-hint">d-m-Y</span>) *
                                    </label>
                                    <DmyDateInput
                                        id="edit-p2d-date"
                                        density="compact"
                                        value={isoDateToDmy(form.p2d_date)}
                                        onChange={(dmy) => {
                                            const iso = dmyToIsoDate(dmy);
                                            setForm((f) => ({
                                                ...f,
                                                p2d_date: iso && iso !== 'INVALID' ? iso : '',
                                            }));
                                        }}
                                        placeholder="dd-mm-yyyy"
                                    />
                                </div>
                                <div>
                                    <label>
                                        Due Date (<span className="mwadmin-label-hint">d-m-Y</span>) *
                                    </label>
                                    <DmyDateInput
                                        id="edit-due-date"
                                        density="compact"
                                        value={isoDateToDmy(form.due_date)}
                                        onChange={(dmy) => {
                                            const iso = dmyToIsoDate(dmy);
                                            setForm((f) => ({
                                                ...f,
                                                due_date: iso && iso !== 'INVALID' ? iso : '',
                                            }));
                                        }}
                                        placeholder="dd-mm-yyyy"
                                    />
                                </div>
                                <div>
                                    <label>
                                        Completion Date (<span className="mwadmin-label-hint">d-m-Y</span>)
                                    </label>
                                    <DmyDateInput
                                        id="edit-completion-date"
                                        density="compact"
                                        value={isoDateToDmy(form.completion_date)}
                                        onChange={(dmy) => {
                                            const iso = dmyToIsoDate(dmy);
                                            setForm((f) => ({
                                                ...f,
                                                completion_date: iso && iso !== 'INVALID' ? iso : '',
                                            }));
                                        }}
                                        placeholder="dd-mm-yyyy"
                                    />
                                </div>
                                <div>
                                    <label>Status *</label>
                                    <select
                                        value={form.status1}
                                        onChange={(e) => setForm((f) => ({ ...f, status1: e.target.value }))}
                                    >
                                        {EDIT_STATUS.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div
                                    className={
                                        'mwadmin-news-create-release-row mwadmin-news-create-release-group ' +
                                        (releaseStatusReady
                                            ? 'mwadmin-news-create-release-group--ready'
                                            : 'mwadmin-news-create-release-group--muted')
                                    }
                                >
                                    <div>
                                        <label>
                                            Release date (<span className="mwadmin-label-hint">d-m-Y</span>)
                                        </label>
                                        <DmyDateInput
                                            id="edit-schedule-date"
                                            density="compact"
                                            value={isoDateToDmy(form.schedule_date)}
                                            onChange={(dmy) => {
                                                const iso = dmyToIsoDate(dmy);
                                                setForm((f) => ({
                                                    ...f,
                                                    schedule_date: iso && iso !== 'INVALID' ? iso : '',
                                                }));
                                            }}
                                            placeholder="dd-mm-yyyy"
                                            disabled={!releaseStatusReady}
                                        />
                                    </div>
                                    <div>
                                        <label>Release time (optional)</label>
                                        <MwadminTimeInput
                                            id="edit-schedule-time"
                                            density="compact"
                                            value={form.schedule_time}
                                            onChange={(hhmm) => setForm((f) => ({ ...f, schedule_time: hhmm }))}
                                            disabled={!releaseStatusReady}
                                        />
                                    </div>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Content title *</label>
                                    <input
                                        value={form.title}
                                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label>Permalink *</label>
                                    <input
                                        value={form.permalink}
                                        onChange={(e) => setForm((f) => ({ ...f, permalink: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label>SEO keyword *</label>
                                    <input
                                        value={form.seo_keyword}
                                        onChange={(e) => setForm((f) => ({ ...f, seo_keyword: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label>News source *</label>
                                    <select
                                        value={form.news_source}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, news_source: e.target.value }))
                                        }
                                        required
                                    >
                                        <option value="">Select</option>
                                        {newsSources.map((n) => (
                                            <option key={n.id} value={String(n.id)}>
                                                {n.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Shared folder</label>
                                    <input
                                        value={form.shared_folder}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, shared_folder: e.target.value }))
                                        }
                                    />
                                </div>
                                <div>
                                    <label>Prepared by *</label>
                                    <input
                                        value={form.prepared_by}
                                        maxLength={50}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, prepared_by: e.target.value }))
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label>Authorized by *</label>
                                    <input
                                        value={form.authorized_by}
                                        maxLength={100}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, authorized_by: e.target.value }))
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mwadmin-news-create-check">
                                        <input
                                            type="checkbox"
                                            checked={form.featured_content}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, featured_content: e.target.checked }))
                                            }
                                        />
                                        <span>Featured content</span>
                                    </label>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Short description</label>
                                    <textarea
                                        className="mwadmin-textarea"
                                        rows={4}
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, description: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mwadmin-news-edit-next-btn"
                                        onClick={() => goToStep(2)}
                                    >
                                        Next: P2D CheckList →
                                    </button>
                                    <Link href="/mwadmin/newslisting">Cancel</Link>
                                </div>
                            </form>
                        )}

                        {activeStep === 2 && (
                            <div className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">P2D CheckList</h2>
                                <p className="mwadmin-news-edit-step-intro">
                                    Legacy workflow: checklist rows come from the selected flowchart template and are
                                    tracked per activity. Flowchart template id for this content:{' '}
                                    <strong>{flowchartTemplateId || '— (not set)'}</strong>.
                                </p>
                                <p className="mwadmin-news-edit-step-intro">
                                    Full checklist grid (assignments, dates, status per activity) will match legacy once
                                    content-chart APIs are wired. Use the next tabs for Text Article and Multimedia.
                                </p>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(1)}>
                                        ← P2D Process
                                    </button>
                                    <button type="button" className="mwadmin-news-edit-next-btn" onClick={() => goToStep(3)}>
                                        Next: Text Article →
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeStep === 3 && (
                            <form onSubmit={onSaveTextArticle} className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">Text Article</h2>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label htmlFor="news-text-article-body">Article body</label>
                                    <textarea
                                        id="news-text-article-body"
                                        className="mwadmin-textarea"
                                        rows={16}
                                        value={articleContent}
                                        onChange={(e) => setArticleContent(e.target.value)}
                                        placeholder="Full article HTML or text (legacy textarticle.article_content)."
                                    />
                                </div>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(2)}>
                                        ← P2D CheckList
                                    </button>
                                    <button type="submit" disabled={savingArticle}>
                                        {savingArticle ? 'Saving…' : 'Save text article'}
                                    </button>
                                    <button type="button" className="mwadmin-news-edit-next-btn" onClick={() => goToStep(4)}>
                                        Next: Multimedia →
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeStep === 4 && (
                            <form onSubmit={onSubmit} className="mwadmin-form-grid mwadmin-news-create-form">
                                <h2 className="mwadmin-form-grid-full mwadmin-news-edit-step-title">Multimedia</h2>
                                <div className="mwadmin-form-grid-full mwadmin-category-images-row">
                                    <div className="mwadmin-category-image-block">
                                        <label>Banner Image</label>
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
                                                {bannerDisplaySrc ? (
                                                    <img src={bannerDisplaySrc} alt="" className="mwadmin-category-image-preview" />
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
                                        <label>Cover Image</label>
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
                                                {coverDisplaySrc ? (
                                                    <img src={coverDisplaySrc} alt="" className="mwadmin-category-image-preview" />
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
                                <div className="mwadmin-form-grid-full">
                                    <label className="mwadmin-news-create-check">
                                        <input
                                            type="checkbox"
                                            checked={form.youtube_url_check}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, youtube_url_check: e.target.checked }))
                                            }
                                        />
                                        <span>YouTube URL (use)</span>
                                    </label>
                                    <input
                                        value={form.youtube_url}
                                        onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                                        placeholder="Full URL for this link"
                                        disabled={!form.youtube_url_check}
                                    />
                                </div>
                                <div className="mwadmin-form-grid-full">
                                    <label className="mwadmin-news-create-check">
                                        <input
                                            type="checkbox"
                                            checked={form.youtube_video_check}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, youtube_video_check: e.target.checked }))
                                            }
                                        />
                                        <span>Uploaded video file (use)</span>
                                    </label>
                                    <input
                                        value={form.youtube_video}
                                        onChange={(e) => setForm((f) => ({ ...f, youtube_video: e.target.value }))}
                                        placeholder="Filename (legacy stores video file name)"
                                        disabled={!form.youtube_video_check}
                                    />
                                </div>
                                <div className="mwadmin-form-grid-full">
                                    <label>YouTube subtitles / notes</label>
                                    <textarea
                                        className="mwadmin-textarea"
                                        rows={3}
                                        value={form.youtube_subtitles}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, youtube_subtitles: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions mwadmin-form-grid-full">
                                    <button type="button" onClick={() => goToStep(3)}>
                                        ← Text Article
                                    </button>
                                    <button type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save multimedia'}
                                    </button>
                                    <button type="button" className="mwadmin-news-edit-next-btn" onClick={() => goToStep(6)}>
                                        Next: Reviews →
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeStep === 5 && (
                            <div className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">Comments</h2>
                                <p className="mwadmin-news-edit-step-intro">
                                    This tab is reserved in legacy but not used in the current workflow.
                                </p>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(4)}>
                                        ← Multimedia
                                    </button>
                                    <button type="button" className="mwadmin-news-edit-next-btn" onClick={() => goToStep(6)}>
                                        Next: Reviews →
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeStep === 6 && (
                            <div className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">Review&apos;s</h2>
                                <div className="mwadmin-news-review-summary">
                                    <p>
                                        <strong>Title:</strong> {form.title}
                                    </p>
                                    <p>
                                        <strong>Status:</strong> {form.status1}
                                    </p>
                                    <p>
                                        <strong>P2D case:</strong> {form.p2d_caseno}
                                    </p>
                                    <p>
                                        <strong>Permalink:</strong> {form.permalink}
                                    </p>
                                </div>
                                <p className="mwadmin-news-edit-step-intro">
                                    Detailed reviewer workflow (legacy reviewerfeedback) can be added here.
                                </p>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(4)}>
                                        ← Multimedia
                                    </button>
                                    <Link href="/mwadmin/newslisting">Back to listing</Link>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
                <MwadminImageEditorModal
                    open={bannerEditorOpen}
                    onClose={() => setBannerEditorOpen(false)}
                    title="Banner Image"
                    outputWidth={MWADMIN_NEWS_BANNER.w}
                    outputHeight={MWADMIN_NEWS_BANNER.h}
                    notify={notify}
                    initialImageFile={bannerSourceFile || bannerFile}
                    initialImageUrl={bannerSourceFile || bannerFile ? null : bannerDisplaySrc || null}
                    onApply={(file, meta) => setBannerFromFile(file, meta)}
                />
                <MwadminImageEditorModal
                    open={coverEditorOpen}
                    onClose={() => setCoverEditorOpen(false)}
                    title="Cover Image"
                    outputWidth={MWADMIN_NEWS_COVER.w}
                    outputHeight={MWADMIN_NEWS_COVER.h}
                    notify={notify}
                    initialImageFile={coverSourceFile || coverFile}
                    initialImageUrl={coverSourceFile || coverFile ? null : coverDisplaySrc || null}
                    onApply={(file, meta) => setCoverFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
