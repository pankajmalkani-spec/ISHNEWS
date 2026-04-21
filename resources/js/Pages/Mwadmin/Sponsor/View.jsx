import { Head, Link } from '@inertiajs/react';
import { SPONSOR_LOGO_PLACEHOLDER_PATH } from '../../../constants/sponsorPlaceholder';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { formatSponsorDateDisplay, normalizeWebsiteUrl, SPONSOR_LOGO_SLOT_STYLE } from './sponsorDateFormat';

function displayText(v) {
    const s = v == null ? '' : String(v).trim();
    return s === '' ? '—' : s;
}

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

    const websiteHref = row.website ? normalizeWebsiteUrl(row.website) : '';

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
                    <section className="mwadmin-panel mwadmin-form-panel mwadmin-sponsor-view-panel">
                        <div className="mwadmin-form-grid">
                            <div>
                                <label>ID</label>
                                <input readOnly value={String(row.id)} />
                            </div>
                            <div>
                                <label>Status</label>
                                <div className="mwadmin-sponsor-view-status-cell">
                                    <MwadminStatusBadge value={row.status} />
                                </div>
                            </div>
                            <div>
                                <label>Category</label>
                                <input readOnly value={displayText(row.category_name)} />
                            </div>
                            <div>
                                <label>Organization</label>
                                <input readOnly value={displayText(row.organization_name)} />
                            </div>

                            <div className="mwadmin-form-grid-full mwadmin-category-images-row mwadmin-category-images-row--align-form">
                                <div className="mwadmin-category-image-block">
                                    <label>Sponsor Logo (196px × 160px)</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-sponsor-logo-preview"
                                            style={SPONSOR_LOGO_SLOT_STYLE}
                                        >
                                            <img
                                                src={row.logo_url || SPONSOR_LOGO_PLACEHOLDER_PATH}
                                                alt=""
                                                className="mwadmin-category-image-preview"
                                                onError={(e) => {
                                                    e.currentTarget.src = SPONSOR_LOGO_PLACEHOLDER_PATH;
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        alignSelf: 'start',
                                        justifySelf: 'stretch',
                                        width: '100%',
                                        minWidth: 0,
                                    }}
                                >
                                    <label>Website</label>
                                    {websiteHref ? (
                                        <div className="mwadmin-sponsor-view-website-block">
                                            <input readOnly value={row.website} />
                                            <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                                                Open in new tab
                                            </a>
                                        </div>
                                    ) : (
                                        <input readOnly value="—" />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label>Contact</label>
                                <input readOnly value={displayText(row.contact_name)} />
                            </div>
                            <div>
                                <label>Email</label>
                                <input readOnly value={displayText(row.email)} />
                            </div>
                            <div>
                                <label>Mobile</label>
                                <input readOnly value={displayText(row.mobile)} />
                            </div>
                            <div>
                                <label>Amount Sponsored</label>
                                <input readOnly value={String(row.amount_sponsored ?? '')} />
                            </div>
                            <div>
                                <label>Start Date</label>
                                <input readOnly value={formatSponsorDateDisplay(row.start_date)} />
                            </div>
                            <div>
                                <label>End Date</label>
                                <input readOnly value={formatSponsorDateDisplay(row.end_date)} />
                            </div>
                        </div>
                        <div className="mwadmin-form-actions">
                            <Link className="mwadmin-btn-primary" href={`/mwadmin/sponsor/${sponsorId}/edit`}>
                                Edit
                            </Link>
                        </div>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
