import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { canAdd, canDelete, canEdit } from '../../../lib/mwadminPermissions';

export default function DesignationIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ designation: '', status: '' });

    const perms = useMemo(
        () => ({
            edit: canEdit(authUser, 'designation'),
            delete: canDelete(authUser, 'designation'),
            add: canAdd(authUser, 'designation'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            search,
            page,
            per_page: perPage,
            filter_designation: columnFilters.designation,
            filter_status: columnFilters.status,
        }),
        [search, page, perPage, columnFilters]
    );

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/designations', { params: query });
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
        if (!(await dialog.confirm('Delete this designation?', 'Delete Designation'))) return;
        await axios.delete(`/api/mwadmin/designations/${id}`);
        dialog.toast('Designation deleted successfully.', 'success');
        const { data } = await axios.get('/api/mwadmin/designations', { params: query });
        setRows(data.data || []);
        setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'edit') return window.location.assign(`/mwadmin/designation/${id}/edit`);
        if (action === 'delete') await deleteRow(id);
    };

    const columns = useMemo(
        () => [
            { field: 'id', headerName: 'ID', width: 70, minWidth: 70, maxWidth: 80, sortable: true },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 130,
                minWidth: 120,
                maxWidth: 140,
                sortable: false,
                cellRenderer: (params) => (
                    <MwadminActionsDropdown
                        flags={{ edit: perms.edit, delete: perms.delete }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
            { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 200, sortable: true },
            { field: 'description', headerName: 'Description', flex: 1.2, minWidth: 200, sortable: false },
            {
                field: 'status',
                headerName: 'Status',
                width: 110,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        [perms]
    );

    return (
        <>
            <Head title="Designation Listing" />
            <MwadminLayout authUser={authUser} activeMenu="designation">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Designation</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Designation</h1>
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
                                {perms.add ? (
                                    <Link className="mwadmin-add-btn" href="/mwadmin/designation/create">
                                        + Add Designation
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
                                    placeholder="Filter Designation"
                                    value={columnFilters.designation}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, designation: e.target.value }));
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
                                        setColumnFilters({ designation: '', status: '' });
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
