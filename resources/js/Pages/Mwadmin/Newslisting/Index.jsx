import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { canAdd, canDelete, canEdit } from '../../../lib/mwadminPermissions';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import DmyDateInput from '../../../Components/Mwadmin/DmyDateInput';
import { dmyToIsoDate } from '../Sponsor/sponsorDateFormat';

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
    const [advancedOpen, setAdvancedOpen] = useState(true);
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

    const query = useMemo(() => {
        const apiDate = (dmy) => {
            const iso = dmyToIsoDate(dmy);
            if (iso === null || iso === 'INVALID') return '';
            return iso;
        };
        return {
            search,
            page,
            per_page: perPage,
            filter_category_id: appliedFilters.category_id,
            filter_subcategory_id: appliedFilters.subcategory_id,
            filter_status1: appliedFilters.status1,
            filter_featured: appliedFilters.featured,
            filter_date_from: apiDate(appliedFilters.date_from),
            filter_date_to: apiDate(appliedFilters.date_to),
        };
    }, [search, page, perPage, appliedFilters]);

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
        const fromIso = dmyToIsoDate(draftFilters.date_from);
        const toIso = dmyToIsoDate(draftFilters.date_to);
        if (fromIso === 'INVALID' || toIso === 'INVALID') {
            dialog.toast('Enter schedule dates as dd-mm-yyyy, or leave the fields blank.', 'error');
            return;
        }
        if (
            fromIso &&
            toIso &&
            String(fromIso) > String(toIso)
        ) {
            dialog.toast('Date from must be on or before date to.', 'error');
            return;
        }
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

    /* Column order matches legacy mwadmin/newslisting: ID → … → Final release → Actions (11 cols). */
    const vc = 'mwadmin-ag-cell-vcenter';
    const columns = useMemo(
        () => [
            { field: 'id', headerName: 'ID', width: 72, sortable: true, cellClass: vc },
            { field: 'p2d_caseno', headerName: 'P2D Case No', minWidth: 110, sortable: true, cellClass: vc },
            { field: 'category_name', headerName: 'Category', minWidth: 120, sortable: false, cellClass: vc },
            { field: 'subcategory_name', headerName: 'Sub Category', minWidth: 120, sortable: false, cellClass: vc },
            {
                field: 'cover_img_url',
                headerName: 'Cover Image',
                width: 168,
                minWidth: 160,
                sortable: false,
                cellClass: `${vc} mwadmin-newslisting-cover-col`,
                cellRenderer: (p) => {
                    const src = p.value || '/images/categoryImages/boxImages/no_img.gif';
                    return (
                        <span className="mwadmin-newslisting-cover-cell">
                            <span className="mwadmin-newslisting-cover-frame">
                                <img className="mwadmin-newslisting-cover-thumb" src={src} alt="" />
                            </span>
                        </span>
                    );
                },
            },
            {
                field: 'title',
                headerName: 'Content Title',
                flex: 1,
                minWidth: 180,
                sortable: false,
                cellClass: vc,
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            { field: 'news_source_name', headerName: 'News Source', minWidth: 120, sortable: false, cellClass: vc },
            {
                field: 'schedule_date',
                headerName: 'Schedule Date',
                minWidth: 130,
                sortable: false,
                cellClass: vc,
                valueFormatter: (p) => {
                    const v = p.value;
                    if (v === null || v === undefined || v === '') return 'Unscheduled';
                    const s = String(v).trim();
                    if (s === '' || s.startsWith('0000-00-00')) return 'Unscheduled';
                    return s;
                },
            },
            { field: 'status1', headerName: 'Status', width: 100, sortable: false, cellClass: vc },
            {
                field: 'final_releasestatus',
                headerName: 'Final\nRelease Status',
                minWidth: 118,
                sortable: false,
                wrapHeaderText: true,
                autoHeaderHeight: true,
                cellClass: `${vc} mwadmin-newslisting-badge-col`,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 130,
                minWidth: 120,
                sortable: false,
                cellClass: `${vc} mwadmin-ag-cell-actions`,
                cellRenderer: (params) => (
                    <MwadminActionsDropdown
                        flags={{ edit: perms.edit, delete: perms.delete }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
        ],
        [perms]
    );

    return (
        <>
            <Head title="Manage Content Listing" />
            <MwadminLayout authUser={authUser} activeMenu="newslisting">
                <div className="mwadmin-category-classic mwadmin-newslisting-page">
                    <div className="mwadmin-pagebar">
                        <span>Content</span> <span className="sep">›</span> <span>Manage Content</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Manage Content</h1>

                    <section className={`mwadmin-newslisting-adv ${advancedOpen ? 'is-open' : ''}`}>
                        <button
                            type="button"
                            className="mwadmin-newslisting-adv-head"
                            onClick={() => setAdvancedOpen((o) => !o)}
                            aria-expanded={advancedOpen}
                        >
                            <span className="mwadmin-newslisting-adv-head-title">Advanced Search</span>
                            <span className="mwadmin-newslisting-adv-head-icon" aria-hidden>
                                {advancedOpen ? '−' : '+'}
                            </span>
                        </button>
                        {advancedOpen && (
                            <div className="mwadmin-newslisting-adv-body">
                                <div className="mwadmin-newslisting-adv-grid">
                                    <div className="mwadmin-newslisting-adv-field">
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
                                    <div className="mwadmin-newslisting-adv-field">
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
                                    <div className="mwadmin-newslisting-adv-field">
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
                                    <div className="mwadmin-newslisting-adv-field mwadmin-newslisting-adv-field--dates">
                                        <span className="mwadmin-newslisting-adv-label" id="adv-dates-label">
                                            Schedule date range (dd-mm-yyyy)
                                        </span>
                                        <span className="mwadmin-newslisting-adv-hint">
                                            Filters rows by schedule date; use the calendar or type dd-mm-yyyy.
                                        </span>
                                        <div
                                            className="mwadmin-newslisting-adv-date-pair"
                                            role="group"
                                            aria-labelledby="adv-dates-label"
                                        >
                                            <DmyDateInput
                                                id="adv-from"
                                                density="compact"
                                                value={draftFilters.date_from}
                                                onChange={(v) => setDraftFilters((s) => ({ ...s, date_from: v }))}
                                            />
                                            <span className="mwadmin-newslisting-adv-date-sep">to</span>
                                            <DmyDateInput
                                                id="adv-to"
                                                density="compact"
                                                value={draftFilters.date_to}
                                                onChange={(v) => setDraftFilters((s) => ({ ...s, date_to: v }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="mwadmin-newslisting-adv-field">
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
                                <div className="mwadmin-newslisting-adv-actions">
                                    <button type="button" className="mwadmin-btn-reset" onClick={resetAdvancedSearch}>
                                        Reset
                                    </button>
                                    <button type="button" className="mwadmin-newslisting-adv-submit" onClick={runAdvancedSearch}>
                                        Search
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="mwadmin-panel mwadmin-newslisting-grid-panel">
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
                            <MwadminThemedAgGrid
                                className="mwadmin-news-listing-grid"
                                style={{ flex: '1 1 0', minHeight: 0, height: '100%', width: '100%' }}
                            >
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
                                    alwaysShowVerticalScroll
                                    rowBuffer={20}
                                    rowHeight={100}
                                    headerHeight={40}
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
