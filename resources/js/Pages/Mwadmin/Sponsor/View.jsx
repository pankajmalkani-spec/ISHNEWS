import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function SponsorView({ authUser = {}, sponsorId }) {
    const dialog = useClassicDialog();
    const [row, setRow] = useState(null);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/sponsors/${sponsorId}`);
                if (!c) setRow(data.data);
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load sponsor.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [sponsorId, dialog]);

    if (load || !row) {
        return (
            <>
                <Head title="View Sponsor" />
                <MwadminLayout authUser={authUser} activeMenu="sponsor">
                    <div className="mwadmin-category-classic">
                        <p>Loading...</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    return (
        <>
            <Head title="View Sponsor" />
            <MwadminLayout authUser={authUser} activeMenu="sponsor">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor</span>{' '}
                        <span className="sep">›</span> <strong>View</strong>
                        <Link href="/mwadmin/sponsor" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Sponsor Details</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <dl className="mwadmin-view-dl">
                            <dt>ID</dt>
                            <dd>{row.id}</dd>
                            <dt>Category</dt>
                            <dd>{row.category_name || '—'}</dd>
                            <dt>Organization</dt>
                            <dd>{row.organization_name}</dd>
                            <dt>Logo</dt>
                            <dd>
                                {row.logo_url ? (
                                    <img src={row.logo_url} alt="" style={{ maxWidth: 200, maxHeight: 80 }} />
                                ) : (
                                    '—'
                                )}
                            </dd>
                            <dt>Website</dt>
                            <dd>
                                <a href={row.website} target="_blank" rel="noreferrer">
                                    {row.website}
                                </a>
                            </dd>
                            <dt>Contact</dt>
                            <dd>{row.contact_name}</dd>
                            <dt>Email</dt>
                            <dd>{row.email || '—'}</dd>
                            <dt>Mobile</dt>
                            <dd>{row.mobile || '—'}</dd>
                            <dt>Amount Sponsored</dt>
                            <dd>{row.amount_sponsored}</dd>
                            <dt>Start Date</dt>
                            <dd>{row.start_date || '—'}</dd>
                            <dt>End Date</dt>
                            <dd>{row.end_date || '—'}</dd>
                            <dt>Status</dt>
                            <dd>{Number(row.status) === 1 ? 'Active' : 'In-Active'}</dd>
                        </dl>
                        <div className="mwadmin-form-actions">
                            <Link href={`/mwadmin/sponsor/${sponsorId}/edit`}>Edit</Link>
                        </div>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
