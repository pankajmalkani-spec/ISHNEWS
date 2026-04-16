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

/** API / DB date (Y-m-d) → display dd-mm-yyyy; blank for null or 1970 placeholder */
export function isoDateToDmy(iso) {
    if (iso == null || iso === '') return '';
    const s = String(iso).trim();
    if (s.startsWith('1970-01-01')) return '';
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

/** dd-mm-yyyy → `YYYY-MM-DD` for `<input type="date">` `value`, or '' if empty/invalid. */
export function dmyToIsoDateInputValue(dmy) {
    const iso = dmyToIsoDate(dmy);
    if (iso === null || iso === 'INVALID') return '';
    return iso;
}

/** For grid / view: show d-m-Y or em dash */
export function formatSponsorDateDisplay(isoOrNull) {
    const d = isoDateToDmy(isoOrNull);
    return d || '—';
}

/**
 * Sponsor logo output size — matches legacy mwadmin (`avatar_sponsor.js`):
 * Cropper `aspectRatio: 196 / 160`, fixed crop box, drag image to position, UI label "196px X 160px".
 */
export const SPONSOR_LOGO_EXPORT = { w: 196, h: 160 };

/** Add https:// when missing so Laravel `url` validation accepts common input (e.g. example.com). */
export function normalizeWebsiteUrl(raw) {
    const t = String(raw ?? '').trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}
