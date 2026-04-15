import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const ClassicDialogContext = createContext({
    confirm: async () => false,
    alert: async () => {},
    alertTimed: async () => {},
    prompt: async () => null,
    toast: () => {},
});

export function ClassicDialogProvider({ children }) {
    const reduceMotion = useReducedMotion();
    const [dialog, setDialog] = useState(null);
    const [toasts, setToasts] = useState([]);

    const dismissToast = useCallback((id) => {
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

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
            toast: (message, type = 'info') => {
                const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                const safeType = ['success', 'error', 'info'].includes(type) ? type : 'info';
                setToasts((list) => [...list, { id, message: String(message ?? ''), type: safeType }]);
                window.setTimeout(() => dismissToast(id), 3800);
            },
        }),
        [dismissToast]
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

    const backdropDur = reduceMotion ? 0.01 : 0.2;
    const cardDur = reduceMotion ? 0.01 : 0.32;
    const toastDur = reduceMotion ? 0.01 : 0.26;

    return (
        <ClassicDialogContext.Provider value={api}>
            {children}
            <div className="mwadmin-toast-stack" aria-live="polite">
                <AnimatePresence initial={false}>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            role="status"
                            className={`mwadmin-toast mwadmin-toast--${t.type}`}
                            initial={reduceMotion ? false : { opacity: 0, x: 28, scale: 0.94 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20, scale: 0.96 }}
                            transition={
                                reduceMotion
                                    ? { duration: toastDur }
                                    : { type: 'spring', stiffness: 420, damping: 32 }
                            }
                        >
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <AnimatePresence>
                {dialog ? (
                    <motion.div
                        key="mwadmin-modal-root"
                        className="mwadmin-modal-backdrop"
                        role="presentation"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: backdropDur }}
                    >
                        {dialog.type === 'alert_timed' ? (
                            <motion.div
                                className="mwadmin-modal-card mwadmin-modal-card--timed"
                                role="dialog"
                                aria-modal="true"
                                initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
                                transition={{ duration: cardDur, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <h3>{dialog.title}</h3>
                                <p className="mwadmin-modal-message">{dialog.message}</p>
                                <p className="mwadmin-modal-timed-hint">Returning to listing…</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="mwadmin-modal-card"
                                role="dialog"
                                aria-modal="true"
                                initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                                transition={{ duration: cardDur, ease: [0.22, 1, 0.36, 1] }}
                            >
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
                                        <button
                                            type="button"
                                            className="mwadmin-modal-btn ghost"
                                            onClick={() => close(dialog.type === 'confirm' ? false : null)}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="mwadmin-modal-btn"
                                        onClick={() =>
                                            close(
                                                dialog.type === 'confirm'
                                                    ? true
                                                    : dialog.type === 'prompt'
                                                      ? (dialog.value || '').trim() || null
                                                      : true
                                            )
                                        }
                                    >
                                        OK
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </ClassicDialogContext.Provider>
    );
}

export function useClassicDialog() {
    return useContext(ClassicDialogContext);
}
