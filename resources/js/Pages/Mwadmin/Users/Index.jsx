import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { canAdd, canDelete, canEdit, canViewDetail } from '../../../lib/mwadminPermissions';

function formatApiErrors(err) {
    const d = err?.response?.data;
    if (d?.errors && typeof d.errors === 'object') {
        const lines = Object.entries(d.errors).flatMap(([key, val]) => {
            const msgs = Array.isArray(val) ? val : [String(val)];
            return msgs.map((m) => `${key}: ${m}`);
        });
        return lines.join('\n');
    }
    if (typeof d?.message === 'string') return d.message;
    return err?.message || 'Request failed.';
}

export default function UsersIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

    const perms = useMemo(
        () => ({
            view: canViewDetail(authUser, 'users'),
            edit: canEdit(authUser, 'users'),
            resetPwd: canEdit(authUser, 'users'),
            deactivate: canDelete(authUser, 'users'),
            add: canAdd(authUser, 'users'),
        }),
        [authUser]
    );

    const query = useMemo(() => {
        if (perPage === 'all') {
            return { search, page: 1, per_page: 'all' };
        }
        return { search, page, per_page: perPage };
    }, [search, page, perPage]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/users', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setLoading(false);
        }
    }, [query, dialog]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const deactivateRow = useCallback(
        async (id) => {
            const ok = await dialog.confirm(
                'Mark this user as inactive? The account will stay in the database and can be reactivated from Edit.',
                'Deactivate User'
            );
            if (!ok) return;
            try {
                await axios.delete(`/api/mwadmin/users/${id}`);
                dialog.toast('User has been marked as inactive.', 'success');
                await loadData();
            } catch (err) {
                dialog.toast(formatApiErrors(err), 'error');
            }
        },
        [dialog, loadData]
    );

    const resetPassword = useCallback(
        async (id) => {
            const next = await dialog.prompt('Enter new password (min 4 characters).', 'Reset Password', '');
            if (next == null) return;
            const trimmed = String(next).trim();
            if (trimmed.length < 4) {
                dialog.toast('Password must be at least 4 characters.', 'error');
                return;
            }
            try {
                await axios.post(`/api/mwadmin/users/${id}/reset-password`, { new_password: trimmed });
                dialog.toast('Password changed successfully.', 'success');
            } catch (err) {
                dialog.toast(formatApiErrors(err), 'error');
            }
        },
        [dialog]
    );

    const handleAction = useCallback(
        async (id, action) => {
            if (!action) return;
            if (action === 'view') return window.location.assign(`/mwadmin/users/${id}/view`);
            if (action === 'edit') return window.location.assign(`/mwadmin/users/${id}/edit`);
            if (action === 'resetpwd') return resetPassword(id);
            if (action === 'deactivate') await deactivateRow(id);
        },
        [deactivateRow, resetPassword]
    );

    const selfUserId = authUser?.user_id ?? 0;

    const columns = useMemo(
        () => [
            { field: 'userid', headerName: 'ID', width: 70, minWidth: 70, maxWidth: 80, sortable: true },
            {
                field: 'actions',
                headerName: 'Actions',
                width: 130,
                minWidth: 120,
                maxWidth: 150,
                sortable: false,
                filter: false,
                cellRenderer: (params) => {
                    const uid = params.data.userid;
                    const isSelf = selfUserId > 0 && uid === selfUserId;
                    return (
                        <MwadminActionsDropdown
                            flags={{
                                view: perms.view,
                                edit: perms.edit,
                                resetPassword: perms.resetPwd,
                                deactivate: perms.deactivate && !isSelf,
                            }}
                            onAction={(a) => handleAction(uid, a)}
                        />
                    );
                },
            },
            { field: 'name', headerName: 'Name', minWidth: 170, flex: 1 },
            { field: 'username', headerName: 'User-Name', minWidth: 130, flex: 0.8 },
            { field: 'designation', headerName: 'Designation', minWidth: 140, flex: 0.9 },
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
                minWidth: 110,
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        [handleAction, selfUserId, perms]
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
                    <section className="mwadmin-panel mwadmin-users-grid-panel">
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
                                    <Link className="mwadmin-add-btn" href="/mwadmin/users/create">
                                        + Add New User
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
