import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { canAdd, canDelete, canEdit } from '../../../lib/mwadminPermissions';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';

const STATUS_OPTS = ['', 'Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold', 'Released', 'Booked'];

const emptyAdv = () => ({
    category_id: '',
    subcategory_id: '',
    status1: '',
    featured: '',
    date_from: '',
    date_to: '',
});

export default function NewslistingIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [categories, setCategories] = useState([]);
    const [draftSubcats, setDraftSubcats] = useState([]);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(emptyAdv);
    const [appliedFilters, setAppliedFilters] = useState(emptyAdv);

    const perms = useMemo(
        () => ({
            edit: canEdit(authUser, 'newslisting'),
            delete: canDelete(authUser, 'newslisting'),
            add: canAdd(authUser, 'newslisting'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            search,
            page,
            per_page: perPage,
            filter_category_id: appliedFilters.category_id,
            filter_subcategory_id: appliedFilters.subcategory_id,
            filter_status1: appliedFilters.status1,
            filter_featured: appliedFilters.featured,
            filter_date_from: appliedFilters.date_from,
            filter_date_to: appliedFilters.date_to,
        }),
        [search, page, perPage, appliedFilters]
    );

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options');
                if (!c) setCategories(data.categories || []);
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
            setDraftSubcats([]);
            return;
        }
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings/options', {
                    params: { category_id: cid },
                });
                if (!c) setDraftSubcats(data.subcategories || []);
            } catch {
                if (!c) setDraftSubcats([]);
            }
        })();
        return () => {
            c = true;
        };
    }, [draftFilters.category_id]);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/newslistings', { params: query });
                if (!canceled) {
                    setRows(data.data || []);
                    setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
                }
            } catch (err) {
                if (!canceled) {
                    dialog.toast(err?.response?.data?.message || 'Unable to load content listing.', 'error');
                }
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [query]);

    const runAdvancedSearch = () => {
        setPage(1);
        setAppliedFilters({ ...draftFilters });
    };

    const resetAdvancedSearch = () => {
        const cleared = emptyAdv();
        setDraftFilters(cleared);
        setAppliedFilters(cleared);
        setPage(1);
    };

    const deleteRow = async (id) => {
        if (!(await dialog.confirm('Delete this news content?', 'Delete Content'))) return;
        try {
            await axios.delete(`/api/mwadmin/newslistings/${id}`);
            dialog.toast('News content deleted successfully.', 'success');
            const { data } = await axios.get('/api/mwadmin/newslistings', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to delete.', 'error');
        }
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'edit') return window.location.assign(`/mwadmin/newslisting/${id}/edit`);
        if (action === 'delete') await deleteRow(id);
    };

    const columns = useMemo(
        () => [
            { field: 'id', headerName: 'ID', width: 72, sortable: true },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 130,
                minWidth: 120,
                sortable: false,
                cellRenderer: (params) => (
                    <MwadminActionsDropdown
                        flags={{ edit: perms.edit, delete: perms.delete }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
            { field: 'p2d_caseno', headerName: 'P2D Case No', minWidth: 110, sortable: true },
            { field: 'category_name', headerName: 'Category', minWidth: 120, sortable: false },
            { field: 'subcategory_name', headerName: 'Sub Category', minWidth: 120, sortable: false },
            {
                field: 'cover_img_url',
                headerName: 'Cover Image',
                width: 110,
                sortable: false,
                cellRenderer: (p) => {
                    const src = p.value || '/images/categoryImages/boxImages/no_img.gif';
                    return <img src={src} style={{ maxWidth: '72px', maxHeight: '40px', objectFit: 'cover' }} alt="" />;
                },
            },
            { field: 'title', headerName: 'Content Title', flex: 1, minWidth: 180, sortable: false },
            { field: 'news_source_name', headerName: 'News Source', minWidth: 120, sortable: false },
            {
                field: 'schedule_date',
                headerName: 'Schedule Date',
                minWidth: 130,
                sortable: false,
                valueFormatter: (p) => {
                    const v = p.value;
                    if (v === null || v === undefined || v === '') return 'Unscheduled';
                    return String(v);
                },
            },
            { field: 'status1', headerName: 'Status', width: 100, sortable: false },
            {
                field: 'final_releasestatus',
                headerName: 'Final Release Status',
                minWidth: 140,
                sortable: false,
                cellRenderer: (p) => {
                    const active = p.value === '1' || p.value === 1;
                    return (
                        <span
                            className={`mwadmin-news-final-badge ${active ? 'is-active' : 'is-inactive'}`}
                        >
                            {active ? 'Active' : 'In Active'}
                        </span>
                    );
                },
            },
        ],
        [perms]
    );

    return (
        <>
            <Head title="Manage Content Listing" />
            <MwadminLayout authUser={authUser} activeMenu="newslisting">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Content</span> <span className="sep">›</span> <span>Manage Content</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Manage Content</h1>

                    <div className="mwadmin-advanced-search">
                        <button
                            type="button"
                            className="mwadmin-advanced-search-toggle"
                            onClick={() => setAdvancedOpen((o) => !o)}
                            aria-expanded={advancedOpen}
                        >
                            <span>Advanced Search</span>
                            <span aria-hidden>{advancedOpen ? '▾' : '▸'}</span>
                        </button>
                        {advancedOpen && (
                            <div className="mwadmin-advanced-search-body">
                                <div className="mwadmin-advanced-search-grid">
                                    <div>
                                        <label htmlFor="adv-cat">Category</label>
                                        <select
                                            id="adv-cat"
                                            value={draftFilters.category_id}
                                            onChange={(e) =>
                                                setDraftFilters((s) => ({
                                                    ...s,
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
                                        <label htmlFor="adv-sub">Sub Category</label>
                                        <select
                                            id="adv-sub"
                                            value={draftFilters.subcategory_id}
                                            onChange={(e) =>
                                                setDraftFilters((s) => ({ ...s, subcategory_id: e.target.value }))
                                            }
                                            disabled={!draftFilters.category_id}
                                        >
                                            <option value="">Please Select</option>
                                            {draftSubcats.map((s) => (
                                                <option key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="adv-status">Status</label>
                                        <select
                                            id="adv-status"
                                            value={draftFilters.status1}
                                            onChange={(e) =>
                                                setDraftFilters((s) => ({ ...s, status1: e.target.value }))
                                            }
                                        >
                                            {STATUS_OPTS.map((s) => (
                                                <option key={s || 'all'} value={s}>
                                                    {s === '' ? 'All' : s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="adv-from">Date from (d-m-Y)</label>
                                        <input
                                            id="adv-from"
                                            type="date"
                                            value={draftFilters.date_from}
                                            onChange={(e) =>
                                                setDraftFilters((s) => ({ ...s, date_from: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="adv-to">Date to</label>
                                        <input
                                            id="adv-to"
                                            type="date"
                                            value={draftFilters.date_to}
                                            onChange={(e) =>
                                                setDraftFilters((s) => ({ ...s, date_to: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="adv-feat">Featured content</label>
                                        <select
                                            id="adv-feat"
                                            value={draftFilters.featured}
                                            onChange={(e) =>
                                                setDraftFilters((s) => ({ ...s, featured: e.target.value }))
                                            }
                                        >
                                            <option value="">All</option>
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mwadmin-advanced-search-actions">
                                    <button type="button" className="mwadmin-btn-reset" onClick={resetAdvancedSearch}>
                                        Reset
                                    </button>
                                    <button type="button" onClick={runAdvancedSearch}>
                                        Search
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <section className="mwadmin-panel">
                        <div className="mwadmin-panel-head">Manage Content(s)</div>
                        <div className="mwadmin-toolbar">
                            <div>
                                Show
                                <select
                                    className="mwadmin-select"
                                    value={perPage}
                                    onChange={(e) => {
                                        setPage(1);
                                        setPerPage(e.target.value);
                                    }}
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value="all">All</option>
                                </select>
                                entries
                            </div>
                            <div className="mwadmin-right-tools">
                                {perms.add ? (
                                    <Link className="mwadmin-add-btn" href="/mwadmin/newslisting/create">
                                        + Add New Content
                                    </Link>
                                ) : null}
                                <div className="mwadmin-search">
                                    Search:
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => {
                                            setPage(1);
                                            setSearch(e.target.value);
                                        }}
                                        placeholder="Title or P2D case"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mwadmin-table-wrap">
                            <MwadminThemedAgGrid>
                                <AgGridReact
                                    rowData={rows}
                                    columnDefs={columns}
                                    columnMenu="legacy"
                                    defaultColDef={{
                                        resizable: true,
                                        sortable: true,
                                        filter: false,
                                    }}
                                    popupParent={typeof document !== 'undefined' ? document.body : undefined}
                                    animateRows
                                    suppressCellFocus
                                    rowHeight={36}
                                    headerHeight={32}
                                    overlayNoRowsTemplate={loading ? 'Loading...' : 'No data available in table'}
                                />
                            </MwadminThemedAgGrid>
                        </div>

                        <div className="mwadmin-pagination">
                            <span>
                                Showing page {meta.current_page} of {meta.last_page} ({meta.total} records)
                            </span>
                            <div>
                                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    Prev
                                </button>
                                <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
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
