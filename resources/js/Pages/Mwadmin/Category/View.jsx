import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { MwadminErrorBanner } from '../../../Components/Mwadmin/MwadminMotionFeedback';

/** Same 220×220 slot as Category create/edit (legacy export size + column alignment with Color / Sort). */
const CATEGORY_IMAGE_PREVIEW_SLOT_STYLE = {
    width: 220,
    maxWidth: 'min(220px, 100%)',
    minHeight: 220,
    maxHeight: 220,
    aspectRatio: '1 / 1',
    flex: '0 0 auto',
    boxSizing: 'border-box',
};

const BANNER_FALLBACK = '/images/categoryImages/bannerImages/no_img.gif';
const BOX_FALLBACK = '/images/categoryImages/boxImages/no_img.gif';

export default function CategoryView({ authUser = {}, categoryId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [item, setItem] = useState(null);

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/categories/${categoryId}`);
                if (!canceled) setItem(data?.data || null);
            } catch {
                if (!canceled) setError('Unable to load category.');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [categoryId]);

    const bannerSrc = item?.banner_img_url || BANNER_FALLBACK;
    const boxSrc = item?.box_img_url || BOX_FALLBACK;

    return (
        <>
            <Head title="View Category" />
            <MwadminLayout authUser={authUser} activeMenu="category">
                <div className="mwadmin-pagebar">
                    <span>Administration</span> <span className="sep">›</span> <span>Category</span>{' '}
                    <span className="sep">›</span> <strong>View Category</strong>
                    <Link href="/mwadmin/category" className="mwadmin-back-btn">
                        Back
                    </Link>
                </div>
                <h1 className="mwadmin-title">View Category</h1>
                <section className="mwadmin-panel mwadmin-form-panel">
                    <MwadminErrorBanner message={error} />
                    {loading ? (
                        <div>Loading...</div>
                    ) : item ? (
                        <div className="mwadmin-form-grid">
                            <div>
                                <label>Category Code</label>
                                <input value={item.code || ''} readOnly />
                            </div>
                            <div>
                                <label>Category Title</label>
                                <input value={item.title || ''} readOnly />
                            </div>
                            <div>
                                <label>Color</label>
                                <input type="color" value={item.color || '#ffffff'} readOnly />
                            </div>
                            <div>
                                <label>Sort</label>
                                <input value={item.sort ?? ''} readOnly />
                            </div>

                            <div className="mwadmin-form-grid-full mwadmin-category-images-row mwadmin-category-images-row--align-form">
                                <div className="mwadmin-category-image-block">
                                    <label>Banner Image</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box"
                                            style={CATEGORY_IMAGE_PREVIEW_SLOT_STYLE}
                                        >
                                            <img
                                                className="mwadmin-category-image-preview"
                                                src={bannerSrc}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = BANNER_FALLBACK;
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mwadmin-category-image-block">
                                    <label>Box Image</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box"
                                            style={CATEGORY_IMAGE_PREVIEW_SLOT_STYLE}
                                        >
                                            <img
                                                className="mwadmin-category-image-preview"
                                                src={boxSrc}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = BOX_FALLBACK;
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label>Status</label>
                                <input value={item.status === 1 ? 'Active' : 'In-Active'} readOnly />
                            </div>

                            <div className="mwadmin-form-actions">
                                <Link href="/mwadmin/category">Cancel</Link>
                            </div>
                        </div>
                    ) : null}
                </section>
            </MwadminLayout>
        </>
    );
}
