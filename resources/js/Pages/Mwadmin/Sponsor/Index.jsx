import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { canAdd, canDelete, canEdit, canViewDetail } from '../../../lib/mwadminPermissions';

export default function SponsorIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ org: '', status: '' });

    const perms = useMemo(
        () => ({
            view: canViewDetail(authUser, 'sponsor'),
            edit: canEdit(authUser, 'sponsor'),
            delete: canDelete(authUser, 'sponsor'),
            add: canAdd(authUser, 'sponsor'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            search,
            page,
            per_page: perPage,
            filter_organization: columnFilters.org,
            filter_status: columnFilters.status,
        }),
        [search, page, perPage, columnFilters]
    );

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/sponsors', { params: query });
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
        if (!(await dialog.confirm('Delete this sponsor?', 'Delete Sponsor'))) return;
        await axios.delete(`/api/mwadmin/sponsors/${id}`);
        dialog.toast('Sponsor deleted successfully.', 'success');
        const { data } = await axios.get('/api/mwadmin/sponsors', { params: query });
        setRows(data.data || []);
        setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'view') return window.location.assign(`/mwadmin/sponsor/${id}/view`);
        if (action === 'edit') return window.location.assign(`/mwadmin/sponsor/${id}/edit`);
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
                    <MwadminActionsDropdown
                        flags={{
                            view: perms.view,
                            edit: perms.edit,
                            delete: perms.delete,
                        }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
            { field: 'category_name', headerName: 'Sponsor Category', minWidth: 140, flex: 0.9 },
            { field: 'organization_name', headerName: 'Organization', minWidth: 160, flex: 1 },
            {
                field: 'logo_url',
                headerName: 'Logo',
                width: 100,
                cellRenderer: (p) =>
                    p.value ? (
                        <img src={p.value} alt="" style={{ maxWidth: '80px', maxHeight: '28px', objectFit: 'cover' }} />
                    ) : (
                        '-'
                    ),
            },
            { field: 'website', headerName: 'Website', minWidth: 160, flex: 1 },
            { field: 'contact_name', headerName: 'Contact', minWidth: 120, flex: 0.8 },
            { field: 'email', headerName: 'Email', minWidth: 160, flex: 1 },
            { field: 'mobile', headerName: 'Mobile', width: 110 },
            { field: 'amount_sponsored', headerName: 'Amount', width: 90 },
            { field: 'start_date', headerName: 'Start', width: 100 },
            { field: 'end_date', headerName: 'End', width: 100 },
            {
                field: 'status',
                headerName: 'Status',
                width: 100,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        [perms]
    );

    return (
        <>
            <Head title="Sponsor Listing" />
            <MwadminLayout authUser={authUser} activeMenu="sponsor">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Sponsor</h1>
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
                                    <Link className="mwadmin-add-btn" href="/mwadmin/sponsor/create">
                                        + Add Sponsor
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
                                    placeholder="Filter Organization"
                                    value={columnFilters.org}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, org: e.target.value }));
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
                                        setColumnFilters({ org: '', status: '' });
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
