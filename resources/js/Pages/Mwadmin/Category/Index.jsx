import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { canAdd, canDelete, canEdit, canViewDetail } from '../../../lib/mwadminPermissions';

export default function CategoryIndex({ authUser = {} }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ code: '', title: '', status: '' });

    const perms = useMemo(
        () => ({
            view: canViewDetail(authUser, 'category'),
            edit: canEdit(authUser, 'category'),
            deactivate: canDelete(authUser, 'category'),
            add: canAdd(authUser, 'category'),
        }),
        [authUser]
    );

    const query = useMemo(() => {
        const params =
            perPage === 'all'
                ? { search, page: 1, per_page: 'all' }
                : { search, page, per_page: perPage };
        if (columnFilters.code.trim() !== '') {
            params.filter_code = columnFilters.code.trim();
        }
        if (columnFilters.title.trim() !== '') {
            params.filter_title = columnFilters.title.trim();
        }
        if (columnFilters.status !== '') {
            params.filter_status = columnFilters.status;
        }
        return params;
    }, [search, page, perPage, columnFilters]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/categories', { params: query });
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
            if (!window.confirm('Mark this category as inactive? It will not be removed from the database.')) return;
            await axios.delete(`/api/mwadmin/categories/${id}`);
            await loadData();
        },
        [loadData]
    );

    const handleAction = useCallback(
        async (id, action) => {
            if (!action) return;
            if (action === 'view') return window.location.assign(`/mwadmin/category/${id}/view`);
            if (action === 'edit') return window.location.assign(`/mwadmin/category/${id}/edit`);
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
                    <MwadminActionsDropdown
                        flags={{
                            view: perms.view,
                            edit: perms.edit,
                            deactivate: perms.deactivate,
                        }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
            { field: 'code', headerName: 'Category Code', minWidth: 130, sortable: true },
            { field: 'title', headerName: 'Category Title', minWidth: 170, flex: 1, sortable: true },
            {
                field: 'color',
                headerName: 'Color',
                width: 110,
                cellRenderer: (params) => (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <input type="color" disabled value={params.value || '#ffffff'} />
                    </div>
                ),
            },
            {
                field: 'banner_img_url',
                headerName: 'Banner Image',
                minWidth: 140,
                cellRenderer: (params) => {
                    const src = params.value || '/images/categoryImages/bannerImages/no_img.gif';
                    return <img src={src} style={{ maxWidth: '80px', maxHeight: '28px', objectFit: 'cover' }} alt="" />;
                },
            },
            {
                field: 'box_img_url',
                headerName: 'Box Image',
                minWidth: 130,
                cellRenderer: (params) => {
                    const src = params.value || '/images/categoryImages/boxImages/no_img.gif';
                    return <img src={src} style={{ maxWidth: '80px', maxHeight: '28px', objectFit: 'cover' }} alt="" />;
                },
            },
            { field: 'sort', headerName: 'Sort', width: 90, sortable: true },
            { field: 'total_records', headerName: 'Total Records', width: 120, sortable: true },
            {
                field: 'status',
                headerName: 'Status',
                minWidth: 110,
                cellRenderer: (params) => <MwadminStatusBadge value={params.value} />,
            },
        ],
        [handleAction, perms]
    );

    return (
        <>
            <Head title="Category Listing" />
            <MwadminLayout authUser={authUser} activeMenu="category">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administration</span> <span className="sep">›</span> <span>Category</span>{' '}
                        <span className="sep">›</span> <strong>Category Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Category</h1>

                    <section className="mwadmin-panel">
                        <div className="mwadmin-toolbar">
                            <div>
                                Show
                                <select
                                    className="mwadmin-select"
                                    value={perPage === 'all' ? 'all' : String(perPage)}
                                    onChange={(e) => {
                                        setPage(1);
                                        const v = e.target.value;
                                        setPerPage(v === 'all' ? 'all' : Number(v));
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
                                    <Link className="mwadmin-add-btn" href="/mwadmin/category/create">
                                        + Add New Category
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
                                    placeholder="Filter Category Code"
                                    value={columnFilters.code}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, code: e.target.value }));
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Filter Category Title"
                                    value={columnFilters.title}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, title: e.target.value }));
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
                                    <option value="1">Active</option>
                                    <option value="0">In-Active</option>
                                </select>
                                <button
                                    type="button"
                                    className="mwadmin-filter-clear"
                                    onClick={() => {
                                        setPage(1);
                                        setColumnFilters({ code: '', title: '', status: '' });
                                    }}
                                >
                                    Clear
                                </button>
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
                            <span>
                                {perPage === 'all'
                                    ? `Showing all ${meta.total} record${meta.total === 1 ? '' : 's'}`
                                    : `Showing page ${meta.current_page} of ${meta.last_page} (${meta.total} records)`}
                            </span>
                            <div>
                                <button
                                    type="button"
                                    disabled={perPage === 'all' || page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={perPage === 'all' || page >= meta.last_page}
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