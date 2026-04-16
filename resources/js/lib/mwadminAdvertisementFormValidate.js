const CONTACT_PERSON_RE = /^[a-zA-Z.\s]+$/;

/**
 * Client-side checks aligned with AdvertisementApiController rules and legacy MW Admin form.
 * @param {object} form — shape used by Advertisement Create/Edit pages
 * @returns {string|null} error message or null if OK
 */
export function validateMwadminAdvertisementForm(form) {
    if (!form.title?.trim()) {
        return 'Title is required.';
    }
    if (!form.company_name?.trim()) {
        return 'Company name is required.';
    }
    if (!form.contactperson_name?.trim()) {
        return 'Contact person is required.';
    }
    if (!CONTACT_PERSON_RE.test(form.contactperson_name.trim())) {
        return 'Contact person may only contain letters, spaces, and periods.';
    }
    const adUrl = form.ad_url?.trim() ?? '';
    if (!adUrl) {
        return 'Ad URL is required.';
    }
    try {
        // eslint-disable-next-line no-new
        new URL(adUrl);
    } catch {
        return 'Ad URL must be a valid URL (include http:// or https://).';
    }
    const rates = form.annual_rates;
    if (rates === '' || rates === null || Number.isNaN(Number(rates))) {
        return 'Annual rates is required and must be a number.';
    }
    const mobileRaw = form.mobile?.trim() ?? '';
    if (mobileRaw) {
        const digits = mobileRaw.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 12) {
            return 'Mobile must be 10–12 digits when provided.';
        }
    }
    const emailRaw = form.email?.trim() ?? '';
    if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
        return 'Enter a valid email address.';
    }
    if (String(form.ad_type) === '1' && !form.category_id) {
        return 'Select a category when ad type is Specific Category.';
    }
    return null;
}
