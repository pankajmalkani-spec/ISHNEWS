<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta http-equiv="Cache-control" content="public">
  <title>Search | ISH News</title>
  @include('frontend.inc_htmlhead')
</head>
<body class="ish-theme ish-theme-{{ $frontendTheme ?? 'legacy' }}">
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @include('frontend.inc_navbar')
  </header>

  <section id="content-section">
    <div class="container">
      <div class="row">
        <div class="col-lg-9">
          <div class="search-results-box">
            <div class="search-results-banner">
              <h1>Search results for <span>'{{ $keyword }}'</span></h1>
              <h3>Found <b style="color:#f88c00;">{{ count($results ?? []) }}</b> results for your search..</h3>
            </div>
            <div class="search-box">
              <form name="frmSearch" id="frmSearch" role="search" class="search-form" method="get" action="{{ url('/search') }}">
                <input id="sKeyword" name="sKeyword" class="form-control mr-sm-2" type="search" placeholder="Search here" aria-label="Search" value="{{ $keyword }}">
                <button id="search" name="search" class="btn btn-primary my-2 my-sm-0" type="submit"><i class="fa fa-search"></i></button>
              </form>
            </div>
          </div>

          <div class="posts-block articles-box">
            @forelse($results ?? [] as $video)
              <div class="news-post article-post">
                <div class="row">
                  <div class="col-sm-4">
                    <div class="post-image">
                      <a href="{{ url('/videos/'.($video->categorycode ?? '').'/'.($video->permalink ?? '')) }}">
                        <img src="{{ \App\Support\FrontendMedia::coverImageUrl($video->cover_img ?? null) }}" alt="{{ $video->title ?? '' }}" loading="lazy">
                      </a>
                      <a href="{{ url('/category/'.($video->categorycode ?? '').'/'.($video->subcategorycode ?? '')) }}" class="category category-{{ $video->categorycode ?? '' }}">{{ $video->subcategoryname ?? '' }}</a>
                    </div>
                  </div>
                  <div class="col-sm-8">
                    <h2><a href="{{ url('/videos/'.($video->categorycode ?? '').'/'.($video->permalink ?? '')) }}">{{ $video->title ?? '' }}</a></h2>
                    <ul class="post-tags">
                      <li><i class="fa fa-calendar"></i><a href="#">@if(! empty($video->schedule_date)){{ \Illuminate\Support\Carbon::parse($video->schedule_date)->format('M j, Y') }}@endif</a></li>
                      <li><i class="fa fa-newspaper-o"></i><a href="#">{{ $video->newsourcename ?? '' }}</a></li>
                    </ul>
                    <p>{{ \Illuminate\Support\Str::limit(strip_tags((string) ($video->description ?? '')), 400) }}</p>
                    @php
                      $myTags = array_filter(array_map('trim', explode(',', (string) ($video->seo_keyword ?? ''))));
                    @endphp
                    @if(count($myTags) > 0)
                      <ul class="tags-list">
                        @foreach($myTags as $tag)
                          @if($tag !== '')
                            <li><a href="{{ url('/search?sKeyword='.urlencode($tag)) }}">{{ $tag }}</a></li>
                          @endif
                        @endforeach
                      </ul>
                    @endif
                  </div>
                </div>
              </div>
            @empty
              <div class="alert-warning">
                <h3 class="entry-title">
                  <p style="text-align:center; margin-top:50px;">No Data Found</p>
                </h3>
              </div>
            @endforelse
          </div>
        </div>
        <div class="col-lg-3 sidebar-sticky">
          <div class="sidebar theiaStickySidebar">
            @include('frontend.sidebar_sm')
          </div>
        </div>
      </div>
    </div>
  </section>

  @include('frontend.inc_carousel_slider')
  @include('frontend.inc_footerbottom')
</div>
@include('frontend.inc_footerscript')
<script>
$(document).ready(function () {
  $('#frmSearch').validate({
    rules: { sKeyword: { required: true } },
    messages: { sKeyword: 'Please enter the text to search.' },
    submitHandler: function (form) { form.submit(); }
  });
});
</script>
</body>
</html>
