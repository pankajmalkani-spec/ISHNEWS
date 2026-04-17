import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const POPOVER_Z = 2400;
const POP_W = 200;
const POP_H = 220;

/**
 * Parse "H:mm" or "HH:mm" 24h → { h12, m, ap }
 */
export function parseTime24ToParts(s) {
    const t = (s || '').trim();
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) {
        return { h12: 12, m: 0, ap: 'AM' };
    }
    const [hs, ms] = t.split(':');
    let h24 = parseInt(hs, 10) % 24;
    const m = parseInt(ms, 10) % 60;
    const ap = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h12, m, ap };
}

/**
 * @param {{ h12: number, m: number, ap: 'AM'|'PM' }} p
 * @returns {string} "HH:MM" 24h
 */
export function timePartsTo24(p) {
    let h24;
    if (p.ap === 'AM') {
        h24 = p.h12 === 12 ? 0 : p.h12;
    } else {
        h24 = p.h12 === 12 ? 12 : p.h12 + 12;
    }
    return `${String(h24).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`;
}

function formatDisplay(hhmm24) {
    if (!hhmm24 || !/^\d{1,2}:\d{2}$/.test(hhmm24.trim())) return '';
    const p = parseTime24ToParts(hhmm24.trim());
    return `${p.h12}:${String(p.m).padStart(2, '0')} ${p.ap}`;
}

/**
 * Time field with clock button and popover (hour / minute / AM–PM), like legacy Bootstrap timepicker.
 * `value` / `onChange` use 24h "HH:MM" (same as input[type=time]).
 *
 * @param {'default' | 'compact'} [density]
 */
