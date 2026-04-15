import { useCallback, useId } from 'react';
import { dateToDmy, parseDmyToDate } from '../../Pages/Mwadmin/Sponsor/sponsorDateFormat';
import '../../../css/mwadmin-dmy-datepicker.css';

function dmyToIsoDateValue(dmy) {
    const d = parseDmyToDate(dmy);
    if (!d) return '';
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * dd-mm-yyyy field backed by the browser native date input (no third-party picker).
 *
 * @param {'default' | 'compact'} [density]
 */
export default function DmyDateInput({ id, value, onChange, placeholder = 'dd-mm-yyyy', density = 'default' }) {
    const genId = useId();
    const inputId = id || `dmy-date-${genId}`;

    const handleChange = useCallback(
        (e) => {
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
        [onChange]
    );

    const isoValue = dmyToIsoDateValue(value);

    return (
        <div
            className={
                density === 'compact'
                    ? 'mwadmin-dmy-picker-wrap mwadmin-dmy-picker-wrap--compact'
                    : 'mwadmin-dmy-picker-wrap'
            }
        >
            <input
                id={inputId}
                type="date"
                className="mwadmin-dmy-picker-input"
                value={isoValue}
                onChange={handleChange}
                title={placeholder}
                autoComplete="off"
            />
        </div>
    );
}
