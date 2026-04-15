import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { MwadminErrorBanner } from '../../../Components/Mwadmin/MwadminMotionFeedback';

export default function SponsorCategoryView({ authUser = {}, sponsorcategoryId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [item, setItem] = useState(null);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/sponsorcategories/${sponsorcategoryId}`);
                if (!canceled) setItem(data?.data || null);
            } catch {
                if (!canceled) setError('Unable to load sponsor category.');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [sponsorcategoryId]);

    return (
        <>
            <Head title="View Sponsor Category" />
            <MwadminLayout authUser={authUser} activeMenu="sponsorcategory">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Sponsor Category</span>{' '}
                        <span className="sep">›</span> <strong>View Sponsor Category</strong>
                        <Link href="/mwadmin/sponsorcategory" className="mwadmin-back-btn">Back</Link>
                    </div>
                    <h1 className="mwadmin-title">View Sponsor Category</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <MwadminErrorBanner message={error} />
                        {loading ? <div>Loading...</div> : item ? (
                            <div className="mwadmin-form-grid">
                                <div><label>Sponsor Category Name</label><input value={item.name || ''} readOnly /></div>
                                <div><label>Status</label><input value={item.status === 1 ? 'Active' : 'In-Active'} readOnly /></div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Note(s)</label>
                                    <textarea className="mwadmin-textarea" rows={5} value={item.note || ''} readOnly />
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}