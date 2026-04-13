import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';

export default function SponsorCategoryIndex({ authUser = {} }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ name: '', status: '' });

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

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/sponsorcategories', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const deleteRow = useCallback(
        async (id) => {
            if (!window.confirm('Mark this sponsor category as inactive? It will not be removed from the database.')) return;
            await axios.delete(`/api/mwadmin/sponsorcategories/${id}`);
            await loadData();
        },
        [loadData]
    );

    const handleAction = useCallback(
        async (id, action) => {
            if (!action) return;
            if (action === 'view') return window.location.assign(`/mwadmin/sponsorcategory/${id}/view`);
            if (action === 'edit') return window.location.assign(`/mwadmin/sponsorcategory/${id}/edit`);
            if (action === 'deactivate') await deleteRow(id);
        },
        [deleteRow]
    );

    const columns = useMemo(
        () => [
            { field: 'id', headerName: 'ID', width: 80, sortable: true },
            {
                field: 'actions',
                headerName: 'Actions',
                minWidth: 130,
                sortable: false,
                filter: false,
                cellRenderer: (params) => (
                    <select
                        className="mwadmin-grid-action"
                        defaultValue=""
                        onChange={(e) => {
                            const selectedAction = e.target.value;
                            e.target.value = '';
                            if (selectedAction) handleAction(params.data.id, selectedAction);
                        }}
                    >
                        <option value="">Actions</option>
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="deactivate">Deactivate</option>
                    </select>
                ),
            },
            { field: 'name', headerName: 'Category Name', flex: 1, minWidth: 200, sortable: true },
            { field: 'note', headerName: 'Note(s)', flex: 2, minWidth: 220, sortable: false },
            {
                field: 'status',
                headerName: 'Status',
                minWidth: 110,
                cellRenderer: (params) => <MwadminStatusBadge value={params.value} />,
            },
        ],
        [handleAction]
    );

    return (
        <>
            <Head title="Sponsor Category Listing" />
            <MwadminLayout authUser={authUser} activeMenu="sponsorcategory">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor Category</span>{' '}
                        <span className="sep">›</span> <strong>Sponsor Category Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Sponsor Category</h1>
                    <section className="mwadmin-panel mwadmin-sponsorcategory-grid-panel">
                        <div className="mwadmin-toolbar">
                            <div>
                                Show
                                <select className="mwadmin-select" value={perPage} onChange={(e) => { setPage(1); setPerPage(e.target.value); }}>
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value="all">All</option>
                                </select>
                            </div>
                            <div className="mwadmin-right-tools">
                                <Link className="mwadmin-add-btn" href="/mwadmin/sponsorcategory/create">+ Add New Sponsor Category</Link>
                                <div className="mwadmin-search">Search:
                                    <input type="text" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
                                </div>
                            </div>
                        </div>
                        <div className="mwadmin-table-wrap">
                            <div className="mwadmin-filter-bar">
                                <input type="text" placeholder="Filter Category Name" value={columnFilters.name} onChange={(e) => { setPage(1); setColumnFilters((s) => ({ ...s, name: e.target.value })); }} />
                                <select value={columnFilters.status} onChange={(e) => { setPage(1); setColumnFilters((s) => ({ ...s, status: e.target.value })); }}>
                                    <option value="">All Status</option><option value="Active">Active</option><option value="In-Active">In-Active</option>
                                </select>
                                <button type="button" className="mwadmin-filter-clear" onClick={() => { setPage(1); setColumnFilters({ name: '', status: '' }); }}>Clear</button>
                            </div>
                            <MwadminThemedAgGrid>
                                <AgGridReact
                                    rowData={rows}
                                    columnDefs={columns}
                                    defaultColDef={{ resizable: true, sortable: true, filter: false }}
                                    suppressCellFocus
                                    rowHeight={46}
                                    headerHeight={42}
                                    overlayNoRowsTemplate={loading ? 'Loading...' : 'No data available in table'}
                                />
                            </MwadminThemedAgGrid>
                        </div>
                        <div className="mwadmin-pagination">
                            <span>Showing page {meta.current_page} of {meta.last_page} ({meta.total} records)</span>
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