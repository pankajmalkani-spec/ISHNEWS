import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { canDelete, canExport } from '../../../lib/mwadminPermissions';

export default function NewsletterIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState('10');
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [columnFilters, setColumnFilters] = useState({ email: '', status: '' });
    const [selectedIds, setSelectedIds] = useState([]);

    const perms = useMemo(
        () => ({
            delete: canDelete(authUser, 'newsletter'),
            export: canExport(authUser, 'newsletter'),
        }),
        [authUser]
    );

    const query = useMemo(
        () => ({
            search,
            page,
            per_page: perPage,
            filter_email: columnFilters.email,
            filter_status: columnFilters.status,
        }),
        [search, page, perPage, columnFilters]
    );

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/newsletters', { params: query });
                if (!canceled) {
                    setRows(data.data || []);
                    setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
                }
            } catch (err) {
                if (!canceled) {
                    dialog.toast(err?.response?.data?.message || 'Unable to load newsletters.', 'error');
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

    const toggleId = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const allOnPageSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

    const toggleAllOnPage = () => {
        const pageIds = rows.map((r) => r.id);
        if (allOnPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
        } else {
            setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
        }
    };

    const deleteRow = async (id, email) => {
        const ok = await dialog.confirm(
            `Are you sure you want to delete email '${email}'?`,
            'Confirm'
        );
        if (!ok) return;
        try {
            await axios.delete(`/api/mwadmin/newsletters/${id}`);
            dialog.toast('Email Id deleted successfully.', 'success');
            const { data } = await axios.get('/api/mwadmin/newsletters', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
            setSelectedIds((prev) => prev.filter((x) => x !== id));
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to delete newsletter entry.', 'error');
        }
    };

    const handleAction = async (id, email, action) => {
        if (!action) return;
        if (action === 'delete') await deleteRow(id, email);
    };

    const exportExcel = async () => {
        const ok = await dialog.confirm('Are you sure you want to Export?', 'Confirm');
        if (!ok) return;
        try {
            const payload = selectedIds.length > 0 ? { ids: selectedIds } : {};
            const { data } = await axios.post('/api/mwadmin/newsletters/export', payload, {
                responseType: 'blob',
            });
            const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'NewsletterExports.xls';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            dialog.toast('Export failed.', 'error');
        }
    };

    const columns = useMemo(() => {
        const checkboxCol = {
            colId: 'newsletterRowSelect',
            headerName: '',
            width: 48,
            minWidth: 48,
            maxWidth: 52,
            sortable: false,
            headerComponent: () => (
                <label className="mwadmin-grid-checkbox">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} />
                </label>
            ),
            cellRenderer: (params) => (
                <label className="mwadmin-grid-checkbox">
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(params.data.id)}
                        onChange={() => toggleId(params.data.id)}
                    />
                </label>
            ),
        };
        const rest = [
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
                        flags={{ delete: perms.delete }}
                        onAction={(a) => handleAction(params.data.id, params.data.email, a)}
                    />
                ),
            },
            { field: 'email', headerName: 'Email', flex: 1.4, minWidth: 240, sortable: true },
            {
                field: 'status',
                headerName: 'Status',
                width: 120,
                minWidth: 100,
                maxWidth: 130,
                cellRenderer: (params) => <MwadminStatusBadge value={params.value} />,
            },
        ];
        return perms.export ? [checkboxCol, ...rest] : rest;
    }, [allOnPageSelected, selectedIds, rows, perms]);

    return (
        <>
            <Head title="Newsletter Listing" />
            <MwadminLayout authUser={authUser} activeMenu="newsletter">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Newsletter</span>{' '}
                        <span className="sep">›</span> <strong>Newsletter Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Manage Newsletter</h1>
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
                                {perms.export ? (
                                    <button type="button" className="mwadmin-export-btn" onClick={exportExcel}>
                                        Export to Excel
                                    </button>
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
                                    placeholder="Filter Email"
                                    value={columnFilters.email}
                                    onChange={(e) => {
                                        setPage(1);
                                        setColumnFilters((s) => ({ ...s, email: e.target.value }));
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
                                        setColumnFilters({ email: '', status: '' });
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
