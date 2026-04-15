import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function FlowchartView({ authUser = {}, flowchartId }) {
    const dialog = useClassicDialog();
    const [row, setRow] = useState(null);
    const [load, setLoad] = useState(true);

    useEffect(() => {
        let c = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/mwadmin/flowcharts/${flowchartId}`);
                if (!c) setRow(data.data);
            } catch (err) {
                if (!c) dialog.toast(err?.response?.data?.message || 'Unable to load flow chart.', 'error');
            } finally {
                if (!c) setLoad(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [flowchartId, dialog]);

    if (load || !row) {
        return (
            <>
                <Head title="View Flow Chart" />
                <MwadminLayout authUser={authUser} activeMenu="flowchart">
                    <div className="mwadmin-category-classic">
                        <p>Loading...</p>
                    </div>
                </MwadminLayout>
            </>
        );
    }

    const activities = row.activities || [];

    return (
        <>
            <Head title="View Flow Chart" />
            <MwadminLayout authUser={authUser} activeMenu="flowchart">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Masters</span> <span className="sep">›</span> <span>Flow Chart</span>{' '}
                        <span className="sep">›</span> <strong>View</strong>
                        <Link href="/mwadmin/flowchart" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Flow Chart Details</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        <div className="mwadmin-form-grid">
                            <div>
                                <label>ID</label>
                                <input value={String(row.id)} readOnly />
                            </div>
                            <div>
                                <label>Name</label>
                                <input value={row.name || ''} readOnly />
                            </div>
                            <div>
                                <label>Defined By</label>
                                <input value={row.defined_by_name || String(row.defined_by)} readOnly />
                            </div>
                            <div>
                                <label>Status</label>
                                <input
                                    value={Number(row.status) === 1 ? 'Active' : 'In-Active'}
                                    readOnly
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Description</label>
                                <textarea
                                    className="mwadmin-textarea"
                                    rows={3}
                                    value={row.description || ''}
                                    readOnly
                                />
                            </div>
                        </div>

                        <h2 style={{ marginTop: '1rem', fontSize: '1.05rem', fontWeight: 600 }}>
                            Activities
                        </h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>
                                            Plan
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>
                                            Activity
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>
                                            Responsibility
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc' }}>
                                            Sort
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activities.map((a) => (
                                        <tr key={a.id}>
                                            <td style={{ padding: '6px 8px' }}>{a.plan}</td>
                                            <td style={{ padding: '6px 8px' }}>{a.activity_name}</td>
                                            <td style={{ padding: '6px 8px' }}>{a.responsibility_name || '—'}</td>
                                            <td style={{ padding: '6px 8px' }}>{a.sort}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mwadmin-form-actions" style={{ marginTop: '1rem' }}>
                            <Link href={`/mwadmin/flowchart/${flowchartId}/edit`}>Edit</Link>
                        </div>
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
