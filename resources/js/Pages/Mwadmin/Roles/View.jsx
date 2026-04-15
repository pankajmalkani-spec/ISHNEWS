import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { buildDefaultPermissions } from '../../../Components/Mwadmin/RolePermissionsMatrix';
import RolePermissionsMatrix from '../../../Components/Mwadmin/RolePermissionsMatrix';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

export default function RolesView({ authUser = {}, roleId }) {
    const dialog = useClassicDialog();
    const [loading, setLoading] = useState(true);
    const [modules, setModules] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [item, setItem] = useState({ rolename: '', description: '', status: '1' });

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const [{ data: opts }, { data: one }] = await Promise.all([
                    axios.get('/api/mwadmin/roles/options'),
                    axios.get(`/api/mwadmin/roles/${roleId}`),
                ]);
                if (canceled) return;
                const mods = opts.modules || [];
                setModules(mods);
                const role = one?.data || {};
                setItem({
                    rolename: role.rolename || '',
                    description: role.description || '',
                    status: String(role.status ?? '1'),
                });
                const existingMap = (role.permissions || []).reduce((acc, p) => {
                    acc[String(p.moduleid)] = p;
                    return acc;
                }, {});
                setPermissions(buildDefaultPermissions(mods, existingMap));
            } catch (err) {
                if (!canceled) {
                    dialog.toast(err?.response?.data?.message || 'Unable to load role.', 'error');
                }
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [roleId, dialog]);

    return (
        <>
            <Head title="View Role" />
            <MwadminLayout authUser={authUser} activeMenu="roles">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Roles</span>{' '}
                        <span className="sep">›</span> <strong>View Role</strong>
                        <Link href="/mwadmin/roles" className="mwadmin-back-btn">Back</Link>
                    </div>
                    <h1 className="mwadmin-title">View Role</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        {loading ? <div>Loading...</div> : (
                            <div className="mwadmin-form-grid">
                                <div><label>Role Name</label><input value={item.rolename} readOnly /></div>
                                <div><label>Status</label><input value={item.status === '1' ? 'Active' : 'In-Active'} readOnly /></div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Remarks</label>
                                    <textarea className="mwadmin-textarea" rows={4} value={item.description} readOnly />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <RolePermissionsMatrix modules={modules} permissions={permissions} disabled />
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </MwadminLayout>
        </>
    );
}
