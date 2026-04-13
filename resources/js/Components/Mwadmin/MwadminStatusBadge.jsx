/**
 * Status pill for mwadmin grids and view screens (matches legacy Active / In Active styling).
 */
export default function MwadminStatusBadge({ value }) {
    const active = Number(value) === 1;
    return (
        <span
            className={`mwadmin-status-badge ${active ? 'mwadmin-status--active' : 'mwadmin-status--inactive'}`}
        >
            {active ? 'Active' : 'In-Active'}
        </span>
    );
}
