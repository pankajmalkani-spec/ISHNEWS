import { Head, Link } from '@inertiajs/react';
import { MwadminErrorBanner } from '../../../Components/Mwadmin/MwadminMotionFeedback';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';

export default function UsersView({ authUser = {}, userId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [item, setItem] = useState(null);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/users/${userId}`);
                if (!canceled) setItem(data?.data || null);
            } catch {
                if (!canceled) setError('Unable to load user.');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [userId]);

    return (
        <>
            <Head title="View User" />
            <MwadminLayout authUser={authUser} activeMenu="users">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Users</span>{' '}
                        <span className="sep">›</span> <strong>View User</strong>
                        <Link href="/mwadmin/users" className="mwadmin-back-btn">Back</Link>
                    </div>
                    <h1 className="mwadmin-title">View User</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <MwadminErrorBanner message={error} />
                        {loading ? <div>Loading...</div> : item ? (
                            <div className="mwadmin-form-grid">
                                <div><label>Salutation</label><input value={item.salutation || ''} readOnly /></div>
                                <div><label>First Name</label><input value={item.first_name || ''} readOnly /></div>
                                <div><label>Last Name</label><input value={item.last_name || ''} readOnly /></div>
                                <div><label>User Name</label><input value={item.username || ''} readOnly /></div>
                                <div><label>Email</label><input value={item.email || ''} readOnly /></div>
                                <div>
                                    <label>Designation</label>
                                    <input value={item.designation_name || ''} readOnly />
                                </div>
                                <div>
                                    <label>Roles</label>
                                    <textarea
                                        readOnly
                                        rows={3}
                                        value={(item.role_names || []).join(', ')}
                                        className="mwadmin-input-readonly"
                                    />
                                </div>
                                <div><label>P2D Initials</label><input value={item.p2d_intials || ''} readOnly /></div>
                                <div><label>Status</label><input value={item.status === 1 ? 'Active' : 'In-Active'} readOnly /></div>
                                <div>
                                    <label>Profile Photo</label>
                                    <img className="mwadmin-thumb-view" src={item.profile_photo_url || '/images/categoryImages/boxImages/no_img.gif'} alt="" />
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}