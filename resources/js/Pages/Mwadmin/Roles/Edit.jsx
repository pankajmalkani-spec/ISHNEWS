import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { buildDefaultPermissions, hasAnyPermissionSelected } from '../../../Components/Mwadmin/RolePermissionsMatrix';
import RolePermissionsMatrix from '../../../Components/Mwadmin/RolePermissionsMatrix';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';

function formatApiErrors(err) {
    const d = err?.response?.data;
    if (d?.errors && typeof d.errors === 'object') {
        const lines = Object.entries(d.errors).flatMap(([key, val]) => {
            const msgs = Array.isArray(val) ? val : [String(val)];
            return msgs.map((m) => `${key}: ${m}`);
        });
        return lines.join('\n');
    }
    if (typeof d?.message === 'string') return d.message;
    return err?.message || 'Unable to update role.';
}

export default function RolesEdit({ authUser = {}, roleId }) {
    const dialog = useClassicDialog();
    const [loading, setLoading] = useState(true);
    const [modules, setModules] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [form, setForm] = useState({ rolename: '', description: '', status: '1' });
    const [saving, setSaving] = useState(false);

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
                setForm({
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

    const permissionPayload = useMemo(() => Object.values(permissions), [permissions]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!String(form.rolename || '').trim()) {
            dialog.toast('Role Name is required.', 'error');
            return;
        }
        if (modules.length > 0 && !hasAnyPermissionSelected(permissions)) {
            dialog.toast('Select at least one module permission.', 'error');
            return;
        }
        setSaving(true);
        try {
            await axios.put(`/api/mwadmin/roles/${roleId}`, { ...form, permissions: permissionPayload });
            dialog.toast('Role has been updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/roles'), 1200);
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Edit Role" />
            <MwadminLayout authUser={authUser} activeMenu="roles">
                <div className="mwadmin-pagebar">
                    <span>Administrator</span> <span className="sep">›</span> <span>Roles</span>{' '}
                    <span className="sep">›</span> <strong>Edit Role</strong>
                    <Link href="/mwadmin/roles" className="mwadmin-back-btn">
                        Back
                    </Link>
                </div>
                <h1 className="mwadmin-title">Edit Role</h1>
                <section className="mwadmin-panel mwadmin-form-panel">
                    {loading ? (
                        <div className="mwadmin-role-form-loading">Loading…</div>
                    ) : (
                        <form onSubmit={onSubmit} className="mwadmin-form-grid" noValidate>
                            <div>
                                <label>Role Name *</label>
                                <input
                                    maxLength={50}
                                    value={form.rolename}
                                    onChange={(e) => setForm((f) => ({ ...f, rolename: e.target.value }))}
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label>Status</label>
                                <div className="mwadmin-category-status-row">
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                    >
                                        <option value="1">Active</option>
                                        <option value="0">In-Active</option>
                                    </select>
                                    <MwadminStatusBadge value={form.status === '1' ? 1 : 0} />
                                </div>
                            </div>
                            <div className="mwadmin-form-grid-full">
                                <label>Description</label>
                                <textarea
                                    className="mwadmin-textarea"
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            <div className="mwadmin-form-grid-full mwadmin-role-permissions-section">
                                <span className="mwadmin-form-section-label">Module permissions *</span>
                                <RolePermissionsMatrix modules={modules} permissions={permissions} setPermissions={setPermissions} />
                            </div>
                            <div className="mwadmin-form-actions">
                                <button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Update'}
                                </button>
                                <Link href="/mwadmin/roles">Cancel</Link>
                            </div>
                        </form>
                    )}
                </section>
            </MwadminLayout>
        </>
    );
}
