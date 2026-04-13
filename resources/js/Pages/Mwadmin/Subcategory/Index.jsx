import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';

export default function SubcategoryIndex({ authUser = {} }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ code: '', name: '', status: '' });
    const query = useMemo(() => ({ search, page, per_page: perPage }), [search, page, perPage]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/subcategories', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [query]);

    const deleteRow = async (id) => {
        if (!window.confirm('Delete this sub-category?')) return;
        await axios.delete(`/api/mwadmin/subcategories/${id}`);
        await loadData();
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'view') return window.location.assign(`/mwadmin/subcategory/${id}/view`);
        if (action === 'edit') return window.location.assign(`/mwadmin/subcategory/${id}/edit`);
        if (action === 'delete') await deleteRow(id);
    };

    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            const statusLabel = Number(r.status) === 1 ? 'Active' : 'In-Active';
            const matchCode = !columnFilters.code || String(r.subcat_code || '').toLowerCase().includes(columnFilters.code.toLowerCase());
            const matchName = !columnFilters.name || String(r.name || '').toLowerCase().includes(columnFilters.name.toLowerCase());
            const matchStatus = !columnFilters.status || statusLabel === columnFilters.status;
            return matchCode && matchName && matchStatus;
        });
    }, [rows, columnFilters]);

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
                        <option value="delete">Delete</option>
                    </select>
                ),
            },
            { field: 'subcat_code', headerName: 'Sub Category Code', minWidth: 140, sortable: true },
            { field: 'name', headerName: 'Sub Category Name', minWidth: 170, sortable: true },
            { field: 'category_title', headerName: 'Category Title', minWidth: 150, sortable: true },
            {
                field: 'color',
                headerName: 'Color',
                width: 110,
                cellRenderer: (params) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <input type="color" disabled value={params.value || '#ffffff'} />
                    </div>
                ),
            },
            { field: 'sort', headerName: 'Sort', width: 90, sortable: true },
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
                minWidth: 120,
                cellRenderer: (params) => {
                    const src = params.value || '/images/categoryImages/boxImages/no_img.gif';
                    return <img src={src} style={{ maxWidth: '80px', maxHeight: '28px', objectFit: 'cover' }} alt="" />;
                },
            },
            {
                field: 'status',
                headerName: 'Status',
                minWidth: 110,
                cellRenderer: (params) => <MwadminStatusBadge value={params.value} />,
            },
        ],
        []
    );

    return (
        <>
            <Head title="Sub-Category Listing" />
            <MwadminLayout authUser={authUser} activeMenu="subcategory">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administration</span> <span className="sep">›</span> <span>Sub-Category</span>{' '}
                        <span className="sep">›</span> <strong>Sub-Category Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Sub-Category</h1>
                    <section className="mwadmin-panel">
                        <div className="mwadmin-toolbar">
                            <div>
                                Show
                                <select className="mwadmin-select" value={perPage} onChange={(e) => { setPage(1); setPerPage(Number(e.target.value)); }}>
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                                </select>
                            </div>
                            <div className="mwadmin-right-tools">
                                <Link className="mwadmin-add-btn" href="/mwadmin/subcategory/create">+ Add New Sub-Category</Link>
                                <div className="mwadmin-search">Search:
                                    <input type="text" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
                                </div>
                            </div>
                        </div>
                        <div className="mwadmin-table-wrap">
                            <div className="mwadmin-filter-bar">
                                <input type="text" placeholder="Sub category code" value={columnFilters.code} onChange={(e) => setColumnFilters((s) => ({ ...s, code: e.target.value }))} />
                                <input type="text" placeholder="Sub category name" value={columnFilters.name} onChange={(e) => setColumnFilters((s) => ({ ...s, name: e.target.value }))} />
                                <select value={columnFilters.status} onChange={(e) => setColumnFilters((s) => ({ ...s, status: e.target.value }))}>
                                    <option value="">All Status</option><option value="Active">Active</option><option value="In-Active">In-Active</option>
                                </select>
                                <button type="button" className="mwadmin-filter-clear" onClick={() => setColumnFilters({ code: '', name: '', status: '' })}>Clear</button>
                            </div>
                            <MwadminThemedAgGrid>
                                <AgGridReact
                                    rowData={filteredRows}
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