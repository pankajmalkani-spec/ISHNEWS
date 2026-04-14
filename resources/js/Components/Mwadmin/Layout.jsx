import { Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { canAccessModule } from '../../lib/mwadminPermissions';
import { MwadminThemeContext } from './MwadminThemeContext';

export default function MwadminLayout({ authUser = {}, activeMenu = 'dashboard', children }) {
    const [isAdministratorOpen, setIsAdministratorOpen] = useState(true);
    const [isMastersOpen, setIsMastersOpen] = useState(true);
    const [isContentOpen, setIsContentOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [themeMode, setThemeMode] = useState(() => {
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

    useEffect(() => {
        try {
            window.localStorage.setItem('mwadmin.theme', themeMode);
        } catch {
            // ignore storage failures
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
                            <span className="mwadmin-user-menu-label">{displayName}</span>
                            <span className="mwadmin-user-menu-caret" aria-hidden="true">
                                {isUserMenuOpen ? '▴' : '▾'}
                            </span>
                        </button>
                        {isUserMenuOpen && (
                            <div className="mwadmin-user-menu">
                                <Link href="/mwadmin/logout" method="post" as="button" className="mwadmin-user-menu-item">
                                    Logout
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="mwadmin-layout">
                <aside className="mwadmin-sidebar">
                    <ul className="mwadmin-menu">
                        {can('dashboard') && (
                            <li className={activeMenu === 'dashboard' ? 'active' : ''}>
                                <Link href="/mwadmin/dashboard">Dashboard</Link>
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
                                                <Link href={item.href}>{item.label}</Link>
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
                                                <Link href={item.href}>{item.label}</Link>
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
                                                <Link href={item.href}>{item.label}</Link>
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
        </div>
        </MwadminThemeContext.Provider>
    );
}
