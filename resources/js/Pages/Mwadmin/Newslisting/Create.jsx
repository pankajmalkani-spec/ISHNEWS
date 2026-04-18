import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import NewslistingEdit from './Edit';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import MwadminTimeInput from '../../../Components/Mwadmin/MwadminTimeInput';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { MWADMIN_NEWS_BANNER, MWADMIN_NEWS_COVER } from '../../../lib/mwadminImageEditorTargets';
import { dmyToIsoDate, isoDateToDmy } from '../Sponsor/sponsorDateFormat';

const MAX_NEWS_IMAGE_BYTES = 8 * 1024 * 1024;

const today = () => new Date().toISOString().slice(0, 10);

const DRAFT_STATUS = ['Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold'];

/** Legacy mwadmin/newslisting/create.php tooltips (create has only P2D Process form; other tabs unlock after save/edit). */
const CREATE_LOCKED_TABS = [
    {
        id: 'checklist',
        label: 'P2D CheckList',
        title:
            'Fill details of P2D Process, Text Article & Multimedia Tab to unlock P2D CheckList Tab.',
    },
    {
        id: 'text',
        label: 'Text Article',
        title: 'Fill details of P2D Process to unlock Text Article Tab.',
    },
    {
        id: 'media',
        label: 'Multimedia',
        title: 'Fill details of P2D Process, Text Article Tab to unlock Multimedia Tab.',
    },
    {
        id: 'review',
        label: "Review's",
        title: 'Fill details of P2D Process, Text Article Tab to unlock Multimedia Tab.',
    },
];

function Req() {
    return <span className="mwadmin-required"> *</span>;
}

function moduleFlag(modules, key, flag) {
    const v = modules?.[key]?.[flag];
    return Number(v) > 0;
}

