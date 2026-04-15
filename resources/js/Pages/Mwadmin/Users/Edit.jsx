import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import MwadminImageEditorModal from '../../../Components/Mwadmin/MwadminImageEditorModal';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import MwadminStatusBadge from '../../../Components/Mwadmin/MwadminStatusBadge';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import {
    PROFILE_EDITOR_OUT,
    buildUserFieldErrors,
    firstClientValidationMessage,
    formatApiErrors,
    MAX_PROFILE_BYTES,
} from './userFormShared';
import UserRolesPicker from './UserRolesPicker';

export default function UsersEdit({ authUser = {}, userId }) {
    const dialog = useClassicDialog();
    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState({ designations: [], roles: [] });
    const [roleOptions, setRoleOptions] = useState([]);
    const [form, setForm] = useState({
        salutation: '',
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        designation: '',
        p2d_intials: '',
        status: '1',
        role_ids: [],
    });
    const [profileFile, setProfileFile] = useState(null);
    const [profilePreview, setProfilePreview] = useState('');
    const [profileEditorOpen, setProfileEditorOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);

    useEffect(() => {
        return () => {
            if (profilePreview.startsWith('blob:')) URL.revokeObjectURL(profilePreview);
        };
    }, [profilePreview]);

    const setProfileFromFile = useCallback(
        (file) => {
            if (file.size > MAX_PROFILE_BYTES) {
                notify(`Profile photo must be ${MAX_PROFILE_BYTES / 1024 / 1024}MB or smaller.`);
                return;
            }
            setProfileFile(file);
            setProfilePreview((prev) => {
                if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
        },
        [notify]
    );

    useEffect(() => {
        let canceled = false;
        const load = async () => {
            try {
                const [{ data: opts }, { data: one }] = await Promise.all([
                    axios.get('/api/mwadmin/users/options'),
                    axios.get(`/api/mwadmin/users/${userId}`),
                ]);
                if (canceled) return;
                setOptions(opts);
                const u = one?.data || {};
                const rolesForDropdown =
                    Array.isArray(u.role_options) && u.role_options.length > 0 ? u.role_options : opts.roles || [];
                setRoleOptions(rolesForDropdown);
                setForm({
                    salutation: u.salutation || '',
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    username: u.username || '',
                    email: u.email || '',
                    designation: String(u.designation || ''),
                    p2d_intials: u.p2d_intials || '',
                    status: String(u.status ?? '1'),
                    role_ids: (u.role_ids || []).map(String),
                });
                const existingUrl = u.profile_photo_url || '';
                setProfilePreview(existingUrl);
                setProfileFile(null);
            } catch {
                if (!canceled) dialog.toast('Unable to load user.', 'error');
            } finally {
                if (!canceled) setLoading(false);
            }
        };
        load();
        return () => {
            canceled = true;
        };
    }, [userId, dialog]);

    const onSubmit = async (e) => {
        e.preventDefault();
        const errs = buildUserFieldErrors(form, { requirePassword: false, profileFile, requireRoles: true });
        if (Object.keys(errs).length > 0) {
            dialog.toast(firstClientValidationMessage(errs), 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'role_ids') {
                    v.forEach((roleId) => payload.append('role_ids[]', roleId));
                    return;
                }
                if (v !== null && v !== '') payload.append(k, v);
            });
            if (profileFile) payload.append('profile_img', profileFile);
            payload.append('_method', 'PUT');

            await axios.post(`/api/mwadmin/users/${userId}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            dialog.toast('User updated successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/users'), 1200);
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head title="Edit User" />
            <MwadminLayout authUser={authUser} activeMenu="users">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Users</span>{' '}
                        <span className="sep">›</span> <strong>Edit User</strong>
                        <Link href="/mwadmin/users" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Edit User</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <form onSubmit={onSubmit} className="mwadmin-form-grid" noValidate>
                                <div>
                                    <label>Salutation</label>
                                    <input
                                        value={form.salutation}
                                        onChange={(e) => setForm((f) => ({ ...f, salutation: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>First Name *</label>
                                    <input
                                        value={form.first_name}
                                        onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>Last Name *</label>
                                    <input
                                        value={form.last_name}
                                        onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>User Name *</label>
                                    <input
                                        value={form.username}
                                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label>Designation</label>
                                    <select
                                        value={form.designation}
                                        onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                                    >
                                        <option value="">Select</option>
                                        {options.designations.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.designation}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>P2D Initials</label>
                                    <input
                                        value={form.p2d_intials}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, p2d_intials: e.target.value.toUpperCase() }))
                                        }
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

                                <div className="mwadmin-form-grid-full mwadmin-user-profile-photo-row">
                                    <label>Profile Photo</label>
                                    <div className="mwadmin-category-image-field">
                                        <div
                                            className="mwadmin-category-image-preview-wrap mwadmin-category-image-preview-wrap--box mwadmin-category-image-preview-wrap--clickable mwadmin-user-profile-preview"
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Open profile photo editor"
                                            onClick={() => setProfileEditorOpen(true)}
                                            onKeyDown={(ev) => {
                                                if (ev.key === 'Enter' || ev.key === ' ') {
                                                    ev.preventDefault();
                                                    setProfileEditorOpen(true);
                                                }
                                            }}
                                        >
                                            {profilePreview ? (
                                                <img src={profilePreview} alt="" className="mwadmin-category-image-preview" />
                                            ) : (
                                                <div className="mwadmin-category-image-placeholder-card">
                                                    NO IMAGE
                                                    <span className="mwadmin-category-image-click-hint">Click to upload and edit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mwadmin-form-grid-full">
                                    <label>
                                        Role <span className="mwadmin-required">*</span>
                                    </label>
                                    <UserRolesPicker
                                        roleOptions={roleOptions}
                                        roleIds={form.role_ids}
                                        onRoleIdsChange={(ids) => setForm((f) => ({ ...f, role_ids: ids }))}
                                    />
                                </div>

                                <div className="mwadmin-form-actions">
                                    <button type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : 'Update'}
                                    </button>
                                    <Link href="/mwadmin/users">Cancel</Link>
                                </div>
                            </form>
                        )}
                    </section>
                </div>

                <MwadminImageEditorModal
                    open={profileEditorOpen}
                    onClose={() => setProfileEditorOpen(false)}
                    title="Profile Photo"
                    outputWidth={PROFILE_EDITOR_OUT.w}
                    outputHeight={PROFILE_EDITOR_OUT.h}
                    notify={notify}
                    onApply={(file) => setProfileFromFile(file)}
                />
            </MwadminLayout>
        </>
    );
}
