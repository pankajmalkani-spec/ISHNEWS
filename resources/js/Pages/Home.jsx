import { Head } from '@inertiajs/react';
import { SPONSOR_LOGO_PLACEHOLDER_PATH } from '../constants/sponsorPlaceholder';

function fmtDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

const COVER_IMG_FALLBACK = '/images/NewsContents/coverImages/no_img.png';
const SPONSOR_LOGO_FALLBACK = '/images/sponsorLogo/no_img.png';

/** Legacy-style cover path; if missing on disk, img onError falls back to {@link COVER_IMG_FALLBACK}. */
function coverSrc(file) {
    const s = file != null && file !== undefined ? String(file).trim() : '';
    return s !== '' ? `/images/NewsContents/coverImages/${s}` : COVER_IMG_FALLBACK;
}

export default function Home({
    menu = [],
    categorySections = [],
    banner = [],
    cslider = [],
}) {
    const sortedSections = [...categorySections].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const sec1 = sortedSections.find((s) => s.sort === 1);
    const sec2 = sortedSections.find((s) => s.sort === 2);
    const sec3 = sortedSections.find((s) => s.sort === 3);
    const sec4 = sortedSections.find((s) => s.sort === 4);
    const sec5 = sortedSections.find((s) => s.sort === 5);
    const topMenu = menu.length > 0
        ? menu
        : sortedSections.map((s) => ({
              id: s.id,
              code: s.code,
              title: s.title,
              subcategories: [],
              latest: [],
          }));

    return (
        <>
            <Head title="ISH News" />
            <Head>
                <link rel="stylesheet" href="/assets/css/modernmag-assets.min.css" />
                <link rel="stylesheet" href="/assets/css/style.css" />
                <style>{`
                    .navbar { display: block !important; visibility: visible !important; z-index: 1000; }
                    .home-nav-wrap .navbar-collapse { display: flex !important; align-items: center; }
                    .home-nav-wrap .navbar-collapse > .navbar-nav { flex: 1 1 auto; }
                    .home-nav-wrap .navbar-nav > li { display: block !important; }
                    .home-nav-wrap .navbar-nav > li > a { cursor: pointer; }
                    .navbar .nav-link { color: #fff !important; opacity: 1 !important; }
                    .navbar-nav { display: flex !important; flex-wrap: wrap; }
                    .navbar .nav-item { position: relative; }
                    .navbar .nav-link { font-size: 12px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; padding: 13px 14px !important; }
                    .navbar .nav-item:hover > .nav-link { background: #1d212b; }
                    #container { background: #f6f7fb; }
                    #content .container { padding-top: 12px; }
                    .search-box { margin-bottom: 18px; }
                    .search-box .search-form input { height: 42px; border: 1px solid #d8dfea; border-radius: 2px; font-size: 14px; }
                    .title-section h1 { font-size: 28px; letter-spacing: .01em; }
                    .posts-block { background: #fff; border: 1px solid #e6ebf2; padding: 14px; border-radius: 3px; margin-bottom: 18px; }
                    .news-post.standart-post h2 a { color: #1d2a3b !important; font-size: 30px; font-weight: 700; line-height: 1.34; }
                    .news-post.standart-post h2 { margin-top: 10px; }
                    .home-nav-wrap { position: relative; z-index: 1100; }
                    .mega-posts-menu {
                        position: absolute; top: 100%; left: 0; right: 0; min-width: 760px; z-index: 1200;
                        background: #1b1d22; border-top: 1px solid #29497f; box-shadow: 0 12px 24px rgba(0,0,0,0.35);
                        display: none;
                    }
                    .home-nav-wrap .nav-item.mega-item:hover > .mega-posts-menu { display: block; }
                    .mega-posts-menu .posts-line { padding: 16px 14px 18px; }
                    .mega-posts-menu .filter-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; padding: 0; list-style: none; }
                    .mega-posts-menu .filter-list li a {
                        border: 1px solid #2e4778; color: #cdd9f1; padding: 5px 10px; font-size: 12px; line-height: 1;
                        background: transparent; text-transform: none;
                    }
                    .mega-posts-menu .filter-list li a:hover { background: #22345a; color: #fff; }
                    .mega-posts-menu .filter-list li a.is-active { background: #2b63b8; border-color: #2b63b8; color: #fff; }
                    .mega-posts-menu img { width: 100%; height: 180px; object-fit: cover; background: #fff; }
                    .mega-posts-menu .news-post h2 { margin-top: 8px; }
                    .mega-posts-menu .news-post h2 a { color: #e9edf7 !important; font-size: 20px; font-weight: 700; line-height: 1.35; }
                    .news-post .post-image img { width: 100%; object-fit: cover; }
                    .wide-news-heading .news-post.large-image-post img { min-height: 470px; object-fit: cover; }
                    .wide-news-heading .item .news-post.image-post img { min-height: 228px; object-fit: cover; }
                    .up-footer { background: #111722; padding-top: 22px; margin-top: 8px; }
                    .down-footer { background: #0b1019; }
                `}</style>
            </Head>
            <div id="container">
                <header className="clearfix">
                    <div className="top-line">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-8 col-sm-9">
                                    <ul className="info-list">
                                        <li><a href="/about">About</a></li>
                                        <li><a href="/contact">Contact</a></li>
                                        <li><a href="/sitemap"><i className="fa fa-sitemap" /></a></li>
                                    </ul>
                                </div>
                                <div className="col-md-4 col-sm-3">
                                    <ul className="social-icons">
                                        <li><a className="youtube" href="https://www.youtube.com/ishnews" target="_blank" rel="noreferrer"><i className="fa fa-youtube-play" /></a></li>
                                        <li><a className="facebook" href="https://www.facebook.com/ISHNews/" target="_blank" rel="noreferrer"><i className="fa fa-facebook" /></a></li>
                                        <li><a className="instagram" href="https://www.instagram.com/ishnews/" target="_blank" rel="noreferrer"><i className="fa fa-instagram" /></a></li>
                                        <li><a className="twitter" href="https://twitter.com/ishnews_tv" target="_blank" rel="noreferrer"><i className="fa fa-twitter" /></a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="header-banner" className="header-banner-place">
                        <div className="container">
                            <div className="row">
                                <div className="col-sm-5">
                                    <div className="header-tagline">Information Beyond Words</div>
                                </div>
                                <div className="col-sm-2">
                                    <div className="header-logo">
                                        <a className="navbar-brand" href="/">
                                            <img className="logo" src="/images/ish-news-logo.png" alt="ISH News" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="home-nav-wrap">
                        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                            <div className="container">
                                <div className="navbar-collapse">
                                    <ul className="navbar-nav mr-auto">
                                        <li className="nav-item active"><a className="nav-link" href="/">Home</a></li>
                                        {topMenu.map((cat) => (
                                            <li
                                                key={cat.id}
                                                className="nav-item mega-item"
                                            >
                                                <a className={`nav-link ${cat.code}`} href={`/category/${cat.code}`}>
                                                    {cat.title}
                                                </a>
                                                <div className="mega-posts-menu">
                                                    <div className="container">
                                                        <div className="posts-line">
                                                            <ul className="filter-list">
                                                                <li>
                                                                    <a className={cat.code} href={`/category/${cat.code}`}>
                                                                        All
                                                                    </a>
                                                                </li>
                                                                {(cat.subcategories || []).map((sub) => (
                                                                    <li key={sub.id}>
                                                                        <a className={cat.code} href={`/category/${cat.code}/${sub.code}`}>
                                                                            {sub.name}
                                                                        </a>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <div className="row">
                                                                {(cat.latest || []).slice(0, 4).map((item) => (
                                                                    <div className="col-lg-3 col-md-6" key={item.id}>
                                                                        <div className="news-post standart-post">
                                                                            <div className="post-image">
                                                                                <a href={`/videos/${item.categorycode}/${item.permalink}`}>
                                                                                    <img
                                                                                        src={coverSrc(item.cover_img)}
                                                                                        alt={item.content_title}
                                                                                        onError={(e) => {
                                                                                            e.currentTarget.onerror = null;
                                                                                            e.currentTarget.src = COVER_IMG_FALLBACK;
                                                                                        }}
                                                                                    />
                                                                                </a>
                                                                                <a href={`/category/${item.categorycode}/${item.subcatcode || ''}`} className={`category category-${item.categorycode}`}>
                                                                                    {item.subcatname || cat.title}
                                                                                </a>
                                                                            </div>
                                                                            <h2>
                                                                                <a href={`/videos/${item.categorycode}/${item.permalink}`}>
                                                                                    {item.content_title}
                                                                                </a>
                                                                            </h2>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <form method="get" className="form-inline my-2 my-lg-0" action="/search">
                                        <input name="sKeyword" className="form-control mr-sm-2" type="search" placeholder="Search for..." />
                                    </form>
                                </div>
                            </div>
                        </nav>
                    </div>
                </header>

                <div id="content">
                    {banner.length > 0 && (
                        <div id="ish-featured" className="wide-news-heading">
                            <div className="item main-news">
                                <div className="news-post large-image-post">
                                    <img
                                        src={coverSrc(banner[0]?.cover_img)}
                                        alt={banner[0]?.title || 'Featured'}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = COVER_IMG_FALLBACK;
                                        }}
                                    />
                                    <div className="hover-box">
                                        <a href={`/category/${banner[0]?.categorycode || ''}`} className={`category category-${banner[0]?.categorycode || 'deaf_buzz'}`}>
                                            {banner[0]?.categoryname || 'ISH News'}
                                        </a>
                                        <h2>
                                            <a href={`/videos/${banner[0]?.categorycode || ''}/${banner[0]?.permalink || ''}`}>
                                                {banner[0]?.title || 'Featured Story'}
                                            </a>
                                        </h2>
                                    </div>
                                </div>
                            </div>
                            {banner.slice(1, 5).map((item) => (
                                <div className="item" key={item.id}>
                                    <div className="news-post image-post">
                                        <a href={`/videos/${item.categorycode}/${item.permalink}`}>
                                            <img
                                                src={coverSrc(item.cover_img)}
                                                alt={item.title}
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = COVER_IMG_FALLBACK;
                                                }}
                                            />
                                        </a>
                                        <div className="hover-box">
                                            <a href={`/category/${item.categorycode}/${item.subcategorycode || ''}`} className={`category category-${item.categorycode}`}>
                                                {item.categoryname}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="container">
                        <div className="row">
                            <div className="col-lg-12">
                                <div className="search-box">
                                    <form role="search" className="search-form" method="get" action="/search">
                                        <input name="sKeyword" className="form-control mr-sm-2" type="search" placeholder="Search here" />
                                    </form>
                                </div>
                            </div>
                        </div>

                        <div className="desktop-view">
                            {sec1 && (
                                <div className="posts-block">
                                    <div className="title-section">
                                        <h1 className={sec1.code}>{sec1.title}<a href={`/category/${sec1.code}`} className={`btn-more category category-${sec1.code}`}>More</a></h1>
                                    </div>
                                    <div className="row">
                                        {sec1.news_list.map((item) => (
                                            <div className="col-sm-6 col-md-4" key={item.id}>
                                                <div className="news-post standart-post">
                                                    <div className="post-image">
                                                        <a href={`/videos/${item.categorycode}/${item.permalink}`}>
                                                            <img
                                                                src={coverSrc(item.cover_img)}
                                                                alt={item.title}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = COVER_IMG_FALLBACK;
                                                                }}
                                                            />
                                                        </a>
                                                    </div>
                                                    <h2><a href={`/videos/${item.categorycode}/${item.permalink}`}>{item.title}</a></h2>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sec2 && (
                                <div className="posts-block">
                                    <div className="title-section">
                                        <h1 className={sec2.code}>{sec2.title}<a href={`/category/${sec2.code}`} className={`btn-more category category-${sec2.code}`}>More</a></h1>
                                    </div>
                                    <div className="row">
                                        {sec2.news_list.map((item, idx) => (
                                            <div className={idx === 0 ? 'col-md-6' : 'col-6 col-md-3'} key={item.id}>
                                                <div className={`news-post ${idx === 0 ? 'standart-post' : 'thumb-post'}`}>
                                                    <div className="post-image">
                                                        <a href={`/videos/${item.categorycode}/${item.permalink}`}>
                                                            <img
                                                                src={coverSrc(item.cover_img)}
                                                                alt={item.title}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = COVER_IMG_FALLBACK;
                                                                }}
                                                            />
                                                        </a>
                                                    </div>
                                                    <h2><a href={`/videos/${item.categorycode}/${item.permalink}`}>{item.title}</a></h2>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {[sec3, sec4, sec5].filter(Boolean).map((section) => (
                                <div className="posts-block" key={section.id}>
                                    <div className="title-section">
                                        <h1 className={section.code}>{section.title}<a href={`/category/${section.code}`} className={`btn-more category category-${section.code}`}>More</a></h1>
                                    </div>
                                    <div className="row">
                                        {section.news_list.map((item) => (
                                            <div className="col-sm-6" key={item.id}>
                                                <div className="news-post standart-post">
                                                    <div className="post-image">
                                                        <a href={`/videos/${item.categorycode}/${item.permalink}`}>
                                                            <img
                                                                src={coverSrc(item.cover_img)}
                                                                alt={item.title}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = COVER_IMG_FALLBACK;
                                                                }}
                                                            />
                                                        </a>
                                                        <a href={`/category/${item.categorycode}/${item.subcategorycode || ''}`} className={`category category-${item.categorycode}`}>
                                                            {item.subcategoryname || section.title}
                                                        </a>
                                                    </div>
                                                    <h2><a href={`/videos/${item.categorycode}/${item.permalink}`}>{item.title}</a></h2>
                                                    <ul className="post-tags">
                                                        <li><i className="fa fa-calendar" /> <a href="#">{fmtDateTime(item.schedule_date)}</a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <section id="Sponsor-section">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="posts-block">
                                        <h2>Our Sponsors</h2>
                                        <div className="row">
                                            {cslider.map((s, idx) => (
                                                <div className="col-6 col-md-4 col-lg-2" key={`${s.logo}-${idx}`}>
                                                    <div className="news-post standart-post">
                                                        <div className="post-image">
                                                            <a href={s.website || '#'} target="_blank" rel="noreferrer">
                                                                <img
                                                                    src={`/images/sponsorLogo/${s.logo || 'no_img.png'}`}
                                                                    alt={s.organization_name}
                                                                    onError={(e) => {
                                                                        e.currentTarget.onerror = null;
                                                                        e.currentTarget.src = SPONSOR_LOGO_FALLBACK;
                                                                    }}
                                                                />
                                                            </a>
                                                        </div>
                                                        <h3><a href={s.website || '#'} target="_blank" rel="noreferrer">{s.organization_name}</a></h3>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <footer>
                    <div className="container">
                        <div className="up-footer">
                            <div className="row">
                                <div className="col-lg-3 col-md-6">
                                    <div className="footer-widget text-widget">
                                        <h1><a href="https://indiasigninghands.com/"><img id="footer-logo" src="/images/ish-logo.jpg" alt="ISH Logo" /></a></h1>
                                        <p>ISH News is one of the projects operated by India Signing Hands Private Limited (ISH), dedicated to accessibility and education for the Deaf Community.</p>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className="footer-widget tags-widget">
                                        <h1>Tags</h1>
                                        <ul className="tags-list">
                                            <li><a href="/search?sKeyword=Deaf">Deaf</a></li>
                                            <li><a href="/search?sKeyword=News">News</a></li>
                                            <li><a href="/search?sKeyword=Accessibility">Accessibility</a></li>
                                            <li><a href="/search?sKeyword=Entertainment">Entertainment</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="down-footer">
                            <ul className="list-footer">
                                <li><a href="/">Home</a></li>
                                <li><a href="/about">About</a></li>
                                <li><a href="/contact">Contact</a></li>
                                <li><a href="/sitemap">Sitemap</a></li>
                            </ul>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
