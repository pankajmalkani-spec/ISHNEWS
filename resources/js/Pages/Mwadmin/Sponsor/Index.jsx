import { Head, Link, usePage } from '@inertiajs/react';
import { AgGridReact } from 'ag-grid-react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminActionsDropdown from '../../../Components/Mwadmin/MwadminActionsDropdown';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import MwadminThemedAgGrid from '../../../Components/Mwadmin/MwadminThemedAgGrid';
import { canAdd, canDelete, canEdit, canViewDetail } from '../../../lib/mwadminPermissions';
import { formatSponsorDateDisplay } from './sponsorDateFormat';

function encodeLogoPathSegments(rel) {
    const parts = String(rel)
        .split('/')
        .filter((p) => p !== '' && p !== '.');
    if (!parts.length) return '';
    return parts
        .map((p) => {
            try {
                return encodeURIComponent(decodeURIComponent(p));
            } catch {
                return encodeURIComponent(p);
            }
        })
        .join('/');
}

/**
 * Resolves logo URL for grid rows (API logo_url is absolute via Laravel asset(), or raw logo filename).
 * @param {string} [publicRoot] — from Inertia mwadminPublicRoot when building paths in the browser
 */
function sponsorListingLogoSrc(data, publicRoot = '') {
    const root = typeof publicRoot === 'string' ? publicRoot.replace(/\/$/, '') : '';
    const withRoot = (path) => {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        if (root) return `${root}${path.startsWith('/') ? path : `/${path}`}`;
        if (typeof window !== 'undefined') return new URL(path.startsWith('/') ? path : `/${path}`, window.location.origin).href;
        return path;
    };

    const fromApi = data?.logo_url;
    if (fromApi && String(fromApi).trim()) {
        const u = String(fromApi).trim();
        if (/^https?:\/\//i.test(u)) return u;
        if (u.startsWith('//') && typeof window !== 'undefined') return `${window.location.protocol}${u}`;
        if (u.startsWith('/')) {
            const m = u.match(/^\/images\/sponsorLogo\/(.+)$/i);
            if (m) {
                const enc = encodeLogoPathSegments(m[1]);
                return enc ? withRoot(`/images/sponsorLogo/${enc}`) : '';
            }
            return withRoot(u);
        }
        return u;
    }
    const logo = data?.logo;
    if (logo == null || String(logo).trim() === '') {
        return '';
    }
    let t = String(logo).trim().replace(/^\.+\/+/, '');
    t = t.replace(/\\/g, '/');
    if (/^https?:\/\//i.test(t)) return t;
    if (t.startsWith('//') && typeof window !== 'undefined') return `${window.location.protocol}${t}`;
    if (t.startsWith('/')) {
        const m = t.match(/^\/images\/sponsorLogo\/(.+)$/i);
        if (m) {
            const enc = encodeLogoPathSegments(m[1]);
            return enc ? withRoot(`/images/sponsorLogo/${enc}`) : '';
        }
        return withRoot(t);
    }
    const m = t.match(/(?:^|\/)images\/sponsorLogo\/(.+)$/i);
    const inner = m ? m[1] : t.replace(/^.*[/\\]/, '').trim();
    if (!inner) return '';
    const enc = encodeLogoPathSegments(inner);
    return enc ? withRoot(`/images/sponsorLogo/${enc}`) : '';
}

/** Placeholder asset under `public/images/sponsorLogo/` (same style as category `no_img.gif`). */
function sponsorListingNoLogoPlaceholderSrc(publicRoot = '') {
    const path = '/images/sponsorLogo/no_img.gif';
    const root = typeof publicRoot === 'string' ? publicRoot.replace(/\/$/, '') : '';
    if (root) return `${root}${path}`;
    if (typeof window !== 'undefined') return new URL(path, window.location.origin).href;
    return path;
}

const logoThumbWrap = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
};

const logoThumbImg = { maxWidth: '88px', maxHeight: '32px', objectFit: 'contain' };

/**
 * Preload in an effect so React Strict Mode / AG Grid remounts do not fire spurious img onError
 * (which was hiding real logos as “No image”).
 */
function SponsorListingLogoCell({ src, publicRoot }) {
    const placeholderSrc = sponsorListingNoLogoPlaceholderSrc(publicRoot);
    const [phase, setPhase] = useState(() => (src ? 'check' : 'empty'));

    useEffect(() => {
        if (!src) {
            setPhase('empty');
            return;
        }
        setPhase('check');
        const img = new Image();
        let canceled = false;
        img.onload = () => {
            if (!canceled) setPhase('ok');
        };
        img.onerror = () => {
            if (!canceled) setPhase('bad');
        };
        img.src = src;
        return () => {
            canceled = true;
        };
    }, [src]);

    if (phase === 'empty' || phase === 'bad') {
        return (
            <div style={logoThumbWrap}>
                <img src={placeholderSrc} alt="" style={logoThumbImg} />
            </div>
        );
    }
    if (phase === 'check') {
        return (
            <span className="mwadmin-grid-action-muted" style={{ fontSize: 10, opacity: 0.65 }}>
                …
            </span>
        );
    }
    return (
        <div style={logoThumbWrap}>
            <img src={src} alt="" style={logoThumbImg} />
        </div>
    );
}

export default function SponsorIndex({ authUser = {} }) {
    const { mwadminPublicRoot = '' } = usePage().props;
    const dialog = useClassicDialog();
    const gridApiRef = useRef(null);
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

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/mwadmin/sponsors', { params: query });
            setRows(data.data || []);
            setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to load sponsors.', 'error');
        } finally {
            setLoading(false);
        }
    }, [query, dialog]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

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

    const deactivateRow = useCallback(
        async (id) => {
            const ok = await dialog.confirm(
                'Mark this sponsor as inactive? The record stays in the database and can be set to Active again from Edit.',
                'Deactivate Sponsor'
            );
            if (!ok) return;
            try {
                await axios.delete(`/api/mwadmin/sponsors/${id}`);
                dialog.toast('Sponsor has been marked as inactive.', 'success');
                await loadRows();
            } catch (err) {
                dialog.toast(err?.response?.data?.message || 'Unable to deactivate sponsor.', 'error');
            }
        },
        [dialog, loadRows]
    );

    const handleAction = useCallback(
        async (id, action) => {
            if (!action) return;
            if (action === 'view') return window.location.assign(`/mwadmin/sponsor/${id}/view`);
            if (action === 'edit') return window.location.assign(`/mwadmin/sponsor/${id}/edit`);
            if (action === 'deactivate') await deactivateRow(id);
        },
        [deactivateRow]
    );

    const columns = useMemo(
        () => [
            {
                colId: 'actions',
                headerName: 'Actions',
                width: 132,
                minWidth: 120,
                maxWidth: 148,
                pinned: 'left',
                sortable: false,
                filter: false,
                cellClass: 'mwadmin-ag-cell-vcenter mwadmin-ag-cell-actions',
                cellRenderer: (params) => (
                    <MwadminActionsDropdown
                        flags={{
                            view: perms.view,
                            edit: perms.edit,
                            deactivate: perms.delete,
                        }}
                        onAction={(a) => handleAction(params.data.id, a)}
                    />
                ),
            },
            {
                field: 'id',
                headerName: 'ID',
                width: 72,
                minWidth: 70,
                maxWidth: 88,
                pinned: 'left',
                sortable: true,
                type: 'rightAligned',
                cellClass: 'mwadmin-ag-cell-vcenter',
            },
            {
                field: 'category_name',
                headerName: 'Sponsor Category',
                minWidth: 140,
                flex: 1,
                cellClass: 'mwadmin-ag-cell-vcenter',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'organization_name',
                headerName: 'Organization',
                minWidth: 160,
                flex: 1.1,
                wrapText: true,
                autoHeight: true,
                cellClass: 'mwadmin-ag-cell-wrap',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                colId: 'logo',
                headerName: 'Logo',
                width: 104,
                sortable: false,
                valueGetter: (p) => sponsorListingLogoSrc(p.data, mwadminPublicRoot),
                cellClass: 'mwadmin-ag-cell-vcenter',
                cellRenderer: (p) => (
                    <SponsorListingLogoCell src={p.value || ''} publicRoot={mwadminPublicRoot} />
                ),
            },
            {
                field: 'website',
                headerName: 'Website',
                minWidth: 180,
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellClass: 'mwadmin-ag-cell-wrap',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'contact_name',
                headerName: 'Contact',
                minWidth: 120,
                flex: 0.85,
                cellClass: 'mwadmin-ag-cell-vcenter',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'email',
                headerName: 'Email',
                minWidth: 180,
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellClass: 'mwadmin-ag-cell-wrap',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'mobile',
                headerName: 'Mobile',
                minWidth: 132,
                width: 140,
                maxWidth: 160,
                sortable: false,
                cellClass: 'mwadmin-ag-cell-vcenter mwadmin-ag-cell-nowrap',
                tooltipValueGetter: (p) => (p.value == null ? '' : String(p.value)),
            },
            {
                field: 'amount_sponsored',
                headerName: 'Amount',
                minWidth: 120,
                width: 128,
                maxWidth: 160,
                type: 'rightAligned',
                cellClass: 'mwadmin-ag-cell-vcenter',
                valueFormatter: (p) => (p.value != null && p.value !== '' ? String(p.value) : '—'),
            },
            {
                field: 'start_date',
                headerName: 'Start',
                width: 118,
                valueFormatter: (p) => formatSponsorDateDisplay(p.value),
                cellClass: 'mwadmin-ag-cell-vcenter',
            },
            {
                field: 'end_date',
                headerName: 'End',
                width: 118,
                valueFormatter: (p) => formatSponsorDateDisplay(p.value),
                cellClass: 'mwadmin-ag-cell-vcenter',
            },
            {
                field: 'status',
                headerName: 'Status',
                width: 108,
                cellClass: 'mwadmin-ag-cell-vcenter',
                cellRenderer: (p) => <MwadminStatusBadge value={p.value} />,
            },
        ],
        [perms, handleAction, mwadminPublicRoot]
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
                    <section className="mwadmin-panel mwadmin-sponsor-grid-panel">
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
                            <MwadminThemedAgGrid
                                className="mwadmin-sponsor-listing-grid"
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
