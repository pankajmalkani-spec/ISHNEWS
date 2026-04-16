/**
 * First validation message from a Laravel 422 response, else `data.message`, else fallback.
 */
export function laravelErrorFirstLine(err, fallback) {
    const d = err?.response?.data;
    if (!d) return fallback;
    if (d.errors && typeof d.errors === 'object') {
        for (const v of Object.values(d.errors)) {
            const arr = Array.isArray(v) ? v : [v];
            if (arr[0]) return String(arr[0]);
        }
    }
    return d.message || fallback;
}
