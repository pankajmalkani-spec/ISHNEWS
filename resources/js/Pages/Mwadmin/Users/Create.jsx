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

export default function UsersCreate({ authUser = {} }) {
    const dialog = useClassicDialog();
    const [options, setOptions] = useState({ designations: [], roles: [] });
    const [form, setForm] = useState({
        salutation: '',
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        designation: '',
        p2d_intials: '',
        status: '1',
        password: '',
        confirm_password: '',
        role_ids: [],
    });
    const [profileFile, setProfileFile] = useState(null);
    const [profilePreview, setProfilePreview] = useState('');
    const [profileEditorOpen, setProfileEditorOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const notify = useCallback((message) => dialog.toast(message, 'error'), [dialog]);

    useEffect(() => {
        axios.get('/api/mwadmin/users/options').then(({ data }) => setOptions(data));
    }, []);

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

    const onSubmit = async (e) => {
        e.preventDefault();
        const errs = buildUserFieldErrors(form, {
            requirePassword: true,
            confirmPassword: form.confirm_password,
            profileFile,
            requireRoles: true,
        });
        if (Object.keys(errs).length > 0) {
            dialog.toast(firstClientValidationMessage(errs), 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'confirm_password') return;
                if (k === 'role_ids') {
                    v.forEach((roleId) => payload.append('role_ids[]', roleId));
                    return;
                }
                if (v !== null && v !== '') payload.append(k, v);
            });
            payload.append('password_confirmation', form.confirm_password);
            if (profileFile) payload.append('profile_img', profileFile);

            await axios.post('/api/mwadmin/users', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            dialog.toast('User created successfully.', 'success');
            window.setTimeout(() => window.location.assign('/mwadmin/users'), 1200);
        } catch (err) {
            dialog.toast(formatApiErrors(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    const roleOptions = options.roles || [];

    return (
        <>
            <Head title="Create User" />
            <MwadminLayout authUser={authUser} activeMenu="users">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Administrator</span> <span className="sep">›</span> <span>Users</span>{' '}
                        <span className="sep">›</span> <strong>Create User</strong>
                        <Link href="/mwadmin/users" className="mwadmin-back-btn">
                            Back
                        </Link>
                    </div>
                    <h1 className="mwadmin-title">Create User</h1>
                    <section className="mwadmin-panel mwadmin-form-panel">
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
                                <label>Password *</label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label>Confirm Password *</label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={form.confirm_password}
                                    onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
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
                                    {saving ? 'Saving...' : 'Submit'}
                                </button>
                                <Link href="/mwadmin/users">Cancel</Link>
                            </div>
                        </form>
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
