import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * Inline validation under a field — used across MW Admin forms.
 */
export function MwadminFieldError({ message, className = 'mwadmin-field-error' }) {
    const reduce = useReducedMotion();
    const show = Boolean(message);
    const dur = reduce ? 0.01 : 0.22;
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    key={String(message)}
                    role="alert"
                    className={className}
                    initial={reduce ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={{ duration: dur, ease: 'easeOut' }}
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
    const dur = reduce ? 0.01 : 0.28;
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    key={String(message)}
                    role="alert"
                    className={className}
                    initial={reduce ? false : { opacity: 0, y: -10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
