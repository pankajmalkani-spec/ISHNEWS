import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { canAdd, canDelete, canEdit, canViewDetail } from '../../../lib/mwadminPermissions';

export default function AdvertisementIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const gridApiRef = useRef(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ company: '', status: '' });

    const perms = useMemo(
        () => ({
            view: canViewDetail(authUser, 'advertisement'),
            edit: canEdit(authUser, 'advertisement'),
            delete: canDelete(authUser, 'advertisement'),
            add: canAdd(authUser, 'advertisement'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            search,
            page,
            per_page: perPage,
            filter_company: columnFilters.company,
            filter_status: columnFilters.status,
        }),
        [search, page, perPage, columnFilters]
    );

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/advertisements', { params: query });
                if (!canceled) {
                    setRows(data.data || []);
                    setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
                }
            } catch (err) {
                if (!canceled) {
                    dialog.toast(err?.response?.data?.message || 'Unable to load advertisements.', 'error');
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

    const refreshRowHeights = useCallback(() => {
        const api = gridApiRef.current;
        if (!api) return;
        window.requestAnimationFrame(() => {
            api.resetRowHeights();
            window.requestAnimationFrame(() => {
                api.resetRowHeights();
            });
        });
    }, []);

    useEffect(() => {
        if (loading) return;
        refreshRowHeights();
        const t = window.setTimeout(() => refreshRowHeights(), 120);
        return () => window.clearTimeout(t);
    }, [rows, loading, refreshRowHeights]);

    const deactivateRow = async (id) => {
        if (!(await dialog.confirm('Mark this advertisement as inactive? The record will stay in the database.', 'Deactivate Advertisement'))) return;
        try {
            await axios.delete(`/api/mwadmin/advertisements/${id}`);
            dialog.toast('Advertisement has been marked as inactive.', 'success');
            const { data } = await axios.get('/api/mwadmin/advertisements', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to deactivate advertisement.', 'error');
        }
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'view') return window.location.assign(`/mwadmin/advertisement/${id}/view`);
        if (action === 'edit') return window.location.assign(`/mwadmin/advertisement/${id}/edit`);
        if (action === 'deactivate') await deactivateRow(id);
    };

    const columns = useMemo(
        () => [
            { field: 'id', headerName: 'ID', width: 64, sortable: true, cellClass: 'mwadmin-ag-cell-vcenter' },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 118,
                sortable: false,
                cellClass: 'mwadmin-ag-cell-vcenter mwadmin-ag-cell-actions',
                cellRenderer: (params) => (
                    <MwadminActionsDropdown
                        flags={{
                            view: perms.view,
                            edit: perms.edit,
                            deactivate: perms.delete,
                        }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
            { field: 'title', headerName: 'Title', minWidth: 140, flex: 1, wrapText: true, autoHeight: true, cellClass: 'mwadmin-ag-cell-wrap' },
            { field: 'company_name', headerName: 'Company', minWidth: 140, flex: 1, wrapText: true, autoHeight: true, cellClass: 'mwadmin-ag-cell-wrap' },
            {
                field: 'image_url',
                headerName: 'Image',
                width: 100,
                cellClass: 'mwadmin-ag-cell-vcenter',
                cellRenderer: (p) =>
                    p.value ? (
                        <img src={p.value} alt="" style={{ maxWidth: '80px', maxHeight: '28px', objectFit: 'cover' }} />
                    ) : (
                        '-'
                    ),
            },
            { field: 'subcat_code', headerName: 'Subcategory', width: 110, cellClass: 'mwadmin-ag-cell-vcenter' },
            { field: 'contactperson_name', headerName: 'Contact', minWidth: 120, flex: 0.8, cellClass: 'mwadmin-ag-cell-vcenter' },
            { field: 'email', headerName: 'Email', minWidth: 140, flex: 1, wrapText: true, autoHeight: true, cellClass: 'mwadmin-ag-cell-wrap' },
            { field: 'mobile', headerName: 'Mobile', width: 100, cellClass: 'mwadmin-ag-cell-vcenter mwadmin-ag-cell-nowrap' },
            { field: 'start_date', headerName: 'Start', width: 100, cellClass: 'mwadmin-ag-cell-vcenter' },
            { field: 'end_date', headerName: 'End', width: 100, cellClass: 'mwadmin-ag-cell-vcenter' },
            {
                field: 'status',
                headerName: 'Status',
                width: 100,
                cellClass: 'mwadmin-ag-cell-vcenter',
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        [perms]
    );

    return (
        <>
            <Head title="Advertisement Listing" />
            <MwadminLayout authUser={authUser} activeMenu="advertisement">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Advertisement</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Advertisement</h1>
                    <section className="mwadmin-panel mwadmin-advertisement-grid-panel">
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
                            </div>
                            <div className="mwadmin-right-tools">
                                {perms.add ? (
                                    <Link className="mwadmin-add-btn" href="/mwadmin/advertisement/create">
                                        + Add Advertisement
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
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mwadmin-table-wrap">
                            <div className="mwadmin-filter-bar">
                                <input
                                    type="text"
                                    placeholder="Filter Company"
                                    value={columnFilters.company}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, company: e.target.value }));
                                    }}
                                />
                                <select
                                    value={columnFilters.status}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, status: e.target.value }));
                                    }}
                                >
                                    <option value="">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="In-Active">In-Active</option>
                                </select>
                                <button
                                    type="button"
                                    className="mwadmin-filter-clear"
                                    onClick={() => {
                                        setPage(1);
                                        setColumnFilters({ company: '', status: '' });
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                            <MwadminThemedAgGrid
                                className="mwadmin-advertisement-listing-grid"
                                style={{ flex: '1 1 0', minHeight: 0, height: '100%', width: '100%' }}
                            >
                                <AgGridReact
                                    rowData={rows}
                                    columnDefs={columns}
                                    defaultColDef={{ resizable: true, sortable: true, filter: false }}
                                    suppressCellFocus
                                    alwaysShowVerticalScroll
                                    rowBuffer={20}
                                    headerHeight={36}
                                    tooltipShowDelay={200}
                                    tooltipHideDelay={100}
                                    onGridReady={(e) => {
                                        gridApiRef.current = e.api;
                                        refreshRowHeights();
                                    }}
                                    onFirstDataRendered={() => refreshRowHeights()}
                                    onColumnResized={(e) => {
                                        if (e.finished) refreshRowHeights();
                                    }}
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
