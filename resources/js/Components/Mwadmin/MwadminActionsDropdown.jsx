/**
 * Row-level Actions &lt;select&gt; shown only for operations the user may perform (mwadmin module flags).
 */
export default function MwadminActionsDropdown({ onAction, flags = {} }) {
    const { view, edit, delete: canDel, resetPassword, deactivate } = flags;
    const hasAny = !!(view || edit || canDel || resetPassword || deactivate);
    if (!hasAny) {
        return (
            <span className="mwadmin-grid-action-muted" style={{ color: '#86868b' }}>
                —
            </span>
        );
    }
    return (
        <select
            className="mwadmin-grid-action"
            defaultValue=""
            onChange={(e) => {
                const a = e.target.value;
                e.target.value = '';
                if (a) onAction(a);
            }}
        >
            <option value="">Actions</option>
            {view ? <option value="view">View</option> : null}
            {edit ? <option value="edit">Edit</option> : null}
            {resetPassword ? <option value="resetpwd">Reset Password</option> : null}
            {canDel ? <option value="delete">Delete</option> : null}
            {deactivate ? <option value="deactivate">Deactivate</option> : null}
        </select>
    );
}
