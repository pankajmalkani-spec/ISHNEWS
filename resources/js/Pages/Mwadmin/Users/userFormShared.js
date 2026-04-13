/** Shared user create/edit validation and API error helpers */

export const PROFILE_EDITOR_OUT = { w: 512, h: 512 };
export const MAX_PROFILE_BYTES = 5 * 1024 * 1024;
export const NAME_RE = /^[a-zA-Z\s]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formatApiErrors(err) {
    const d = err?.response?.data;
    if (d?.errors && typeof d.errors === 'object') {
        const lines = Object.entries(d.errors).flatMap(([key, val]) => {
            const msgs = Array.isArray(val) ? val : [String(val)];
            return msgs.map((m) => `${key}: ${m}`);
        });
        return lines.join('\n');
    }
    if (typeof d?.message === 'string') return d.message;
    return err?.message || 'Request failed.';
}

/** Map Laravel validation keys to one error string per logical field */
export function apiErrorsToFieldMap(err) {
    const d = err?.response?.data;
    if (!d?.errors || typeof d.errors !== 'object') return {};
    const map = {};
    for (const [key, val] of Object.entries(d.errors)) {
        const logical =
            key.startsWith('role_ids')
                ? 'role_ids'
                : key.startsWith('profile_img')
                  ? 'profile_img'
                  : key === 'password_confirmation'
                    ? 'confirm_password'
                    : key;
        const msgs = Array.isArray(val) ? val : [String(val)];
        const line = msgs.join(' ');
        map[logical] = map[logical] ? `${map[logical]} ${line}` : line;
    }
    return map;
}

export function buildUserFieldErrors(
    form,
    { requirePassword = false, confirmPassword = '', profileFile = null, requireRoles = false } = {}
) {
    const e = {};
    const fn = form.first_name.trim();
    if (!fn) e.first_name = 'First name is required.';
    else if (fn.length > 60 || !NAME_RE.test(fn)) {
        e.first_name = 'First name must be 60 characters or fewer and contain only letters and spaces.';
    }
    const ln = form.last_name.trim();
    if (!ln) e.last_name = 'Last name is required.';
    else if (ln.length > 60 || !NAME_RE.test(ln)) {
        e.last_name = 'Last name must be 60 characters or fewer and contain only letters and spaces.';
    }
    const un = form.username.trim();
    if (!un) e.username = 'User name is required.';
    else if (un.length > 60) e.username = 'User name must be at most 60 characters.';
    const em = form.email.trim();
    if (!em) e.email = 'Email is required.';
    else if (em.length > 120) e.email = 'Email must be at most 120 characters.';
    else if (!EMAIL_RE.test(em)) e.email = 'Enter a valid email address.';
    if (requirePassword) {
        const pw = form.password;
        if (!pw || pw.length < 4) e.password = 'Password is required and must be at least 4 characters.';
        else if (pw.length > 50) e.password = 'Password must be at most 50 characters.';
        const cpw = String(confirmPassword ?? '');
        if (!e.password) {
            if (!cpw) e.confirm_password = 'Please confirm your password.';
            else if (cpw !== pw) e.confirm_password = 'Password and confirmation do not match.';
        }
    }
    if (form.status !== '0' && form.status !== '1') e.status = 'Please choose Active or In-Active.';
    const sal = (form.salutation || '').trim();
    if (sal.length > 20) e.salutation = 'Salutation must be at most 20 characters.';
    const p2d = (form.p2d_intials || '').trim();
    if (p2d.length > 20) e.p2d_intials = 'P2D initials must be at most 20 characters.';
    if (profileFile && profileFile.size > MAX_PROFILE_BYTES) {
        e.profile_img = `Profile photo must be ${MAX_PROFILE_BYTES / 1024 / 1024}MB or smaller.`;
    }
    if (requireRoles && (!Array.isArray(form.role_ids) || form.role_ids.length === 0)) {
        e.role_ids = 'Select at least one role.';
    }
    return e;
}

export function clearFieldError(setFieldErrors, key) {
    setFieldErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
    });
}
