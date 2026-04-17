import { useCallback, useId, useRef } from 'react';
import { dateToDmy, dmyToIsoDateInputValue, parseDmyToDate } from '../../Pages/Mwadmin/Sponsor/sponsorDateFormat';
import '../../../css/mwadmin-dmy-datepicker.css';

/**
 * dd-mm-yyyy text field + calendar button that opens the browser date picker.
 *
 * @param {'default' | 'compact'} [density]
 */
export default function DmyDateInput({
    id,
    value,
    onChange,
    placeholder = 'dd-mm-yyyy',
    density = 'default',
    normalizeOnBlur = true,
    disabled = false,
}) {
    const genId = useId();
    const inputId = id || `dmy-date-${genId}`;
    const nativeDateRef = useRef(null);

    const isoForNative = dmyToIsoDateInputValue(value);

    const handleChange = useCallback(
        (e) => {
            if (disabled) return;
            onChange(e.target.value);
        },
        [onChange, disabled]
    );

    const handleBlur = useCallback(() => {
        if (disabled) return;
        if (!normalizeOnBlur) return;
        const raw = String(value ?? '').trim();
        if (raw === '') return;
        const d = parseDmyToDate(raw);
        if (d) onChange(dateToDmy(d));
    }, [normalizeOnBlur, onChange, value, disabled]);

    const handleNativeChange = useCallback(
        (e) => {
            if (disabled) return;
            const iso = e.target.value;
            if (!iso) {
                onChange('');
                return;
            }
            const parts = iso.split('-').map((x) => parseInt(x, 10));
            if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
                onChange('');
                return;
            }
            const [y, mo, d] = parts;
            const dt = new Date(y, mo - 1, d);
            if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
                onChange('');
                return;
            }
            onChange(dateToDmy(dt));
        },
        [onChange, disabled]
    );

    const openDateDialog = useCallback(() => {
        if (disabled) return;
        const el = nativeDateRef.current;
        if (!el) return;
        try {
            if (typeof el.showPicker === 'function') {
                el.showPicker();
            } else {
                el.click();
            }
        } catch {
            el.click();
        }
    }, [disabled]);

    return (
        <div
            className={
                density === 'compact'
                    ? 'mwadmin-dmy-picker-wrap mwadmin-dmy-picker-wrap--compact'
                    : 'mwadmin-dmy-picker-wrap'
            }
        >
            <div className="mwadmin-dmy-picker-field">
                <input
                    id={inputId}
                    type="text"
                    className="mwadmin-dmy-picker-input"
                    value={value ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    title={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={10}
                    disabled={disabled}
                />
                <button
                    type="button"
                    className="mwadmin-dmy-picker-calendar-btn"
                    onClick={openDateDialog}
                    aria-label="Open calendar"
                    title="Open calendar"
                    disabled={disabled}
                >
                    <svg
                        className="mwadmin-dmy-picker-calendar-icon"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                    >
                        <path
                            d="M7 2v2M17 2v2M4 8h16M6 4h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
            <input
                ref={nativeDateRef}
                type="date"
                className="mwadmin-dmy-picker-native"
                value={isoForNative}
                onChange={handleNativeChange}
                tabIndex={-1}
                aria-hidden="true"
                disabled={disabled}
            />
        </div>
    );
}
