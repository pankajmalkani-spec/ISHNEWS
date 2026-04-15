import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { MwadminErrorBanner } from '../../../Components/Mwadmin/MwadminMotionFeedback';

export default function SubcategoryView({ authUser = {}, subcategoryId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [item, setItem] = useState(null);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/subcategories/${subcategoryId}`);
                if (!canceled) setItem(data?.data || null);
            } catch {
                if (!canceled) setError('Unable to load sub-category.');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [subcategoryId]);

    return (
        <>
            <Head title="View Sub-Category" />
            <MwadminLayout authUser={authUser} activeMenu="subcategory">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administration</span> <span className="sep">›</span> <span>Sub-Category</span>{' '}
                        <span className="sep">›</span> <strong>View Sub-Category</strong>
                        <Link href="/mwadmin/subcategory" className="mwadmin-back-btn">Back</Link>
                    </div>
                    <h1 className="mwadmin-title">View Sub-Category</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <MwadminErrorBanner message={error} />
                        {loading ? (
                            <div>Loading...</div>
                        ) : item ? (
                            <div className="mwadmin-form-grid">
                                <div><label>Sub Category Code</label><input value={item.subcat_code || ''} readOnly /></div>
                                <div><label>Sub Category Name</label><input value={item.name || ''} readOnly /></div>
                                <div><label>Category Title</label><input value={item.category_title || ''} readOnly /></div>
                                <div><label>Color</label><input type="color" value={item.color || '#ffffff'} readOnly /></div>
                                <div><label>Sort</label><input value={item.sort ?? ''} readOnly /></div>
                                <div><label>Status</label><input value={item.status === 1 ? 'Active' : 'In-Active'} readOnly /></div>
                                <div><label>Banner Image</label><img className="mwadmin-thumb-view" src={item.banner_img_url || '/images/categoryImages/bannerImages/no_img.gif'} alt="" /></div>
                                <div><label>Box Image</label><img className="mwadmin-thumb-view" src={item.box_img_url || '/images/categoryImages/boxImages/no_img.gif'} alt="" /></div>
                            </div>
                        ) : null}
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}