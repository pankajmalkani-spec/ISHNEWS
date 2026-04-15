import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

export default function Login() {
    const reduceMotion = useReducedMotion();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    /** idle | submitting | success | error */
    const [phase, setPhase] = useState('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('mwadmin-ui-dark');
        root.style.backgroundColor = '#01040b';
        document.body.style.backgroundColor = '#01040b';
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setMessage('');
        setPhase('submitting');
        try {
            const { data } = await axios.post(
                '/api/mwadmin/login',
                {
                    username: username.trim(),
                    password,
                },
                {
                    headers: {
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                }
            );
            if (data?.ok && data?.intended) {
                setPhase('success');
                setMessage('Signed in successfully.');
                const delayMs = reduceMotion ? 200 : 900;
                await new Promise((r) => setTimeout(r, delayMs));
                router.visit(data.intended);
                return;
            }
            setPhase('error');
            setMessage('Could not complete sign-in. Please try again.');
        } catch (err) {
            setPhase('error');
            const d = err.response?.data;
            let msg =
                d?.message ||
                d?.errors?.username?.[0] ||
                d?.errors?.password?.[0] ||
                'Invalid username or password. Try again.';
            if (d?.errors && typeof d.errors === 'object') {
                const first = Object.values(d.errors).flat().find(Boolean);
                if (first) msg = first;
            }
            setMessage(msg);
        }
    };

    const clearFeedback = () => {
        if (phase === 'error') {
            setPhase('idle');
            setMessage('');
        }
    };

    const busy = phase === 'submitting' || phase === 'success';
    const showError = phase === 'error' && message;
    const showSuccess = phase === 'success' && message;

    const cardTransition = reduceMotion
        ? { duration: 0.01 }
        : { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

    return (
        <>
            <Head title="MW Admin Login" />
            <div className="mwadmin-auth-canvas text-zinc-100">
                <main className="relative z-10 mx-auto flex min-h-dvh max-w-md items-center px-6 py-10">
                    <motion.div
                        className="w-full rounded-2xl border border-zinc-800/90 bg-zinc-900/85 p-6 shadow-[0_22px_70px_rgba(2,6,23,0.55)] backdrop-blur-sm"
                        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={cardTransition}
                    >
                        <motion.div
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...cardTransition, delay: reduceMotion ? 0 : 0.06 }}
                        >
                            <h1 className="mb-1 text-2xl font-semibold">Login to your Account</h1>
                            <p className="mb-6 text-sm text-zinc-400">ISH News MW Admin</p>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {showError ? (
                                <motion.div
                                    key="login-error"
                                    role="alert"
                                    className="mb-4 overflow-hidden rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-sm text-red-100"
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -6, height: 0 }}
                                    transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: 'easeOut' }}
                                >
                                    {message}
                                </motion.div>
                            ) : null}
                            {showSuccess ? (
                                <motion.div
                                    key="login-success"
                                    role="status"
                                    className="mb-4 overflow-hidden rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-2.5 text-sm text-emerald-100"
                                    initial={{ opacity: 0, y: -8, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -6, height: 0 }}
                                    transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: 'easeOut' }}
                                >
                                    <span className="font-medium">{message}</span>
                                    <span className="mt-1 block text-xs text-emerald-200/90">
                                        Redirecting you to your workspace…
                                    </span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <form onSubmit={submit} className="space-y-4">
                            <motion.div
                                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: reduceMotion ? 0 : 0.1, ...cardTransition }}
                            >
                                <label className="mb-1 block text-sm text-zinc-300">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        clearFeedback();
                                    }}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 focus:border-zinc-500"
                                    autoComplete="username"
                                    disabled={busy}
                                    required
                                />
                            </motion.div>

                            <motion.div
                                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: reduceMotion ? 0 : 0.16, ...cardTransition }}
                            >
                                <label className="mb-1 block text-sm text-zinc-300">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        clearFeedback();
                                    }}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 focus:border-zinc-500"
                                    autoComplete="current-password"
                                    disabled={busy}
                                    required
                                />
                            </motion.div>

                            <motion.label
                                className="flex items-center gap-2 text-sm text-zinc-400"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: reduceMotion ? 0 : 0.2, ...cardTransition }}
                            >
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    disabled={busy}
                                />
                                Remember me
                            </motion.label>

                            <motion.div
                                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: reduceMotion ? 0 : 0.22, ...cardTransition }}
                            >
                                <motion.button
                                    type="submit"
                                    disabled={busy}
                                    className="relative w-full overflow-hidden rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-65"
                                    whileTap={reduceMotion ? {} : { scale: 0.985 }}
                                    transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                                >
                                    <span className="relative z-10">
                                        {phase === 'submitting'
                                            ? 'Signing in…'
                                            : phase === 'success'
                                              ? 'Success'
                                              : 'Login'}
                                    </span>
                                    {phase === 'submitting' && !reduceMotion ? (
                                        <motion.span
                                            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '100%' }}
                                            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                                        />
                                    ) : null}
                                </motion.button>
                            </motion.div>
                        </form>
                    </motion.div>
                </main>
            </div>
        </>
    );
}
