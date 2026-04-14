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

export default function RolesIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const gridApiRef = useRef(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState({ name: '', status: '' });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

    const perms = useMemo(
        () => ({
            view: canViewDetail(authUser, 'roles'),
            edit: canEdit(authUser, 'roles'),
            deactivate: canDelete(authUser, 'roles'),
            add: canAdd(authUser, 'roles'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            search,
            page,
            per_page: perPage,
            filter_name: columnFilters.name,
            filter_status: columnFilters.status,
        }),
        [search, page, perPage, columnFilters]
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/roles', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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

    const rowRange = useMemo(() => {
        const total = meta.total || 0;
        if (total === 0) return { from: 0, to: 0 };
        if (perPage === 'all') return { from: 1, to: total };
        const p = Math.max(1, parseInt(String(perPage), 10) || 10);
        const current = meta.current_page || 1;
        const from = (current - 1) * p + 1;
        const to = Math.min(current * p, total);
        return { from, to };
    }, [meta.total, meta.current_page, perPage]);

    const deactivateRole = async (id) => {
        if (
            !(await dialog.confirm(
                'Mark this role as inactive? It will stay in the database but will not be offered for new user assignments.',
                'Deactivate Role'
            ))
        ) {
            return;
        }
        try {
            await axios.delete(`/api/mwadmin/roles/${id}`);
            dialog.toast('Role has been marked as inactive.', 'success');
            await loadData();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to deactivate role.';
            dialog.toast(msg, 'error');
        }
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'view') return window.location.assign(`/mwadmin/roles/${id}/view`);
        if (action === 'edit') return window.location.assign(`/mwadmin/roles/${id}/edit`);
        if (action === 'deactivate') await deactivateRole(id);
    };

    const columns = useMemo(
        () => [
            {
                field: 'arid',
                headerName: 'ID',
                width: 70,
                minWidth: 70,
                maxWidth: 85,
                sortable: true,
                cellClass: 'mwadmin-ag-cell-vcenter',
            },
            {
                colId: 'actions',
                headerName: 'Actions',
                width: 132,
                minWidth: 120,
                maxWidth: 148,
                sortable: false,
                filter: false,
                cellClass: 'mwadmin-ag-cell-vcenter mwadmin-ag-cell-actions',
                cellRenderer: (params) => (
                    <MwadminActionsDropdown
                        flags={{
                            view: perms.view,
                            edit: perms.edit,
                            deactivate: perms.deactivate,
                        }}
                        onAction={(a) => handleAction(params.data.arid, a)}
                    />
                ),
            },
            {
                field: 'rolename',
                headerName: 'Role',
                minWidth: 200,
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellClass: 'mwadmin-ag-cell-wrap',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'description',
                headerName: 'Description',
                minWidth: 220,
                flex: 1.4,
                wrapText: true,
                autoHeight: true,
                cellClass: 'mwadmin-ag-cell-wrap',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'usercount',
                headerName: 'Total Users',
                width: 120,
                minWidth: 110,
                maxWidth: 140,
                type: 'rightAligned',
                cellClass: 'mwadmin-ag-cell-vcenter',
            },
            {
                field: 'status',
                headerName: 'Status',
                minWidth: 110,
                flex: 0.8,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        [perms]
    );

    return (
        <>
            <Head title="Roles Listing" />
            <MwadminLayout authUser={authUser} activeMenu="roles">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Roles</span>{' '}
                        <span className="sep">›</span> <strong>Role Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Roles</h1>
                    <section className="mwadmin-panel mwadmin-roles-grid-panel">
                        <div className="mwadmin-toolbar">
                            <div>
                                Show
                                <select className="mwadmin-select" value={perPage} onChange={(e) => { setPage(1); setPerPage(e.target.value); }}>
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value="all">All</option>
                                </select>
                            </div>
                            <div className="mwadmin-right-tools">
                                {perms.add ? (
                                    <Link className="mwadmin-add-btn" href="/mwadmin/roles/create">
                                        + Add New Role
                                    </Link>
                                ) : null}
                                <div className="mwadmin-search">Search:
                                    <input type="text" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
                                </div>
                            </div>
                        </div>
                        <div className="mwadmin-table-wrap">
                            <div className="mwadmin-filter-bar">
                                <input
                                    type="text"
                                    placeholder="Filter role or description"
                                    value={columnFilters.name}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, name: e.target.value }));
                                    }}
                                />
                                <select
                                    value={columnFilters.status}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, status: e.target.value }));
                                    }}
                                >
                                    <option value="">All Status</option><option value="Active">Active</option><option value="In-Active">In-Active</option>
                                </select>
                                <button type="button" className="mwadmin-filter-clear" onClick={() => { setPage(1); setColumnFilters({ name: '', status: '' }); }}>
                                    Clear
                                </button>
                            </div>
                            <MwadminThemedAgGrid
                                className="mwadmin-roles-listing-grid"
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
                                Rows {rowRange.from}–{rowRange.to} of {meta.total}
                                {perPage !== 'all' && meta.last_page > 1
                                    ? ` · Page ${meta.current_page} of ${meta.last_page}`
                                    : ''}
                                {meta.total !== 1 ? ' records' : ' record'}
                            </span>
                            <div>
                                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                                <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</button>
                            </div>
                        </div>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
