import { Head, useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function Login({ errors = {} }) {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('mwadmin-ui-dark');
        root.style.backgroundColor = '#01040b';
        document.body.style.backgroundColor = '#01040b';
    }, []);

    const form = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        form.post('/mwadmin/login/service');
    };

    return (
        <>
            <Head title="MW Admin Login" />
            <div className="mwadmin-auth-canvas text-zinc-100">
                <main className="relative z-10 mx-auto flex min-h-dvh max-w-md items-center px-6 py-10">
                    <div className="w-full rounded-2xl border border-zinc-800/90 bg-zinc-900/85 p-6 shadow-[0_22px_70px_rgba(2,6,23,0.55)] backdrop-blur-sm">
                        <h1 className="mb-1 text-2xl font-semibold">Login to your Account</h1>
                        <p className="mb-6 text-sm text-zinc-400">ISH News MW Admin</p>

                        {(errors.username || errors.password) && (
                            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                {errors.username || errors.password}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm text-zinc-300">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={form.data.username}
                                    onChange={(e) => form.setData('username', e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 focus:border-zinc-500"
                                    autoComplete="username"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm text-zinc-300">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 focus:border-zinc-500"
                                    autoComplete="current-password"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-zinc-400">
                                <input
                                    type="checkbox"
                                    checked={form.data.remember}
                                    onChange={(e) => form.setData('remember', e.target.checked)}
                                />
                                Remember me
                            </label>

                            <button
                                type="submit"
                                disabled={form.processing}
                                className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                            >
                                {form.processing ? 'Signing in...' : 'Login'}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </>
    );
}