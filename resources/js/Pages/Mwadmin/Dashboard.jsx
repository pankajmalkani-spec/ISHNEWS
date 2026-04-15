import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MwadminLayout from '../../Components/Mwadmin/Layout';
import DmyDateInput from '../../Components/Mwadmin/DmyDateInput';
import MwadminActionsDropdown from '../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../Components/Mwadmin/ClassicDialog';
import { canEdit, canViewDetail } from '../../lib/mwadminPermissions';

const P2D_STATUS_OPTS = [
    { value: '1', label: 'Pending' },
    { value: '2', label: 'WIP' },
    { value: '3', label: 'Done' },
    { value: '4', label: 'Issue' },
    { value: '5', label: 'NA' },
];

const P2D_EQUAL_OPTS = [
    { value: '0', label: 'False' },
    { value: '1', label: 'True' },
];

const defaultFilters = (userId) => ({
    category_id: '',
    subcategory_id: '',
    start_date: '',
    end_date: '',
    featured: '',
    status: '3',
    p2dstatus: '0',
    user: userId || '0',
});

export default function Dashboard({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [advancedOpen, setAdvancedOpen] = useState(true);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [defaultUserId, setDefaultUserId] = useState('0');
    const [draftFilters, setDraftFilters] = useState(() => defaultFilters('0'));
    const [appliedFilters, setAppliedFilters] = useState(() => defaultFilters('0'));
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('20');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

    const newsPerms = useMemo(
        () => ({
            view: canViewDetail(authUser, 'newslisting'),
            edit: canEdit(authUser, 'newslisting'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            page,
            per_page: perPage,
            search,
            category_id: appliedFilters.category_id,
            subcategory_id: appliedFilters.subcategory_id,
            start_date: appliedFilters.start_date,
            end_date: appliedFilters.end_date,
            featured: appliedFilters.featured,
            status: appliedFilters.status,
            p2dstatus: appliedFilters.p2dstatus,
            user: appliedFilters.user,
        }),
        [page, perPage, search, appliedFilters]
    );

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/dashboard/options');
                if (c) return;
                setCategories(data.categories || []);
                setUsers(data.users || []);
                const du = String(data.default_user_id ?? '0');
                setDefaultUserId(du);
                setDraftFilters(defaultFilters(du));
                setAppliedFilters(defaultFilters(du));
            } catch {
                // ignore
            }
        })();
        return () => {
            c = true;
        };
    }, []);

    useEffect(() => {
        const cid = draftFilters.category_id;
        if (!cid) {
            setSubcategories([]);
            return undefined;
        }
        let canceled = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options', {
                    params: { category_id: cid },
                });
                if (!canceled) setSubcategories(data.subcategories || []);
            } catch {
                if (!canceled) setSubcategories([]);
            }
        })();
        return () => {
            canceled = true;
        };
    }, [draftFilters.category_id]);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/dashboard/rows', { params: query });
                if (canceled) return;
                setRows(data.data || []);
                setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
            } catch (e) {
                if (!canceled) {
                    setRows([]);
                    setMeta({ current_page: 1, last_page: 1, total: 0 });
                    const msg = e?.response?.data?.message || e?.message || 'Could not load dashboard.';
                    await dialog.alert(msg, 'Dashboard');
                }
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [query, dialog]);

    const handleSearch = async () => {
        const f = draftFilters;
        const hasAny =
            (f.category_id && f.category_id !== '') ||
            (f.subcategory_id && f.subcategory_id !== '') ||
            (f.start_date && f.end_date) ||
            (f.featured !== '' && f.featured !== undefined) ||
            (f.user && f.user !== '0') ||
            (f.featured === '0' || f.featured === '1');
        if (!hasAny && !(f.status && f.p2dstatus)) {
            await dialog.alert('Please select at least one filter to search data.', 'Advanced Search');
            return;
        }
        setPage(1);
        setAppliedFilters({ ...draftFilters });
    };

    const handleReset = () => {
        const next = defaultFilters(defaultUserId);
        setDraftFilters(next);
        setAppliedFilters(next);
        setSearch('');
        setPage(1);
    };

    const handleAction = useCallback(
        async (id, action) => {
            if (!action) return;
            if (action === 'view') {
                window.location.assign(`/mwadmin/newslisting/${id}/edit`);
                return;
            }
            if (action === 'edit') {
                window.location.assign(`/mwadmin/newslisting/${id}/edit`);
            }
        },
        []
    );

    const displayRows = useMemo(() => {
        let lastContentId = null;
        return rows.map((row) => {
            const sameContent = lastContentId === row.id;
            lastContentId = row.id;
            return { ...row, _merge: sameContent };
        });
    }, [rows]);

    const fallbackImg = '/images/categoryImages/boxImages/no_img.gif';

    return (
        <>
            <Head title="MW Admin Dashboard" />
            <MwadminLayout authUser={authUser} activeMenu="dashboard">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Home</span> <span className="sep">›</span> <strong>Dashboard</strong>
                    </div>
                    <h1 className="mwadmin-title">Dashboard</h1>

                    <section className="mwadmin-panel">
                        <div className="mwadmin-advanced-search mwadmin-advanced-search--in-panel">
                        <button
                            type="button"
                            className="mwadmin-advanced-search-toggle"
                            onClick={() => setAdvancedOpen((o) => !o)}
                            aria-expanded={advancedOpen}
                        >
                            <span>Advanced Search</span>
                            <span aria-hidden>{advancedOpen ? '▾' : '▸'}</span>
                        </button>
                        {advancedOpen ? (
                            <div className="mwadmin-advanced-search-body">
                                <div className="mwadmin-advanced-search-grid">
                                    <div>
                                        <label htmlFor="adv-dash-cat">Category</label>
                                        <select
                                            id="adv-dash-cat"
                                            className="mwadmin-select"
                                            value={draftFilters.category_id}
                                            onChange={(e) =>
                                                setDraftFilters((d) => ({
                                                    ...d,
                                                    category_id: e.target.value,
                                                    subcategory_id: '',
                                                }))
                                            }
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
                                        <label htmlFor="adv-dash-sub">Sub Category</label>
                                        <select
                                            id="adv-dash-sub"
                                            className="mwadmin-select"
                                            value={draftFilters.subcategory_id}
                                            onChange={(e) =>
                                                setDraftFilters((d) => ({ ...d, subcategory_id: e.target.value }))
                                            }
                                            disabled={!draftFilters.category_id}
                                        >
                                            <option value="">Please Select</option>
                                            {subcategories.map((s) => (
                                                <option key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mwadmin-advanced-search-field-wide">
                                        <span
                                            className="mwadmin-advanced-search-field-heading"
                                            id="adv-dash-dates-label"
                                        >
                                            Date From &amp; To (d-m-Y)
                                        </span>
                                        <div
                                            className="mwadmin-advanced-search-date-row"
                                            role="group"
                                            aria-labelledby="adv-dash-dates-label"
                                        >
                                            <DmyDateInput
                                                id="adv-dash-from"
                                                density="compact"
                                                value={draftFilters.start_date}
                                                onChange={(v) => setDraftFilters((d) => ({ ...d, start_date: v }))}
                                            />
                                            <span className="mwadmin-advanced-search-date-to" aria-hidden>
                                                to
                                            </span>
                                            <DmyDateInput
                                                id="adv-dash-to"
                                                density="compact"
                                                value={draftFilters.end_date}
                                                onChange={(v) => setDraftFilters((d) => ({ ...d, end_date: v }))}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="adv-dash-feat">Featured content</label>
                                        <select
                                            id="adv-dash-feat"
                                            className="mwadmin-select"
                                            value={draftFilters.featured}
                                            onChange={(e) =>
                                                setDraftFilters((d) => ({ ...d, featured: e.target.value }))
                                            }
                                        >
                                            <option value="">All</option>
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="adv-dash-p2d">P2D Status</label>
                                        <select
                                            id="adv-dash-p2d"
                                            className="mwadmin-select"
                                            value={draftFilters.status}
                                            onChange={(e) =>
                                                setDraftFilters((d) => ({ ...d, status: e.target.value }))
                                            }
                                        >
                                            {P2D_STATUS_OPTS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="adv-dash-p2deq">P2D Status equal to</label>
                                        <select
                                            id="adv-dash-p2deq"
                                            className="mwadmin-select"
                                            value={draftFilters.p2dstatus}
                                            onChange={(e) =>
                                                setDraftFilters((d) => ({ ...d, p2dstatus: e.target.value }))
                                            }
                                        >
                                            {P2D_EQUAL_OPTS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="adv-dash-user">User</label>
                                        <select
                                            id="adv-dash-user"
                                            className="mwadmin-select"
                                            value={draftFilters.user}
                                            onChange={(e) =>
                                                setDraftFilters((d) => ({ ...d, user: e.target.value }))
                                            }
                                        >
                                            {users.map((u) => (
                                                <option key={u.id} value={String(u.id)}>
                                                    {u.username}
                                                </option>
                                            ))}
                                            <option value="0">ALL</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mwadmin-advanced-search-actions">
                                    <button type="button" className="mwadmin-btn-reset" onClick={handleReset}>
                                        Reset
                                    </button>
                                    <button type="button" onClick={() => handleSearch()}>
                                        Search
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        </div>

                        <div className="mwadmin-toolbar">
                            <div>
                                Show{' '}
                                <select
                                    className="mwadmin-select"
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="80">80</option>
                                </select>{' '}
                                entries
                            </div>
                            <div className="mwadmin-right-tools">
                                <div className="mwadmin-search">
                                    Search:
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Title or P2D case"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mwadmin-table-wrap mwadmin-dashboard-table-wrap">
                            <table className="mwadmin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>P2D Case No</th>
                                        <th>Category</th>
                                        <th>Sub Category</th>
                                        <th>Cover Image</th>
                                        <th>Title</th>
                                        <th>Due Date</th>
                                        <th>Activity</th>
                                        <th>Responsibility</th>
                                        <th>User</th>
                                        <th>Activity Status</th>
                                        <th>Remarks</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="13" style={{ textAlign: 'center', padding: '24px' }}>
                                                Loading…
                                            </td>
                                        </tr>
                                    ) : null}
                                    {!loading && displayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="13">No data available in table</td>
                                        </tr>
                                    ) : null}
                                    {!loading &&
                                        displayRows.map((row) => {
                                            const m = row._merge;
                                            const code = row.activity_status_code;
                                            const rowStyle =
                                                code === 5
                                                    ? { backgroundColor: 'rgba(220, 80, 80, 0.35)' }
                                                    : code === 4
                                                      ? { backgroundColor: 'rgba(255, 165, 0, 0.4)' }
                                                      : {};
                                            const src = row.cover_img_url || fallbackImg;
                                            return (
                                                <tr key={`${row.id}-${row.chart_id ?? 'x'}`} style={rowStyle}>
                                                    <td>{m ? '' : row.id}</td>
                                                    <td>{m ? '' : row.p2d_caseno}</td>
                                                    <td>{m ? '' : row.category_name}</td>
                                                    <td>{m ? '' : row.subcategory_name}</td>
                                                    <td>
                                                        {m ? (
                                                            ''
                                                        ) : (
                                                            <img
                                                                src={src}
                                                                alt=""
                                                                style={{
                                                                    maxWidth: '120px',
                                                                    maxHeight: '72px',
                                                                    objectFit: 'cover',
                                                                }}
                                                                onError={(e) => {
                                                                    const el = e.currentTarget;
                                                                    if (el.getAttribute('data-fallback') === '1')
                                                                        return;
                                                                    el.setAttribute('data-fallback', '1');
                                                                    el.onerror = null;
                                                                    el.src = fallbackImg;
                                                                }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td>{m ? '' : row.title}</td>
                                                    <td>{m ? '' : row.due_date}</td>
                                                    <td>{row.activity_name}</td>
                                                    <td>{row.responsibilty}</td>
                                                    <td>{row.user_name}</td>
                                                    <td>{row.activity_status}</td>
                                                    <td>{row.remarks}</td>
                                                    <td>
                                                        {m ? (
                                                            ''
                                                        ) : (
                                                            <MwadminActionsDropdown
                                                                flags={{
                                                                    view: newsPerms.view,
                                                                    edit: newsPerms.edit,
                                                                }}
                                                                onAction={(a) => handleAction(row.id, a)}
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                        <div className="mwadmin-pagination">
                            <span>
                                Showing page {meta.current_page} of {meta.last_page} ({meta.total} records)
                            </span>
                            <div>
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={page >= meta.last_page}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
