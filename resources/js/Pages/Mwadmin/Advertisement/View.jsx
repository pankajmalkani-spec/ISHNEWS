import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function AdvertisementView({ authUser = {}, advertisementId }) {
    const dialog = useClassicDialog();
    const [row, setRow] = useState(null);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/advertisements/${advertisementId}`);
                if (!c) setRow(data.data);
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load advertisement.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [advertisementId, dialog]);

    if (load || !row) {
        return (
            <>
                <Head title="View Advertisement" />
                <MwadminLayout authUser={authUser} activeMenu="advertisement">
                    <div className="mwadmin-category-classic">
                        <p>Loading...</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    return (
        <>
            <Head title="View Advertisement" />
            <MwadminLayout authUser={authUser} activeMenu="advertisement">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Advertisement</span>{' '}
                        <span className="sep">›</span> <strong>View</strong>
                        <Link href="/mwadmin/advertisement" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Advertisement Details</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <div className="mwadmin-form-grid">
                            <div>
                                <label>ID</label>
                                <input value={String(row.id)} readOnly />
                            </div>
                            <div>
                                <label>Title</label>
                                <input value={row.title || ''} readOnly />
                            </div>
                            <div>
                                <label>Company</label>
                                <input value={row.company_name || ''} readOnly />
                            </div>
                            <div>
                                <label>Subcategory</label>
                                <input value={row.subcat_code || '—'} readOnly />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Image</label>
                                {row.image_url ? (
                                    <div>
                                        <img src={row.image_url} alt="" style={{ maxWidth: 200, maxHeight: 80 }} />
                                    </div>
                                ) : (
                                    <input value="—" readOnly />
                                )}
                            </div>
                            <div>
                                <label>Ad URL</label>
                                <input value={row.ad_url || ''} readOnly />
                            </div>
                            <div>
                                <label>Contact</label>
                                <input value={row.contactperson_name || ''} readOnly />
                            </div>
                            <div>
                                <label>Email</label>
                                <input value={row.email || '—'} readOnly />
                            </div>
                            <div>
                                <label>Mobile</label>
                                <input value={row.mobile ? String(row.mobile) : '—'} readOnly />
                            </div>
                            <div>
                                <label>Brand / Model</label>
                                <input value={`${row.brand || ''} / ${row.model || ''}`} readOnly />
                            </div>
                            <div>
                                <label>Ad Type</label>
                                <input value={String(row.ad_type)} readOnly />
                            </div>
                            <div>
                                <label>Annual Rates</label>
                                <input value={row.annual_rates} readOnly />
                            </div>
                            <div>
                                <label>Start Date</label>
                                <input value={row.start_date || '—'} readOnly />
                            </div>
                            <div>
                                <label>End Date</label>
                                <input value={row.end_date || '—'} readOnly />
                            </div>
                            <div>
                                <label>Status</label>
                                <input
                                    value={Number(row.status) === 1 ? 'Active' : 'In-Active'}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="mwadmin-form-actions">
                            <Link href={`/mwadmin/advertisement/${advertisementId}/edit`}>Edit</Link>
                        </div>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
