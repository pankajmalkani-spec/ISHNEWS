import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';

export default function FlowchartIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
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

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/flowcharts', { params: query });
                if (!canceled) {
                    setRows(data.data || []);
                    setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
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

    const deleteRow = async (id) => {
        if (!(await dialog.confirm('Delete this flow chart?', 'Delete Flow Chart'))) return;
        try {
            await axios.delete(`/api/mwadmin/flowcharts/${id}`);
            dialog.toast('Flow chart deleted successfully.', 'success');
            const { data } = await axios.get('/api/mwadmin/flowcharts', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            const msg = err?.response?.data?.message || 'Unable to delete.';
            dialog.toast(msg, 'error');
        }
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'view') return window.location.assign(`/mwadmin/flowchart/${id}/view`);
        if (action === 'edit') return window.location.assign(`/mwadmin/flowchart/${id}/edit`);
        if (action === 'delete') await deleteRow(id);
    };

    const columns = useMemo(
        () => [
            { field: 'id', headerName: 'ID', width: 64, sortable: true },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 118,
                sortable: false,
                cellRenderer: (params) => (
                    <select
                        className="mwadmin-grid-action"
                        defaultValue=""
                        onChange={(e) => {
                            const a = e.target.value;
                            e.target.value = '';
                            if (a) handleAction(params.data.id, a);
                        }}
                    >
                        <option value="">Actions</option>
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="delete">Delete</option>
                    </select>
                ),
            },
            { field: 'flowchart_name', headerName: 'Name', minWidth: 160, flex: 1 },
            { field: 'description', headerName: 'Description', minWidth: 180, flex: 1.2 },
            { field: 'defined_by_name', headerName: 'Defined By', minWidth: 140, flex: 0.9 },
            {
                field: 'status',
                headerName: 'Status',
                width: 100,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        []
    );

    return (
        <>
            <Head title="Flow Chart Listing" />
            <MwadminLayout authUser={authUser} activeMenu="flowchart">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Flow Chart</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Flow Chart</h1>
                    <section className="mwadmin-panel">
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
                                <Link className="mwadmin-add-btn" href="/mwadmin/flowchart/create">
                                    + Add Flow Chart
                                </Link>
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
                                    placeholder="Filter Name"
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
                                    <option value="">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="In-Active">In-Active</option>
                                </select>
                                <button
                                    type="button"
                                    className="mwadmin-filter-clear"
                                    onClick={() => {
                                        setPage(1);
                                        setColumnFilters({ name: '', status: '' });
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                            <MwadminThemedAgGrid style={{ height: 560 }}>
                                <AgGridReact
                                    rowData={rows}
                                    columnDefs={columns}
                                    defaultColDef={{ resizable: true, sortable: true, filter: false }}
                                    suppressCellFocus
                                    rowHeight={32}
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