export default function MwadminTimeInput({
    id,
    value,
    onChange,
    placeholder = '--:-- --',
    density = 'default',
    title,
    inputAriaLabel,
    preferNativeDialog = false,
    disabled = false,
}) {
    const genId = useId();
    const inputId = id || `mwadmin-time-${genId}`;
    const wrapRef = useRef(null);
    const triggerRef = useRef(null);
    const nativeTimeRef = useRef(null);
    const popoverRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
    const [shellDark, setShellDark] = useState(false);

    const [draft, setDraft] = useState(() => parseTime24ToParts(value));

    useEffect(() => {
        if (!open) {
            setDraft(parseTime24ToParts(value));
        }
    }, [value, open]);

    useEffect(() => {
        if (!open) return undefined;
        if (typeof document !== 'undefined') {
            setShellDark(Boolean(document.querySelector('.mwadmin-shell.mwadmin-theme-dark')));
        }
        return undefined;
    }, [open]);

    const updatePopoverPosition = useCallback(() => {
        const el = triggerRef.current || wrapRef.current;
        if (!open || !el) return;
        const r = el.getBoundingClientRect();
        const margin = 8;
        let top = r.bottom + 4;
        let left = r.left;
        if (left + POP_W > window.innerWidth - margin) {
            left = Math.max(margin, window.innerWidth - POP_W - margin);
        }
        if (left < margin) left = margin;
        if (top + POP_H > window.innerHeight - margin) {
            top = r.top - POP_H - 4;
        }
        if (top < margin) top = margin;
        setPopoverPos({ top, left });
    }, [open]);

    useLayoutEffect(() => {
        updatePopoverPosition();
    }, [open, updatePopoverPosition]);

    useEffect(() => {
        if (!open) return undefined;
        const onScrollOrResize = () => updatePopoverPosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [open, updatePopoverPosition]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            const t = e.target;
            if (wrapRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const commit = useCallback(
        (next) => {
            if (disabled) return;
            setDraft(next);
            onChange(timePartsTo24(next));
        },
        [onChange, disabled]
    );

    const bumpHour = (dir) => {
        let h = draft.h12 + dir;
        if (h > 12) h = 1;
        if (h < 1) h = 12;
        commit({ ...draft, h12: h });
    };

    const bumpMinute = (dir) => {
        let m = draft.m + dir;
        if (m > 59) m = 0;
        if (m < 0) m = 59;
        commit({ ...draft, m });
    };

    const toggleAp = () => {
        commit({ ...draft, ap: draft.ap === 'AM' ? 'PM' : 'AM' });
    };

    const onOpen = () => {
        if (disabled) return;
        if (preferNativeDialog) {
            const el = nativeTimeRef.current;
            if (el) {
                try {
                    if (typeof el.showPicker === 'function') {
                        el.showPicker();
                        return;
                    }
                    el.click();
                    return;
                } catch {
                    // Fall through to custom popover when native picker is unavailable.
                }
            }
        }
        setDraft(parseTime24ToParts(value));
        setOpen(true);
    };

    const display = useMemo(() => formatDisplay(value), [value]);

    const wrapClass = [
        'mwadmin-time-input-wrap',
        density === 'compact' ? 'mwadmin-time-input-wrap--compact' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const shellClass = ['mwadmin-time-picker-popover', shellDark ? 'mwadmin-time-picker-popover--dark' : '']
        .filter(Boolean)
        .join(' ');

    const popover =
        open && typeof document !== 'undefined' ? (
            <div
                ref={popoverRef}
                className={shellClass}
                style={{
                    position: 'fixed',
                    top: popoverPos.top,
                    left: popoverPos.left,
                    zIndex: POPOVER_Z,
                }}
                role="dialog"
                aria-label="Choose time"
            >
                <div className="mwadmin-time-picker-cols">
                    <div className="mwadmin-time-picker-col">
                        <button type="button" className="mwadmin-time-picker-step" onClick={() => bumpHour(1)} aria-label="Hour up">
                            ▲
                        </button>
                        <span className="mwadmin-time-picker-val">{draft.h12}</span>
                        <button type="button" className="mwadmin-time-picker-step" onClick={() => bumpHour(-1)} aria-label="Hour down">
                            ▼
                        </button>
                    </div>
                    <span className="mwadmin-time-picker-sep">:</span>
                    <div className="mwadmin-time-picker-col">
                        <button type="button" className="mwadmin-time-picker-step" onClick={() => bumpMinute(1)} aria-label="Minute up">
                            ▲
                        </button>
                        <span className="mwadmin-time-picker-val">{String(draft.m).padStart(2, '0')}</span>
                        <button type="button" className="mwadmin-time-picker-step" onClick={() => bumpMinute(-1)} aria-label="Minute down">
                            ▼
                        </button>
                    </div>
                    <div className="mwadmin-time-picker-col mwadmin-time-picker-col--ap">
                        <button type="button" className="mwadmin-time-picker-step" onClick={toggleAp} aria-label="Toggle AM PM">
                            ▲
                        </button>
                        <span className="mwadmin-time-picker-val">{draft.ap}</span>
                        <button type="button" className="mwadmin-time-picker-step" onClick={toggleAp} aria-label="Toggle AM PM">
                            ▼
                        </button>
                    </div>
                </div>
            </div>
        ) : null;

    return (
        <div className={wrapClass} ref={wrapRef}>
            <input
                id={inputId}
                ref={triggerRef}
                type="text"
                className="mwadmin-time-input-field"
                readOnly
                placeholder={placeholder}
                value={display}
                title={title}
                aria-label={inputAriaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                autoComplete="off"
                disabled={disabled}
                onClick={onOpen}
                onFocus={onOpen}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((o) => !o);
                    }
                }}
            />
            <button
                type="button"
                className="mwadmin-time-input-clock"
                tabIndex={-1}
                aria-label="Open time picker"
                disabled={disabled}
                onClick={(e) => {
                    e.preventDefault();
                    onOpen();
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            <input
                ref={nativeTimeRef}
                type="time"
                value={value || ''}
                onChange={(e) => {
                    if (disabled) return;
                    onChange(e.target.value || '');
                }}
                tabIndex={-1}
                aria-hidden="true"
                disabled={disabled}
                style={{
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
            {popover ? createPortal(popover, document.body) : null}
        </div>
    );
}
