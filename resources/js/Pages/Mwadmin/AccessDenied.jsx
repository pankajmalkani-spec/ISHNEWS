import { Head, router } from '@inertiajs/react';
import { motion, useReducedMotion } from 'motion/react';

export default function AccessDenied({ authUser = {}, flash = {} }) {
    const err = flash?.error;
    const reduceMotion = useReducedMotion();

    return (
        <>
            <Head title="Access" />
            <div className="min-h-dvh bg-zinc-950 text-zinc-100">
                <main className="mx-auto flex min-h-dvh max-w-lg items-center px-6 py-10">
                    <motion.div
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg"
                        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={
                            reduceMotion
                                ? { duration: 0.01 }
                                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
                        }
                    >
                        <h1 className="mb-2 text-xl font-semibold">No access</h1>
                        <motion.p
                            className="mb-4 text-sm text-zinc-400"
                            initial={reduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: reduceMotion ? 0 : 0.08, duration: 0.3 }}
                        >
                            {err ||
                                'Your account is signed in, but no mwadmin modules are enabled for this user. Ask an administrator to assign roles and module rights.'}
                        </motion.p>
                        <p className="mb-6 text-xs text-zinc-500">
                            Signed in as <strong className="text-zinc-300">{authUser.username || '—'}</strong>
                        </p>
                        <motion.button
                            type="button"
                            onClick={() => router.post('/mwadmin/logout')}
                            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
                            whileTap={reduceMotion ? {} : { scale: 0.98 }}
                        >
                            Log out
                        </motion.button>
                    </motion.div>
                </main>
            </div>
        </>
    );
}
