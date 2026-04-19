<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta http-equiv="Cache-control" content="public">
  <meta name="description" content="{{ \Illuminate\Support\Str::limit(strip_tags($pageDescription ?? ''), 300) }}">
  <title>{{ $pageTitle ?? 'Category' }} | ISH News</title>
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
        <div class="col-lg-12">
          <div class="posts-block standard-box">
            <div class="title-section">
              <h1 class="{{ $category->code ?? '' }}">{{ $category->title ?? '' }}@if($activeSubcategoryName !== '')<span> | {{ $activeSubcategoryName }}</span>@endif</h1>
            </div>

            @if($allsubcategories->count() > 0)
              <div class="filter-buttons">
                <p>Please click one of the following sub-categories to filter.</p>
                <a href="{{ url('/category/'.($category->code ?? '')) }}" class="category category-{{ $category->code ?? '' }}{{ ($activeSubcategoryCode ?? '') === '' ? ' active' : '' }}">All</a>
                @foreach($allsubcategories as $subcat)
                  <a class="category category-{{ $category->code ?? '' }}{{ ($activeSubcategoryCode ?? '') === strtolower((string) ($subcat->code ?? '')) ? ' active' : '' }}" href="{{ url('/category/'.($category->code ?? '').'/'.($subcat->code ?? '')) }}">{{ $subcat->subcategoryname ?? '' }}</a>
                @endforeach
              </div>
            @endif

            <div class="entertain-sec">
              <div class="row" id="js-category-video-grid">
                @if($videos->count() > 0)
                  @include('frontend.partials.category_video_cards', ['videos' => $videos])
                @else
                  <div class="col-12">
                    <h3 class="entry-title text-center" style="margin-top:2rem;">No videos found in this category.</h3>
                  </div>
                @endif
              </div>

              @if(! empty($hasMore))
                <div id="category-loader" class="text-center" style="display:none; margin-top: 1.5rem;">
                  <i class="fa fa-spinner fa-spin" aria-hidden="true"></i> <span>Loading…</span>
                </div>
                <div id="category-load-sentinel" style="height:1px; margin-top: 1rem;" aria-hidden="true"></div>
              @endif
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  @include('frontend.inc_carousel_slider')
  @include('frontend.inc_footerbottom')
</div>
@include('frontend.inc_footerscript')
@if(! empty($hasMore))
<script>
(function () {
  var grid = document.getElementById('js-category-video-grid');
  var sentinel = document.getElementById('category-load-sentinel');
  var loader = document.getElementById('category-loader');
  if (!grid || !sentinel) return;

  var nextPage = {{ (int) ($nextPage ?? 2) }};
  var loading = false;
  var loadUrl = @json(route('category.load_more', ['categoryCode' => $category->code]));
  var sub = @json($activeSubcategoryCode ?? '');

  function appendHtml(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    while (wrap.firstChild) {
      grid.appendChild(wrap.firstChild);
    }
  }

  var obs = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting || loading || !nextPage) return;
    loading = true;
    if (loader) loader.style.display = 'block';

    var url = new URL(loadUrl, window.location.origin);
    url.searchParams.set('page', String(nextPage));
    if (sub) url.searchParams.set('subcategory', sub);

    fetch(url.toString(), {
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
      credentials: 'same-origin'
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.html) appendHtml(data.html);
        nextPage = data.has_more ? data.next_page : null;
        if (!data.has_more) obs.disconnect();
      })
      .catch(function () { /* stop retry storm */ obs.disconnect(); })
      .finally(function () {
        loading = false;
        if (loader) loader.style.display = 'none';
      });
  }, { rootMargin: '240px' });

  obs.observe(sentinel);
})();
</script>
@endif
</body>
</html>
