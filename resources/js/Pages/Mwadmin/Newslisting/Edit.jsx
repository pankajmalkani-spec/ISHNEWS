import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminVideoUploadModal from '../../../Components/Mwadmin/MwadminVideoUploadModal';
import CkeEditor4 from '../../../Components/Mwadmin/CkeEditor4';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import MwadminTimeInput from '../../../Components/Mwadmin/MwadminTimeInput';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MWADMIN_NEWS_BANNER, MWADMIN_NEWS_COVER } from '../../../lib/mwadminImageEditorTargets';
import { dmyToIsoDate, isoDateToDmy } from '../Sponsor/sponsorDateFormat';

const MAX_NEWS_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_NEWS_VIDEO_BYTES = 500 * 1024 * 1024;

const DRAFT_STATUS = ['Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold'];
const EDIT_STATUS = [...DRAFT_STATUS, 'Released', 'Booked'];

/** Legacy mwadmin/newslisting/edit/{id}/{step}: 1=P2D, 2=Checklist, 3=Text, 4=Multimedia, 5=Reviews */
const LEGACY_EDIT_STEPS = [
    { id: 1, label: 'P2D Process' },
    { id: 2, label: 'P2D CheckList' },
    { id: 3, label: 'Text Article' },
    { id: 4, label: 'Multimedia' },
    { id: 5, label: 'Reviews' },
];

const CHECKLIST_STATUS_OPTS = [
    { id: 1, label: 'Pending' },
    { id: 2, label: 'WIP' },
    { id: 3, label: 'Done' },
    { id: 4, label: 'Issue' },
    { id: 5, label: 'NA' },
];

const PLAN_OPTS = [
    { id: 1, label: 'Pre Production' },
    { id: 2, label: 'Production' },
    { id: 3, label: 'Post Production' },
];

