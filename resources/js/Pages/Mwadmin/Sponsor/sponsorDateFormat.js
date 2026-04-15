const pad2 = (n) => String(n).padStart(2, '0');

/** Date object → dd-mm-yyyy (for DmyDateInput). */
export function dateToDmy(date) {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }
    return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** dd-mm-yyyy string → local Date at midnight, or null if empty/invalid. */
export function parseDmyToDate(dmy) {
    const raw = String(dmy ?? '').trim();
    if (raw === '') return null;
    const m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (y < 1000 || y > 9999) return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
        return null;
    }
    return dt;
}

/** API / DB date (Y-m-d) → display dd-mm-yyyy */
export function isoDateToDmy(iso) {
    if (iso == null || iso === '') return '';
    const s = String(iso).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * User input dd-mm-yyyy → Y-m-d for Laravel, or null if empty.
 * Returns 'INVALID' if non-empty but not a real calendar date.
 */
export function dmyToIsoDate(dmy) {
    const raw = String(dmy ?? '').trim();
    if (raw === '') return null;
    const m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!m) return 'INVALID';
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (y < 1000 || y > 9999) return 'INVALID';
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return 'INVALID';
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return 'INVALID';
    return `${y}-${pad2(mo)}-${pad2(d)}`;
}

/** For grid / view: show d-m-Y or em dash */
export function formatSponsorDateDisplay(isoOrNull) {
    const d = isoDateToDmy(isoOrNull);
    return d || '—';
}
