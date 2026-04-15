import { Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { canAccessModule } from '../../lib/mwadminPermissions';
import { useClassicDialog } from './ClassicDialog';
import { MwadminThemeContext } from './MwadminThemeContext';

export default function MwadminLayout({ authUser = {}, activeMenu = 'dashboard', children }) {
    const dialog = useClassicDialog();
    const reduceMotion = useReducedMotion();
    const [isAdministratorOpen, setIsAdministratorOpen] = useState(true);
    const [isMastersOpen, setIsMastersOpen] = useState(true);
    const [isContentOpen, setIsContentOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [openingModule, setOpeningModule] = useState(null);
    const logoutVisitStarted = useRef(false);
    const moduleVisitStarted = useRef(false);
    const [themeMode, setThemeMode] = useState(() => {
        if (typeof window === 'undefined') return 'light';
        try {
            const saved = window.localStorage.getItem('mwadmin.theme');
            return saved === 'dark' ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    });

    const can = useMemo(() => (key) => canAccessModule(authUser, key), [authUser]);

    const adminLinks = useMemo(
        () =>
            [
                { key: 'category', menu: 'category', href: '/mwadmin/category', label: 'Category' },
                { key: 'subcategory', menu: 'subcategory', href: '/mwadmin/subcategory', label: 'Sub-Category' },
                { key: 'sponsorcategory', menu: 'sponsorcategory', href: '/mwadmin/sponsorcategory', label: 'Sponsor Category' },
                { key: 'users', menu: 'users', href: '/mwadmin/users', label: 'Users' },
                { key: 'roles', menu: 'roles', href: '/mwadmin/roles', label: 'Roles' },
                { key: 'newsletter', menu: 'newsletter', href: '/mwadmin/newsletter', label: 'Newsletter' },
            ].filter((item) => can(item.key)),
        [can]
    );

    const masterLinks = useMemo(
        () =>
            [
                { key: 'sponsor', menu: 'sponsor', href: '/mwadmin/sponsor', label: 'Sponsor' },
                { key: 'advertisement', menu: 'advertisement', href: '/mwadmin/advertisement', label: 'Advertisement' },
                { key: 'newsource', menu: 'newsource', href: '/mwadmin/newsource', label: 'News Source' },
                { key: 'designation', menu: 'designation', href: '/mwadmin/designation', label: 'Designation' },
                { key: 'flowchart', menu: 'flowchart', href: '/mwadmin/flowchart', label: 'Flow Chart' },
            ].filter((item) => can(item.key)),
        [can]
    );

    const contentLinks = useMemo(
        () =>
            [
                { key: 'newslisting', menu: 'newslisting', href: '/mwadmin/newslisting', label: 'News Listing' },
                { key: 'schedule', menu: 'schedule', href: '/mwadmin/schedule', label: 'Weekly Schedule' },
            ].filter((item) => can(item.key)),
        [can]
    );

    const displayName =
        `${authUser.first_name ?? ''} ${authUser.last_name ?? ''}`.trim() ||
        authUser.username ||
        'User';

    const headerAvatarSrc =
        authUser.profile_photo_url ||
        '/images/UserProfile_photo/no_user.png';

    const onLogoutClick = useCallback(async () => {
        setIsUserMenuOpen(false);
        const ok = await dialog.confirm(
            'You will need to sign in again to access MW Admin.',
            'Log out?'
        );
        if (!ok) return;
        setSigningOut(true);
    }, [dialog]);

    const startModuleNavigation = useCallback((event, href, label) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        event.preventDefault();
        if (window.location.pathname === href) return;
        setOpeningModule({ href, label });
    }, []);

    useEffect(() => {
        if (!signingOut) {
            logoutVisitStarted.current = false;
            return;
        }
        const ms = reduceMotion ? 48 : 400;
        const t = window.setTimeout(() => {
            if (logoutVisitStarted.current) return;
            logoutVisitStarted.current = true;
            router.post('/mwadmin/logout', {}, {
                onError: () => {
                    logoutVisitStarted.current = false;
                    setSigningOut(false);
                },
            });
        }, ms);
        return () => window.clearTimeout(t);
    }, [signingOut, reduceMotion]);

    useEffect(() => {
        if (!openingModule) {
            moduleVisitStarted.current = false;
            return;
        }
        const ms = reduceMotion ? 24 : 140;
        const t = window.setTimeout(() => {
            if (moduleVisitStarted.current) return;
            moduleVisitStarted.current = true;
            router.visit(openingModule.href, {
                onError: () => {
                    moduleVisitStarted.current = false;
                    setOpeningModule(null);
                },
            });
        }, ms);
        return () => window.clearTimeout(t);
    }, [openingModule, reduceMotion]);

    useEffect(() => {
        try {
            window.localStorage.setItem('mwadmin.theme', themeMode);
        } catch {
            // ignore storage failures
        }
    }, [themeMode]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (themeMode === 'dark') {
            root.classList.add('mwadmin-ui-dark');
            root.style.backgroundColor = '#01040b';
            document.body.style.backgroundColor = '#01040b';
        } else {
            root.classList.remove('mwadmin-ui-dark');
            root.style.backgroundColor = '#f2ebe0';
            document.body.style.backgroundColor = '#f2ebe0';
        }
    }, [themeMode]);

    return (
        <MwadminThemeContext.Provider value={{ themeMode }}>
        <div className={`mwadmin-shell ${themeMode === 'dark' ? 'mwadmin-theme-dark' : ''}`}>
            <header className="mwadmin-header">
                <img className="mwadmin-logo" src="/images/ish_news.png" alt="ISH News" />
                <div className="mwadmin-header-right">
                    <div
                        className="mwadmin-theme-segment"
                        role="group"
                        aria-label="Interface theme"
                    >
                        <button
                            type="button"
                            className={themeMode === 'light' ? 'is-active' : ''}
                            onClick={() => setThemeMode('light')}
                        >
                            Light
                        </button>
                        <button
                            type="button"
                            className={themeMode === 'dark' ? 'is-active' : ''}
                            onClick={() => setThemeMode('dark')}
                        >
                            Dark
                        </button>
                    </div>
                    <div className="mwadmin-user-menu-wrap">
                        <button
                            type="button"
                            className="mwadmin-user-menu-btn"
                            onClick={() => setIsUserMenuOpen((v) => !v)}
                            aria-expanded={isUserMenuOpen}
                        >
                            <img
                                className="mwadmin-header-avatar"
                                src={headerAvatarSrc}
                                alt=""
                                onError={(e) => {
                                    e.currentTarget.src = '/images/categoryImages/boxImages/no_img.gif';
                                }}
                            />
                            <span className="mwadmin-user-menu-label">{displayName}</span>
                            <span className="mwadmin-user-menu-caret" aria-hidden="true">
                                {isUserMenuOpen ? '▴' : '▾'}
                            </span>
                        </button>
                        <AnimatePresence>
                            {isUserMenuOpen && (
                                <motion.div
                                    className="mwadmin-user-menu"
                                    style={{ transformOrigin: 'top right' }}
                                    initial={
                                        reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
                                    }
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={
                                        reduceMotion
                                            ? { opacity: 0 }
                                            : { opacity: 0, y: -4, scale: 0.99 }
                                    }
                                    transition={
                                        reduceMotion
                                            ? { duration: 0.01 }
                                            : { type: 'spring', stiffness: 520, damping: 34 }
                                    }
                                >
                                    <Link
                                        href="/mwadmin/profile"
                                        className="mwadmin-user-menu-item"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        My Profile
                                    </Link>
                                    <button
                                        type="button"
                                        className="mwadmin-user-menu-item"
                                        onClick={onLogoutClick}
                                    >
                                        Log Out
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <div className="mwadmin-layout">
                <aside className="mwadmin-sidebar">
                    <ul className="mwadmin-menu">
                        {can('dashboard') && (
                            <li className={activeMenu === 'dashboard' ? 'active' : ''}>
                                <Link
                                    href="/mwadmin/dashboard"
                                    onClick={(e) => startModuleNavigation(e, '/mwadmin/dashboard', 'Dashboard')}
                                >
                                    Dashboard
                                </Link>
                            </li>
                        )}
                        {adminLinks.length > 0 && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setIsAdministratorOpen((value) => !value)}
                                    className="mwadmin-collapse-btn"
                                >
                                    Administrator{' '}
                                    <span style={{ float: 'right' }}>{isAdministratorOpen ? '▾' : '▸'}</span>
                                </button>
                                {isAdministratorOpen && (
                                    <ul className="mwadmin-submenu">
                                        {adminLinks.map((item) => (
                                            <li key={item.href} className={activeMenu === item.menu ? 'active' : ''}>
                                                <Link
                                                    href={item.href}
                                                    onClick={(e) => startModuleNavigation(e, item.href, item.label)}
                                                >
                                                    {item.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        )}
                        {masterLinks.length > 0 && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setIsMastersOpen((value) => !value)}
                                    className="mwadmin-collapse-btn"
                                >
                                    Masters <span style={{ float: 'right' }}>{isMastersOpen ? '▾' : '▸'}</span>
                                </button>
                                {isMastersOpen && (
                                    <ul className="mwadmin-submenu">
                                        {masterLinks.map((item) => (
                                            <li key={item.href} className={activeMenu === item.menu ? 'active' : ''}>
                                                <Link
                                                    href={item.href}
                                                    onClick={(e) => startModuleNavigation(e, item.href, item.label)}
                                                >
                                                    {item.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        )}
                        {contentLinks.length > 0 && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setIsContentOpen((value) => !value)}
                                    className="mwadmin-collapse-btn"
                                >
                                    Content{' '}
                                    <span style={{ float: 'right' }}>{isContentOpen ? '▾' : '▸'}</span>
                                </button>
                                {isContentOpen && (
                                    <ul className="mwadmin-submenu">
                                        {contentLinks.map((item) => (
                                            <li key={item.href} className={activeMenu === item.menu ? 'active' : ''}>
                                                <Link
                                                    href={item.href}
                                                    onClick={(e) => startModuleNavigation(e, item.href, item.label)}
                                                >
                                                    {item.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        )}
                    </ul>
                </aside>

                <main className="mwadmin-content">{children}</main>
            </div>

            <AnimatePresence>
                {openingModule && (
                    <motion.div
                        className="mwadmin-signing-out-overlay"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: reduceMotion ? 0.01 : 0.14,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <motion.div
                            className="mwadmin-signing-out-card"
                            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={
                                reduceMotion
                                    ? { duration: 0.01 }
                                    : { delay: 0.01, duration: 0.16, ease: [0.22, 1, 0.36, 1] }
                            }
                        >
                            <span className="mwadmin-signing-out-text">Opening {openingModule.label}…</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {signingOut && (
                    <motion.div
                        className="mwadmin-signing-out-overlay"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: reduceMotion ? 0.01 : 0.38,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <motion.div
                            className="mwadmin-signing-out-card"
                            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={
                                reduceMotion
                                    ? { duration: 0.01 }
                                    : { delay: 0.06, duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                            }
                        >
                            <span className="mwadmin-signing-out-text">Signing out…</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </MwadminThemeContext.Provider>
    );
}