function youtubeEmbedSrc(url) {
    if (!url || !String(url).trim()) return null;
    const u = String(url).trim();
    const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function moduleAllowEdit(modules, key) {
    return Number(modules?.[key]?.allow_edit) > 0;
}

/** Legacy edit.php: sub-module allow_edit per tab (p2dprocess … review). */
function canEditNewslistingStep(isSuper, modules, stepId) {
    if (isSuper) {
        return true;
    }
    const m = modules ?? {};
    if (stepId === 1) {
        return moduleAllowEdit(m, 'p2dprocess');
    }
    if (stepId === 2) {
        return moduleAllowEdit(m, 'p2dchecklist');
    }
    if (stepId === 3) {
        return moduleAllowEdit(m, 'texteditor');
    }
    if (stepId === 4) {
        return moduleAllowEdit(m, 'multimedia');
    }
    if (stepId === 5) {
        return moduleAllowEdit(m, 'review');
    }
    return false;
}

function tabItemClassLegacy(isSuper, activeStep, modules, stepId) {
    const can = canEditNewslistingStep(isSuper, modules, stepId);
    if (!can) {
        return 'disabled';
    }
    return activeStep === stepId ? 'active' : '';
}

function tabTitleLegacy(isSuper, modules, stepId) {
    if (isSuper) {
        return undefined;
    }
    return canEditNewslistingStep(false, modules, stepId) ? undefined : 'You have no authorization';
}

function clampStep(n) {
    const x = Number(n);
    if (Number.isNaN(x)) return 1;
    return Math.min(5, Math.max(1, x));
}

export default function NewslistingEdit({
    authUser = {},
    newslistingId,
    initialStep = 1,
    /** `create`: opened from `/newslisting/create/{id}/{step}` after P2D save (Add flow). */
    pageVariant = 'edit',
}) {
    const dialog = useClassicDialog();
    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [newsSources, setNewsSources] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [load, setLoad] = useState(true);
    const [activeStep, setActiveStep] = useState(() => clampStep(initialStep));
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
    const [videoFile, setVideoFile] = useState(null);
    const [videoServerUrl, setVideoServerUrl] = useState('');
    const [videoPickUrl, setVideoPickUrl] = useState('');
    const [videoEditorOpen, setVideoEditorOpen] = useState(false);

    const [checklistTemplates, setChecklistTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [checklistRows, setChecklistRows] = useState([]);
    const [checklistPreviewLoading, setChecklistPreviewLoading] = useState(false);
    const [savingChecklist, setSavingChecklist] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    const [reviewItems, setReviewItems] = useState([]);
    const [reviewText, setReviewText] = useState('');
    const [savingReview, setSavingReview] = useState(false);

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

    useEffect(() => {
        if (!videoFile) {
            setVideoPickUrl('');
            return undefined;
        }
        const u = URL.createObjectURL(videoFile);
        setVideoPickUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [videoFile]);

    const bannerDisplaySrc = bannerPickUrl || bannerImgUrl;
    const coverDisplaySrc = coverPickUrl || coverImgUrl;
    const videoDisplaySrc = videoPickUrl || videoServerUrl;

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
                const [{ data: opts }, { data: row }, { data: clBundle }, { data: revBody }] = await Promise.all([
                    axios.get('/api/mwadmin/newslistings/options'),
                    axios.get(`/api/mwadmin/newslistings/${newslistingId}`),
                    axios.get(`/api/mwadmin/newslistings/${newslistingId}/checklist`),
                    axios.get(`/api/mwadmin/newslistings/${newslistingId}/reviews`),
                ]);
                if (c) return;
                setCategories(opts.categories || []);
                setNewsSources(opts.news_sources || []);
                setDesignations(opts.designations || []);
                setAllUsers(opts.users || []);
                const d = row.data;
                const catId = String(d.category_id ?? '');
                const { data: sub } = await axios.get('/api/mwadmin/newslistings/options', {
                    params: { category_id: catId },
                });
                if (c) return;
                setSubcategories(sub.subcategories || []);
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
                setVideoFile(null);
                setVideoServerUrl(
                    d.youtube_video_url && String(d.youtube_video_url).trim() ? String(d.youtube_video_url) : ''
                );

                const cl = clBundle?.data ?? {};
                setChecklistTemplates(cl.templates || []);
                const ft = Number(cl.flowchart_templateid ?? 0) || 0;
                setSelectedTemplateId(ft > 0 ? String(ft) : '');
                setChecklistRows(
                    (cl.rows || []).map((r, i) => ({
                        _key: `saved-${r.id ?? i}`,
                        plan: Number(r.plan) || 1,
                        activity_name: r.activity_name ?? '',
                        responsibility_name: r.responsibility_name ?? '',
                        user_id: r.user_id ? String(r.user_id) : '',
                        activity_status: Number(r.activity_status) || 1,
                        remarks: r.remarks ?? '',
                        date: r.date || null,
                        time: r.time || '',
                        sort: r.sort ?? '',
                    }))
                );
                setReviewItems(Array.isArray(revBody?.data) ? revBody.data : []);
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
        if (!form.youtube_video_check) {
            setVideoFile(null);
        }
    }, [form.youtube_video_check]);

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
        if (pageVariant === 'create') {
            router.visit(`/mwadmin/newslisting/create/${newslistingId}/${s}`, { preserveScroll: true });
        } else {
            router.visit(`/mwadmin/newslisting/${newslistingId}/edit/${s}`, { preserveScroll: true });
        }
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
            if (videoFile) {
                fd.append('youtube_video_file', videoFile);
            }

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
            setVideoFile(null);
            setVideoServerUrl(
                r.youtube_video_url && String(r.youtube_video_url).trim() ? String(r.youtube_video_url) : ''
            );
            setForm((f) => ({
                ...f,
                youtube_video: r.youtube_video != null ? String(r.youtube_video) : '',
            }));
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

    const resolveDesignationId = (row) => {
        if (row.responsibility_id != null && row.responsibility_id !== '') {
            return String(row.responsibility_id);
        }
        const name = (row.responsibility_name || '').trim();
        if (!name) return '';
        const d = designations.find((x) => (x.designation || '').trim() === name);
        return d ? String(d.id) : '';
    };

    const usersForChecklistRow = (row) => {
        const rid = resolveDesignationId(row);
        if (!rid) return allUsers;
        return allUsers.filter((u) => String(u.designation ?? '') === rid);
    };

    const onLoadChecklistTemplate = async () => {
        if (!selectedTemplateId) {
            dialog.toast('Select a Flow Chart Template.', 'error');
            return;
        }
        setChecklistPreviewLoading(true);
        try {
            const { data } = await axios.post(`/api/mwadmin/newslistings/${newslistingId}/checklist/preview`, {
                template_id: parseInt(selectedTemplateId, 10),
            });
            const bp = data?.data?.blueprint || [];
            setChecklistRows(
                bp.map((b, i) => ({
                    _key: `bp-${Date.now()}-${i}`,
                    plan: b.plan,
                    activity_name: b.activity_name,
                    responsibility_name: b.responsibility_name,
                    responsibility_id: b.responsibility_id,
                    user_id: '',
                    activity_status: 1,
                    remarks: '',
                    date: null,
                    time: '',
                    sort: String(b.sort ?? i),
                }))
            );
            dialog.toast('Template loaded. Assign users and save.', 'success');
        } catch (err) {
            const d = err?.response?.data;
            dialog.toast(d?.message || 'Unable to load template.', 'error');
        } finally {
            setChecklistPreviewLoading(false);
        }
    };

    const onSaveChecklist = async (e) => {
        e.preventDefault();
        if (!selectedTemplateId) {
            dialog.toast('Select a Flow Chart Template.', 'error');
            return;
        }
        if (!checklistRows.length) {
            dialog.toast('Load a template or keep saved rows before saving.', 'error');
            return;
        }
        setSavingChecklist(true);
        try {
            await axios.put(`/api/mwadmin/newslistings/${newslistingId}/checklist`, {
                template_id: parseInt(selectedTemplateId, 10),
                rows: checklistRows.map((r) => ({
                    plan: r.plan,
                    activity_name: r.activity_name,
                    responsibility_name: r.responsibility_name,
                    user_id: r.user_id ? parseInt(r.user_id, 10) : null,
                    activity_status: r.activity_status,
                    remarks: r.remarks || '',
                    date: r.date || null,
                    time: r.time || '',
                    sort: r.sort != null ? String(r.sort) : '',
                })),
            });
            dialog.toast('P2D CheckList saved.', 'success');
        } catch (err) {
            const d = err?.response?.data;
            dialog.toast(d?.message || 'Unable to save checklist.', 'error');
        } finally {
            setSavingChecklist(false);
        }
    };

    const onSubmitReview = async (e) => {
        e.preventDefault();
        const t = reviewText.trim();
        if (!t) {
            dialog.toast('Enter review feedback.', 'error');
            return;
        }
        setSavingReview(true);
        try {
            await axios.post(`/api/mwadmin/newslistings/${newslistingId}/reviews`, { review: t });
            const { data: revBody } = await axios.get(`/api/mwadmin/newslistings/${newslistingId}/reviews`);
            setReviewItems(Array.isArray(revBody?.data) ? revBody.data : []);
            setReviewText('');
            dialog.toast('Review submitted.', 'success');
        } catch (err) {
            const d = err?.response?.data;
            dialog.toast(d?.message || 'Unable to submit review.', 'error');
        } finally {
            setSavingReview(false);
        }
    };

    const releaseStatusReady = form.status1 === 'Ready';

    useEffect(() => {
        if (releaseStatusReady) return;
        setForm((f) => ({ ...f, schedule_date: '', schedule_time: '' }));
    }, [releaseStatusReady]);

    const isSuper = !!authUser?.superaccess;
    const modules = authUser?.modules ?? {};
    const docTitle = pageVariant === 'create' ? 'Add News Content' : 'Edit News Content';
    const crumbLabel = pageVariant === 'create' ? 'Create' : 'Edit';

    if (load) {
        return (
            <>
                <Head title={docTitle} />
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
            <Head title={docTitle} />
            <MwadminLayout authUser={authUser} activeMenu="newslisting">
                <div className="mwadmin-category-classic mwadmin-news-create">
                    <div className="mwadmin-pagebar">
                        <span>Content</span> <span className="sep">›</span> <span>Manage Content</span>{' '}
                        <span className="sep">›</span> <strong>{crumbLabel}</strong>
                        <Link href="/mwadmin/newslisting" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">{docTitle}</h1>

                    <section className="mwadmin-panel mwadmin-form-panel mwadmin-news-wizard">
                        <ul className="mwadmin-news-wizard-tabs" role="tablist">
                            {LEGACY_EDIT_STEPS.map((t) => {
                                const liClass = tabItemClassLegacy(isSuper, activeStep, modules, t.id);
                                const title = tabTitleLegacy(isSuper, modules, t.id);
                                const canTab = canEditNewslistingStep(isSuper, modules, t.id);
                                const isActive = liClass === 'active';
                                return (
                                    <li
                                        key={t.id}
                                        role="tab"
                                        aria-selected={isActive}
                                        className={liClass}
                                        title={title}
                                    >
                                        {canTab ? (
                                            <button
                                                type="button"
                                                className="mwadmin-news-edit-tab-btn"
                                                onClick={() => goToStep(t.id)}
                                            >
                                                {t.label}
                                            </button>
                                        ) : (
                                            <span className="mwadmin-news-edit-tab-label">{t.label}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mwadmin-news-wizard-body">
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
                                        {saving ? 'Saving...' : pageVariant === 'create' ? 'Save' : 'Update'}
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
                            <form onSubmit={onSaveChecklist} className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">P2D CheckList</h2>
                                <div className="mwadmin-news-checklist-template-row">
                                    <div>
                                        <label>
                                            Flow Chart Template <span className="mwadmin-required">*</span>
                                        </label>
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                                        >
                                            <option value="">Please select</option>
                                            {checklistTemplates.map((t) => (
                                                <option key={t.id} value={String(t.id)}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mwadmin-news-checklist-load">
                                        <button
                                            type="button"
                                            className="mwadmin-news-checklist-load-btn"
                                            disabled={checklistPreviewLoading || !selectedTemplateId}
                                            onClick={onLoadChecklistTemplate}
                                        >
                                            {checklistPreviewLoading ? 'Loading…' : 'Load'}
                                        </button>
                                    </div>
                                </div>

                                <h3 className="mwadmin-news-checklist-subtitle">P2D Checklist</h3>
                                <div className="mwadmin-news-checklist-table-wrap">
                                    <table className="mwadmin-news-checklist-table">
                                        <thead>
                                            <tr>
                                                <th>Plan</th>
                                                <th>Activity</th>
                                                <th>Responsibility</th>
                                                <th>User</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                                <th>Remarks</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checklistRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="mwadmin-news-checklist-empty">
                                                        Select a template and click Load, or saved rows will appear here.
                                                    </td>
                                                </tr>
                                            ) : (
                                                checklistRows.map((row, idx) => (
                                                    <tr key={row._key || idx}>
                                                        <td>
                                                            <select
                                                                value={String(row.plan)}
                                                                onChange={(e) =>
                                                                    setChecklistRows((rows) =>
                                                                        rows.map((r, i) =>
                                                                            i === idx
                                                                                ? {
                                                                                      ...r,
                                                                                      plan: parseInt(e.target.value, 10),
                                                                                  }
                                                                                : r
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                {PLAN_OPTS.map((p) => (
                                                                    <option key={p.id} value={String(p.id)}>
                                                                        {p.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={row.activity_name}
                                                                readOnly
                                                                className="mwadmin-input-readonly"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={row.responsibility_name}
                                                                readOnly
                                                                className="mwadmin-input-readonly"
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={row.user_id}
                                                                onChange={(e) =>
                                                                    setChecklistRows((rows) =>
                                                                        rows.map((r, i) =>
                                                                            i === idx
                                                                                ? { ...r, user_id: e.target.value }
                                                                                : r
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                <option value="">Please select</option>
                                                                {usersForChecklistRow(row).map((u) => (
                                                                    <option key={u.userid} value={String(u.userid)}>
                                                                        {[u.first_name, u.last_name]
                                                                            .filter(Boolean)
                                                                            .join(' ') || String(u.userid)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <DmyDateInput
                                                                density="compact"
                                                                value={isoDateToDmy(row.date)}
                                                                onChange={(dmy) => {
                                                                    const iso = dmyToIsoDate(dmy);
                                                                    setChecklistRows((rows) =>
                                                                        rows.map((r, i) =>
                                                                            i === idx
                                                                                ? {
                                                                                      ...r,
                                                                                      date:
                                                                                          iso && iso !== 'INVALID'
                                                                                              ? iso
                                                                                              : null,
                                                                                  }
                                                                                : r
                                                                        )
                                                                    );
                                                                }}
                                                                placeholder="dd-mm-yyyy"
                                                            />
                                                        </td>
                                                        <td className="mwadmin-news-checklist-time-cell">
                                                            <MwadminTimeInput
                                                                density="compact"
                                                                preferNativeDialog
                                                                value={row.time || ''}
                                                                onChange={(hhmm) =>
                                                                    setChecklistRows((rows) =>
                                                                        rows.map((r, i) =>
                                                                            i === idx ? { ...r, time: hhmm } : r
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={row.remarks}
                                                                onChange={(e) =>
                                                                    setChecklistRows((rows) =>
                                                                        rows.map((r, i) =>
                                                                            i === idx
                                                                                ? { ...r, remarks: e.target.value }
                                                                                : r
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={String(row.activity_status)}
                                                                onChange={(e) =>
                                                                    setChecklistRows((rows) =>
                                                                        rows.map((r, i) =>
                                                                            i === idx
                                                                                ? {
                                                                                      ...r,
                                                                                      activity_status: parseInt(
                                                                                          e.target.value,
                                                                                          10
                                                                                      ),
                                                                                  }
                                                                                : r
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                {CHECKLIST_STATUS_OPTS.map((s) => (
                                                                    <option key={s.id} value={String(s.id)}>
                                                                        {s.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(1)}>
                                        ← P2D Process
                                    </button>
                                    <button type="submit" disabled={savingChecklist}>
                                        {savingChecklist ? 'Saving…' : 'Update'}
                                    </button>
                                    <button type="button" className="mwadmin-news-edit-next-btn" onClick={() => goToStep(3)}>
                                        Next: Text Article →
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeStep === 3 && (
                            <form onSubmit={onSaveTextArticle} className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">Text Article</h2>
                                <div className="mwadmin-news-text-article-editor">
                                    <CkeEditor4 value={articleContent} onChange={setArticleContent} height={420} />
                                </div>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(2)}>
                                        ← P2D CheckList
                                    </button>
                                    <button type="submit" disabled={savingArticle}>
                                        {savingArticle ? 'Saving…' : 'Update'}
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

                                <div className="mwadmin-form-grid-full mwadmin-news-mm-video-block">
                                    <h3 className="mwadmin-news-mm-subtitle">
                                        Video Uploading{' '}
                                        <span className="mwadmin-news-mm-info" title="Choose manual file name or YouTube URL">
                                            i
                                        </span>
                                    </h3>
                                    <div className="mwadmin-news-mm-video-options">
                                        <label className="mwadmin-news-create-check">
                                            <input
                                                type="checkbox"
                                                checked={form.youtube_video_check}
                                                onChange={(e) => {
                                                    const on = e.target.checked;
                                                    setForm((f) => ({
                                                        ...f,
                                                        youtube_video_check: on,
                                                        youtube_url_check: on ? false : f.youtube_url_check,
                                                    }));
                                                }}
                                            />
                                            <span>Manually Upload</span>
                                        </label>
                                        <label className="mwadmin-news-create-check">
                                            <input
                                                type="checkbox"
                                                checked={form.youtube_url_check}
                                                onChange={(e) => {
                                                    const on = e.target.checked;
                                                    setForm((f) => ({
                                                        ...f,
                                                        youtube_url_check: on,
                                                        youtube_video_check: on ? false : f.youtube_video_check,
                                                    }));
                                                }}
                                            />
                                            <span>You-Tube Video UrL</span>
                                        </label>
                                    </div>
                                    {form.youtube_url_check ? (
                                        <>
                                            <label>
                                                You Tube UrL <span className="mwadmin-required">*</span>
                                            </label>
                                            <input
                                                value={form.youtube_url}
                                                onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                                                placeholder="https://www.youtube.com/watch?v=…"
                                            />
                                            <div className="mwadmin-news-youtube-preview">
                                                {youtubeEmbedSrc(form.youtube_url) ? (
                                                    <iframe
                                                        title="YouTube preview"
                                                        src={youtubeEmbedSrc(form.youtube_url)}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <div className="mwadmin-news-youtube-placeholder">Video preview</div>
                                                )}
                                            </div>
                                        </>
                                    ) : null}
                                    {form.youtube_video_check ? (
                                        <div className="mwadmin-form-grid-full mwadmin-news-mm-video-upload-block">
                                            <label className="mwadmin-news-mm-video-label">Manual video</label>
                                            <div
                                                className="mwadmin-news-mm-video-card mwadmin-category-image-preview-wrap--clickable"
                                                role="button"
                                                tabIndex={0}
                                                aria-label="Open video upload"
                                                onClick={() => setVideoEditorOpen(true)}
                                                onKeyDown={(ev) => {
                                                    if (ev.key === 'Enter' || ev.key === ' ') {
                                                        ev.preventDefault();
                                                        setVideoEditorOpen(true);
                                                    }
                                                }}
                                            >
                                                {videoDisplaySrc ? (
                                                    <video
                                                        className="mwadmin-news-mm-video-preview"
                                                        src={videoDisplaySrc}
                                                        controls
                                                        playsInline
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <div className="mwadmin-news-mm-video-placeholder-card">
                                                        NO VIDEO YET
                                                        <span className="mwadmin-category-image-click-hint">
                                                            Click to choose file and preview
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {videoFile || form.youtube_video ? (
                                                <p className="mwadmin-news-mm-video-filename">
                                                    {videoFile
                                                        ? `Pending upload: ${videoFile.name}`
                                                        : `Stored file: ${form.youtube_video}`}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>

                                <h3 className="mwadmin-form-grid-full mwadmin-news-mm-subtitle">Image management</h3>
                                <div className="mwadmin-form-grid-full mwadmin-category-images-row">
                                    <div className="mwadmin-category-image-block">
                                        <label>Banner Image (Size — 800px × 526px)</label>
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
                                        <label>Cover Image (Size — 385px × 165px)</label>
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
                                    <button type="button" className="mwadmin-news-edit-next-btn" onClick={() => goToStep(5)}>
                                        Next: Reviews →
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeStep === 5 && (
                            <div className="mwadmin-news-edit-step-panel">
                                <h2 className="mwadmin-news-edit-step-title">Reviews</h2>
                                <form onSubmit={onSubmitReview} className="mwadmin-news-review-form">
                                    <h3 className="mwadmin-news-review-subtitle">Review Feedback</h3>
                                    <textarea
                                        className="mwadmin-textarea mwadmin-news-review-textarea"
                                        rows={8}
                                        value={reviewText}
                                        onChange={(e) => setReviewText(e.target.value)}
                                        placeholder="Enter review feedback…"
                                    />
                                    <div className="mwadmin-news-review-submit-row">
                                        <button type="submit" disabled={savingReview}>
                                            {savingReview ? 'Submitting…' : 'Submit'}
                                        </button>
                                    </div>
                                </form>
                                <h3 className="mwadmin-news-review-subtitle">Previous Feedback</h3>
                                <ul className="mwadmin-news-review-list">
                                    {reviewItems.length === 0 ? (
                                        <li className="mwadmin-news-review-empty">No previous feedback yet.</li>
                                    ) : (
                                        reviewItems.map((rv) => (
                                            <li key={rv.id} className="mwadmin-news-review-item">
                                                <div className="mwadmin-news-review-meta">
                                                    <strong>{(rv.reviewer_name || '').trim() || 'Reviewer'}</strong>
                                                    <span className="mwadmin-news-review-date">
                                                        {rv.modifieddate
                                                            ? String(rv.modifieddate)
                                                            : ''}
                                                    </span>
                                                </div>
                                                <div className="mwadmin-news-review-body">{rv.review}</div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                                <div className="mwadmin-form-actions mwadmin-news-edit-step-actions">
                                    <button type="button" onClick={() => goToStep(4)}>
                                        ← Multimedia
                                    </button>
                                    <Link href="/mwadmin/newslisting">Back to listing</Link>
                                </div>
                            </div>
                        )}
                        </div>
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
                <MwadminVideoUploadModal
                    open={videoEditorOpen}
                    onClose={() => setVideoEditorOpen(false)}
                    title="Video upload"
                    pendingFile={videoFile}
                    serverVideoUrl={videoServerUrl}
                    maxBytes={MAX_NEWS_VIDEO_BYTES}
                    notify={notify}
                    onApply={(file) => {
                        setVideoFile(file);
                        if (!file) {
                            setVideoServerUrl('');
                            setForm((f) => ({ ...f, youtube_video: '' }));
                        }
                    }}
                />
            </MwadminLayout>
        </>
    );
}
