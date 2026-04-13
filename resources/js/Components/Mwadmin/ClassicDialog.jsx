import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ClassicDialogContext = createContext({
    confirm: async () => false,
    alert: async () => {},
    alertTimed: async () => {},
    prompt: async () => null,
});

export function ClassicDialogProvider({ children }) {
    const [dialog, setDialog] = useState(null);

    const api = useMemo(
        () => ({
            confirm: (message, title = 'Please Confirm') =>
                new Promise((resolve) => {
                    setDialog({
                        type: 'confirm',
                        title,
                        message,
                        resolve,
                    });
                }),
            alert: (message, title = 'Notification') =>
                new Promise((resolve) => {
                    setDialog({
                        type: 'alert',
                        title,
                        message,
                        resolve,
                    });
                }),
            alertTimed: (message, title = 'Notification', durationMs = 2000) =>
                new Promise((resolve) => {
                    setDialog({
                        type: 'alert_timed',
                        title,
                        message,
                        durationMs,
                        resolve,
                    });
                }),
            prompt: (message, title = 'Input Required', defaultValue = '') =>
                new Promise((resolve) => {
                    setDialog({
                        type: 'prompt',
                        title,
                        message,
                        value: defaultValue,
                        resolve,
                    });
                }),
        }),
        []
    );

    const close = (result) => {
        if (!dialog) return;
        dialog.resolve(result);
        setDialog(null);
    };

    useEffect(() => {
        if (!dialog || dialog.type !== 'alert_timed') return undefined;
        const ms = Math.max(800, Number(dialog.durationMs) || 2000);
        const handle = dialog;
        const t = setTimeout(() => {
            handle.resolve(true);
            setDialog(null);
        }, ms);
        return () => clearTimeout(t);
    }, [dialog]);

    return (
        <ClassicDialogContext.Provider value={api}>
            {children}
            {dialog && (
                <div className="mwadmin-modal-backdrop" role="presentation">
                    {dialog.type === 'alert_timed' ? (
                        <div className="mwadmin-modal-card mwadmin-modal-card--timed" role="dialog" aria-modal="true">
                            <h3>{dialog.title}</h3>
                            <p className="mwadmin-modal-message">{dialog.message}</p>
                            <p className="mwadmin-modal-timed-hint">Returning to listing…</p>
                        </div>
                    ) : (
                        <div className="mwadmin-modal-card" role="dialog" aria-modal="true">
                            <h3>{dialog.title}</h3>
                            <p className="mwadmin-modal-message">{dialog.message}</p>
                            {dialog.type === 'prompt' && (
                                <input
                                    autoFocus
                                    className="mwadmin-modal-input"
                                    value={dialog.value || ''}
                                    onChange={(e) => setDialog((d) => ({ ...d, value: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') close((dialog.value || '').trim() || null);
                                    }}
                                />
                            )}
                            <div className="mwadmin-modal-actions">
                                {dialog.type !== 'alert' && (
                                    <button type="button" className="mwadmin-modal-btn ghost" onClick={() => close(dialog.type === 'confirm' ? false : null)}>
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="mwadmin-modal-btn"
                                    onClick={() => close(dialog.type === 'confirm' ? true : dialog.type === 'prompt' ? ((dialog.value || '').trim() || null) : true)}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </ClassicDialogContext.Provider>
    );
}

export function useClassicDialog() {
    return useContext(ClassicDialogContext);
}