export default function NewslistingCreate({
    authUser = {},
    newslistingId: wizardNewslistingId,
    initialStep: wizardInitialStep = 1,
    createWizard = false,
}) {
    /** Steps 2–6 after P2D save: same wizard as Edit, but URL stays under `/newslisting/create/{id}/…`. */
    if (createWizard && wizardNewslistingId != null) {
        return (
            <NewslistingEdit
                authUser={authUser}
                newslistingId={wizardNewslistingId}
                initialStep={wizardInitialStep}
                pageVariant="create"
            />
        );
    }

    const dialog = useClassicDialog();
    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);
    const modules = authUser?.modules ?? {};
    const isSuper = !!authUser?.superaccess;
    /** Legacy: non-super needs p2dprocess allow_add to use P2D Process tab; super always can. */
    const p2dProcessAllowed = isSuper || moduleFlag(modules, 'p2dprocess', 'allow_add');
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [newsSources, setNewsSources] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [users, setUsers] = useState([]);
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
    const [memberRows, setMemberRows] = useState([]);
    const [dateValues, setDateValues] = useState({
        p2d_date: isoDateToDmy(today()),
        due_date: isoDateToDmy(today()),
        completion_date: '',
        schedule_date: '',
    });
    const releaseStatusReady = form.status1 === 'Ready';

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

    const titleOk = form.title.trim().length > 0;

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options');
                if (c) return;
                setCategories(data.categories || []);
                setNewsSources(data.news_sources || []);
                setDesignations(data.designations || []);
                setUsers(data.users || []);
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

    useEffect(() => {
        if (releaseStatusReady) return;
        setDateValues((s) => ({ ...s, schedule_date: '' }));
        setForm((f) => ({ ...f, schedule_time: '' }));
    }, [releaseStatusReady]);

    const onAddMembersClick = () => {
        if (!titleOk) {
            dialog.toast('Please Enter News Title, to unlock Add Members button..', 'error');
            return;
        }
        setMemberRows((rows) => [
            ...rows,
            { designation_id: '', user_id: '', instructions: '' },
        ]);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.category_id || !form.subcategory_id) {
            dialog.toast('Category and sub-category are required.', 'error');
            return;
        }
        const p2dDateIso = dmyToIsoDate(dateValues.p2d_date);
        const dueDateIso = dmyToIsoDate(dateValues.due_date);
        const completionDateIso = dmyToIsoDate(dateValues.completion_date);
        const scheduleDateIso = dmyToIsoDate(dateValues.schedule_date);
        if (
            p2dDateIso === 'INVALID' ||
            dueDateIso === 'INVALID' ||
            completionDateIso === 'INVALID' ||
            scheduleDateIso === 'INVALID'
        ) {
            dialog.toast('Please enter valid dates in dd-mm-yyyy format.', 'error');
            return;
        }
        if (!p2dDateIso || !dueDateIso) {
            dialog.toast('P2D Date and Due Date are required (dd-mm-yyyy).', 'error');
            return;
        }
        const hasInvalidMembers = memberRows.some(
            (m) => !m.designation_id || !m.user_id
        );
        if (hasInvalidMembers) {
            dialog.toast('Each member row must have Designation and User selected.', 'error');
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
            fd.append('due_date', dueDateIso);
            fd.append('p2d_date', p2dDateIso);
            fd.append('last_serialno', form.last_serialno);
            fd.append('p2d_caseno', form.p2d_caseno.trim());
            if (form.description) fd.append('description', form.description);
            if (form.shared_folder) fd.append('shared_folder', form.shared_folder);
            if (completionDateIso) fd.append('completion_date', completionDateIso);
            if (form.featured_content) fd.append('featured_content', '1');
            if (scheduleDateIso) {
                fd.append('schedule_date', scheduleDateIso);
                fd.append('schedule_time', form.schedule_time || '00:00');
            }
            memberRows.forEach((m, i) => {
                fd.append(`members[${i}][designation_id]`, String(m.designation_id));
                fd.append(`members[${i}][user_id]`, String(m.user_id));
                fd.append(`members[${i}][instructions]`, m.instructions || '');
            });
            if (bannerFile) fd.append('banner_img', bannerFile);
            if (coverFile) fd.append('cover_img', coverFile);

            const { data: body } = await axios.post('/api/mwadmin/newslistings', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const newId = body?.data?.id;
            const nextStep = Number(body?.data?.next_step) || 2;
            dialog.toast('News content created successfully. Opening P2D CheckList…', 'success');
            /** Legacy Newslisting.php: after insert, `step` => 2 (P2D CheckList), not back to index. */
            if (newId) {
                window.setTimeout(
                    () => router.visit(`/mwadmin/newslisting/create/${newId}/${nextStep}`),
                    400
                );
            } else {
                window.setTimeout(() => router.visit('/mwadmin/newslisting'), 1200);
            }
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

                    <section className="mwadmin-panel mwadmin-form-panel mwadmin-news-wizard">
                        <ul className="mwadmin-news-wizard-tabs" role="tablist">
                            <li
                                className={p2dProcessAllowed ? 'active' : 'disabled'}
                                role="tab"
                                aria-selected={p2dProcessAllowed}
                            >
                                <span className="mwadmin-news-wizard-tab-static">P2D Process</span>
                            </li>
                            {CREATE_LOCKED_TABS.map((t) => (
                                <li key={t.id} className="disabled" title={t.title}>
                                    <span className="mwadmin-news-wizard-tab-static">{t.label}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mwadmin-news-wizard-body">
                        {!p2dProcessAllowed ? (
                            <p className="mwadmin-news-create-tab-locked-msg">
                                You have no rights to add P2D Process content. Contact your administrator.
                            </p>
                        ) : null}

                        {p2dProcessAllowed ? (
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
                                <DmyDateInput
                                    value={dateValues.p2d_date}
                                    onChange={(dmy) => setDateValues((s) => ({ ...s, p2d_date: dmy }))}
                                    placeholder="dd-mm-yyyy"
                                />
                            </div>
                            <div>
                                <label>
                                    Release Date (<span className="mwadmin-label-hint">d-m-Y</span>)
                                </label>
                                <DmyDateInput
                                    value={dateValues.schedule_date}
                                    onChange={(dmy) => setDateValues((s) => ({ ...s, schedule_date: dmy }))}
                                    placeholder="dd-mm-yyyy"
                                    normalizeOnBlur
                                    disabled={!releaseStatusReady}
                                />
                            </div>
                            <div>
                                <label>
                                    Time (<span className="mwadmin-label-hint">IST, Hrs:Min</span>)
                                </label>
                                <MwadminTimeInput
                                    value={form.schedule_time}
                                    onChange={(hhmm) => setForm((f) => ({ ...f, schedule_time: hhmm }))}
                                    preferNativeDialog
                                    disabled={!releaseStatusReady}
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
                                <DmyDateInput
                                    value={dateValues.due_date}
                                    onChange={(dmy) => setDateValues((s) => ({ ...s, due_date: dmy }))}
                                    placeholder="dd-mm-yyyy"
                                />
                            </div>
                            <div>
                                <label>
                                    Completion Date (<span className="mwadmin-label-hint">d-m-Y</span>)
                                </label>
                                <DmyDateInput
                                    value={dateValues.completion_date}
                                    onChange={(dmy) => setDateValues((s) => ({ ...s, completion_date: dmy }))}
                                    placeholder="dd-mm-yyyy"
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
                                            {bannerPickUrl ? (
                                                <img src={bannerPickUrl} alt="" className="mwadmin-category-image-preview" />
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
                                            {coverPickUrl ? (
                                                <img src={coverPickUrl} alt="" className="mwadmin-category-image-preview" />
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
                                            {memberRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="mwadmin-news-members-empty">
                                                        No members added yet. Enter News Title and click Add Members.
                                                    </td>
                                                </tr>
                                            ) : (
                                                memberRows.map((row, idx) => {
                                                    const availableUsers = users.filter(
                                                        (u) =>
                                                            !row.designation_id ||
                                                            String(u.designation ?? '') === String(row.designation_id)
                                                    );
                                                    return (
                                                        <tr key={`member-row-${idx}`}>
                                                            <td>
                                                                <select
                                                                    value={row.designation_id}
                                                                    onChange={(e) =>
                                                                        setMemberRows((rows) =>
                                                                            rows.map((r, i) =>
                                                                                i === idx
                                                                                    ? { ...r, designation_id: e.target.value, user_id: '' }
                                                                                    : r
                                                                            )
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="">Select Designation</option>
                                                                    {designations.map((d) => (
                                                                        <option key={d.id} value={String(d.id)}>
                                                                            {d.designation}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <select
                                                                    value={row.user_id}
                                                                    onChange={(e) =>
                                                                        setMemberRows((rows) =>
                                                                            rows.map((r, i) =>
                                                                                i === idx ? { ...r, user_id: e.target.value } : r
                                                                            )
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="">Select User</option>
                                                                    {availableUsers.map((u) => (
                                                                        <option key={u.userid} value={String(u.userid)}>
                                                                            {[u.first_name, u.last_name].filter(Boolean).join(' ') ||
                                                                                String(u.userid)}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <input
                                                                        value={row.instructions}
                                                                        onChange={(e) =>
                                                                            setMemberRows((rows) =>
                                                                                rows.map((r, i) =>
                                                                                    i === idx
                                                                                        ? { ...r, instructions: e.target.value }
                                                                                        : r
                                                                                )
                                                                            )
                                                                        }
                                                                        placeholder="Character / instructions"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="mwadmin-filter-clear"
                                                                        onClick={() =>
                                                                            setMemberRows((rows) =>
                                                                                rows.filter((_, i) => i !== idx)
                                                                            )
                                                                        }
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
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
                        ) : null}
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
                    initialImageUrl={bannerSourceFile || bannerFile ? null : bannerPickUrl || null}
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
                    initialImageUrl={coverSourceFile || coverFile ? null : coverPickUrl || null}
                    onApply={(file, meta) => setCoverFromFile(file, meta)}
                />
            </MwadminLayout>
        </>
    );
}
