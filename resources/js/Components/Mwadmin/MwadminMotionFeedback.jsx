import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * Inline validation under a field — used across MW Admin forms.
 */
export function MwadminFieldError({ message, className = 'mwadmin-field-error' }) {
    const reduce = useReducedMotion();
    const show = Boolean(message);
    const durIn = reduce ? 0.01 : 0.05;
    const durOut = reduce ? 0.01 : 0.035;
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    key={String(message)}
                    role="alert"
                    className={className}
                    initial={reduce ? false : { opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: durIn, ease: [0.22, 1, 0.36, 1] } }}
                    exit={
                        reduce
                            ? { opacity: 0 }
                            : { opacity: 0, y: -1, transition: { duration: durOut, ease: [0.22, 1, 0.36, 1] } }
                    }
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Full-width / block error (load failures, API errors).
 */
export function MwadminErrorBanner({ message, className = 'mwadmin-error' }) {
    const reduce = useReducedMotion();
    const show = Boolean(message);
    const dur = reduce ? 0.01 : 0.11;
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    key={String(message)}
                    role="alert"
                    className={className}
                    initial={reduce ? false : { opacity: 0, y: -6, scale: 0.995 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
                    transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
