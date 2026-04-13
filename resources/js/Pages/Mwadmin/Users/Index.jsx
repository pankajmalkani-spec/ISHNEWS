import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';

export default function UsersIndex({ authUser = {} }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

    const query = useMemo(() => ({ search, page, per_page: perPage }), [search, page, perPage]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/users', { params: query });
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
        if (!window.confirm('Delete this user?')) return;
        await axios.delete(`/api/mwadmin/users/${id}`);
        await loadData();
    };

    const resetPassword = async (id) => {
        const next = window.prompt('Enter new password');
        if (!next) return;
        await axios.post(`/api/mwadmin/users/${id}/reset-password`, { new_password: next });
        window.alert('Password reset successfully.');
    };

    const handleAction = async (id, action) => {
        if (!action) return;
        if (action === 'view') return window.location.assign(`/mwadmin/users/${id}/view`);
        if (action === 'edit') return window.location.assign(`/mwadmin/users/${id}/edit`);
        if (action === 'resetpwd') return resetPassword(id);
        if (action === 'delete') await deleteRow(id);
    };

    const columns = useMemo(
        () => [
            { field: 'userid', headerName: 'ID', width: 70, minWidth: 70, maxWidth: 80, sortable: true },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 130,
                minWidth: 120,
                maxWidth: 140,
                sortable: false,
                filter: false,
                cellRenderer: (params) => (
                    <select
                        className="mwadmin-grid-action"
                        defaultValue=""
                        onChange={(e) => {
                            const selectedAction = e.target.value;
                            e.target.value = '';
                            if (selectedAction) handleAction(params.data.userid, selectedAction);
                        }}
                    >
                        <option value="">Actions</option>
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="resetpwd">Reset Password</option>
                        <option value="delete">Delete</option>
                    </select>
                ),
            },
            { field: 'name', headerName: 'Name', minWidth: 170, flex: 1 },
            { field: 'username', headerName: 'User-Name', minWidth: 130 },
            { field: 'designation', headerName: 'Designation', minWidth: 140 },
            { field: 'email', headerName: 'Email ID', minWidth: 180, flex: 1.2 },
            { field: 'p2d_intials', headerName: 'P2D Initials', minWidth: 100 },
            {
                field: 'profile_photo_url',
                headerName: 'Profile Photo',
                minWidth: 110,
                cellRenderer: (params) => {
                    const src = params.value || '/images/categoryImages/boxImages/no_img.gif';
                    return <img src={src} style={{ width: '60px', height: '36px', objectFit: 'cover' }} alt="" />;
                },
            },
            {
                field: 'status',
                headerName: 'Status',
                minWidth: 100,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        []
    );

    return (
        <>
            <Head title="Users Listing" />
            <MwadminLayout authUser={authUser} activeMenu="users">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Users</span>{' '}
                        <span className="sep">›</span> <strong>Users Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Manage Users</h1>
                    <section className="mwadmin-panel">
                        <div className="mwadmin-toolbar">
                            <div>
                                Show
                                <select className="mwadmin-select" value={perPage} onChange={(e) => { setPage(1); setPerPage(e.target.value); }}>
                                    <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value="all">All</option>
                                </select>
                            </div>
                            <div className="mwadmin-right-tools">
                                <Link className="mwadmin-add-btn" href="/mwadmin/users/create">+ Add New User</Link>
                                <div className="mwadmin-search">Search:
                                    <input type="text" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
                                </div>
                            </div>
                        </div>
                        <div className="mwadmin-table-wrap">
                            <MwadminThemedAgGrid>
                                <AgGridReact
                                    rowData={rows}
                                    columnDefs={columns}
                                    defaultColDef={{ resizable: true, sortable: true, filter: false }}
                                    suppressCellFocus
                                    rowHeight={36}
                                    headerHeight={38}
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