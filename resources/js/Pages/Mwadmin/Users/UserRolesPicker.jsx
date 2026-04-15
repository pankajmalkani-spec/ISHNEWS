import { useEffect, useRef, useState } from 'react';
import { MwadminFieldError } from '../../../Components/Mwadmin/MwadminMotionFeedback';

/**
 * Multi-select styled like a dropdown: pills inside the field, list opens below (no native listbox).
 */
export default function UserRolesPicker({
    roleOptions = [],
    roleIds = [],
    onRoleIdsChange,
    fieldError,
    onClearError,
    id = 'mwadmin-roles-ms',
    placeholder = 'Select roles…',
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const toggleRole = (idStr) => {
        const set = new Set(roleIds);
        if (set.has(idStr)) set.delete(idStr);
        else set.add(idStr);
        onRoleIdsChange([...set]);
        onClearError?.();
    };

    const removeRole = (idStr) => {
        onRoleIdsChange(roleIds.filter((x) => x !== idStr));
        onClearError?.();
    };

    const clearAll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onRoleIdsChange([]);
        onClearError?.();
    };

    const selectedMeta = roleIds.map((rid) => {
        const r = roleOptions.find((x) => String(x.arid) === rid);
        return { id: rid, label: r?.rolename ?? `#${rid}` };
    });

    return (
        <div className="mwadmin-user-roles-picker" ref={rootRef}>
            <div
                className={`mwadmin-roles-combobox ${open ? 'is-open' : ''} ${fieldError ? 'has-error' : ''}`}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                }}
                role="combobox"
                aria-expanded={open}
                aria-controls={`${id}-listbox`}
                aria-haspopup="listbox"
                tabIndex={0}
            >
                <div className="mwadmin-roles-combobox-inner">
                    {selectedMeta.length === 0 ? (
                        <span className="mwadmin-roles-combobox-placeholder">{placeholder}</span>
                    ) : (
                        selectedMeta.map(({ id: rid, label }) => (
                            <span
                                key={rid}
                                className="mwadmin-roles-chip"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className="mwadmin-roles-chip-x"
                                    aria-label={`Remove ${label}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeRole(rid);
                                    }}
                                >
                                    ×
                                </button>
                                <span className="mwadmin-roles-chip-text">{label}</span>
                            </span>
                        ))
                    )}
                </div>
                <div className="mwadmin-roles-combobox-actions" onClick={(e) => e.stopPropagation()}>
                    {roleIds.length > 0 && (
                        <button
                            type="button"
                            className="mwadmin-roles-clear-all"
                            aria-label="Clear all roles"
                            onClick={clearAll}
                        >
                            ×
                        </button>
                    )}
                    <span className="mwadmin-roles-chevron" aria-hidden>
                        ▾
                    </span>
                </div>
            </div>
            {open && (
                <ul id={`${id}-listbox`} className="mwadmin-roles-dropdown" role="listbox">
                    {roleOptions.length === 0 ? (
                        <li className="mwadmin-roles-dd-item is-empty">No roles available</li>
                    ) : (
                        roleOptions.map((r) => {
                            const idStr = String(r.arid);
                            const selected = roleIds.includes(idStr);
                            return (
                                <li
                                    key={r.arid}
                                    role="option"
                                    aria-selected={selected}
                                    className={`mwadmin-roles-dd-item ${selected ? 'is-selected' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleRole(idStr);
                                    }}
                                >
                                    {r.rolename}
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
            <MwadminFieldError message={fieldError} />
        </div>
    );
}
