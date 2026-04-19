<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta http-equiv="Cache-control" content="public">
  <meta name="description" content="{{ \Illuminate\Support\Str::limit(strip_tags($pageDescription ?? ''), 300) }}">
  <meta name="keywords" content="{{ $news->seo_keyword ?? '' }}">
  <meta name="author" content="{{ $news->newsourcename ?? '' }}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:url" content="{{ url('/videos/'.($news->categorycode ?? '').'/'.($news->permalink ?? '')) }}">
  <meta name="twitter:title" content="{{ $pageTitle ?? 'Video' }} | ISH News">
  <meta name="twitter:description" content="{{ \Illuminate\Support\Str::limit(strip_tags((string) ($news->description ?? '')), 200) }}">
  <meta name="twitter:image" content="{{ \App\Support\FrontendMedia::coverImageUrl($news->cover_img ?? null) }}">
  <meta property="og:title" content="{{ $pageTitle ?? 'Video' }} | ISH News">
  <meta property="og:description" content="{{ \Illuminate\Support\Str::limit(strip_tags((string) ($news->description ?? '')), 200) }}">
  <meta property="og:url" content="{{ url('/videos/'.($news->categorycode ?? '').'/'.($news->permalink ?? '')) }}">
  <meta property="og:image" content="{{ \App\Support\FrontendMedia::coverImageUrl($news->cover_img ?? null) }}">
  <title>{{ $pageTitle ?? 'Video' }} | ISH News</title>
  @include('frontend.inc_htmlhead')
</head>
<body>
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @include('frontend.inc_navbar')
  </header>

  <section id="content-section">
    <div class="container">
      <div class="row">
        <div class="col-lg-9">
          <div id="js-video-main">
            @include('frontend.partials.video_show_main', ['news' => $news])
          </div>
        </div>
        <div class="col-lg-3 sidebar-sticky" id="js-video-sidebar">
          @include('frontend.partials.video_sidebar_recent', ['recentNews' => $recentNews])
        </div>
      </div>
    </div>
  </section>

  @include('frontend.inc_carousel_slider')
  @include('frontend.inc_footerbottom')
</div>
@include('frontend.inc_footerscript')
<script>
(function () {
  function ishNewsYoutubeId(url) {
    if (!url) return '';
    var m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (m && m[2] && m[2].length === 11) ? m[2] : 'error';
  }

  window.ishNewsInitYoutubeIframe = function (root) {
    var scope = root && root.querySelector ? root : document;
    var wrap = scope.querySelector ? scope.querySelector('#ish-news-video-root') : null;
    if (!wrap) return;
    var iframe = wrap.querySelector('#youtube_frame');
    if (!iframe) return;
    var url = wrap.getAttribute('data-youtube-url') || '';
    var id = ishNewsYoutubeId(url);
    if (id && id !== 'error') {
      iframe.setAttribute('src', 'https://www.youtube.com/embed/' + id + '?rel=0&autoplay=1&cc_load_policy=1');
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    ishNewsInitYoutubeIframe(document.getElementById('js-video-main'));
  });

  function videoPagePath(pathname) {
    var m = pathname.match(/^\/videos\/([^/]+)\/([^/]+)\/?$/);
    return m ? { category: m[1], slug: m[2] } : null;
  }

  function loadVideoFragment(pathname, pushState) {
    var url = pathname + (pathname.indexOf('?') === -1 ? '?' : '&') + 'fragment=1';
    return fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Video-Fragment': '1'
      },
      credentials: 'same-origin'
    }).then(function (r) {
      if (!r.ok) throw new Error('load failed');
      return r.json();
    }).then(function (data) {
      var main = document.getElementById('js-video-main');
      if (!main || !data.html_main) return;
      main.innerHTML = data.html_main;
      var side = document.getElementById('js-video-sidebar');
      if (side && data.html_sidebar) {
        side.innerHTML = data.html_sidebar;
      }
      if (data.title) document.title = data.title;
      ishNewsInitYoutubeIframe(main);
      if (pushState) {
        try { history.pushState({ videoSpa: true }, '', pathname); } catch (e) {}
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0) return;
    var u;
    try { u = new URL(a.href, window.location.origin); } catch (err) { return; }
    if (u.origin !== window.location.origin) return;
    var vp = videoPagePath(u.pathname);
    if (!vp) return;
    if (u.pathname === window.location.pathname) return;
    e.preventDefault();
    loadVideoFragment(u.pathname, true).catch(function () {
      window.location.href = a.href;
    });
  });

  window.addEventListener('popstate', function () {
    var vp = videoPagePath(window.location.pathname);
    if (!vp) return;
    loadVideoFragment(window.location.pathname, false).catch(function () {
      window.location.reload();
    });
  });
})();
</script>
</body>
</html>
