<?php $Base_url = url('/').'/'; ?>
<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta http-equiv="Cache-control" content="public">
  <meta name="description" content="Daily News, Inspirational, Entertaining, Humorous and Role-Playing stories in Sign Language ISL with Subtitles and Voice Over for the Deaf.">
  <meta name="keywords" content="News, Deaf, Sign Language, Entertainment, Humour, Moral Stories, Jokes, Daily">
  <title>Information Beyond Words | ISH News</title>
  @include('frontend.inc_htmlhead')
</head>
<body>
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @include('frontend.inc_navbar')
  </header>

  <div id="content">
    @include('frontend.banner')
    <div class="container">
      <div class="row">
        <div class="col-lg-12">
          <div class="search-box">
            <form name="frmSearch" id="frmSearch" role="search" class="search-form" method="get" action="{{ url('/search') }}">
              <input id="sKeywordHome" name="sKeyword" class="form-control mr-sm-2" type="search" placeholder="Search here" aria-label="Search">
              <button class="btn btn-primary my-2 my-sm-0" type="submit"><i class="fa fa-search"></i></button>
            </form>
          </div>
        </div>
      </div>

      <div class="desktop-view">
        @include('frontend.breaking_news_section')
        <section id="content-section">
          <div class="row">
            <div class="col-lg-9">
              @foreach(($CategorySet1 ?? []) as $TCatData)
                @if((int) ($TCatData['sort'] ?? 0) === 1)
                  @continue
                @endif
                {{-- Legacy CategorySet1[4]: horizontal Owl carousel (Awareness). Also accept code `awareness` if sort was changed in DB. --}}
                @php
                  $__homeSort = (int) ($TCatData['sort'] ?? 0);
                  $__homeCode = strtolower((string) ($TCatData['code'] ?? ''));
                @endphp
                @if($__homeSort === 4 || $__homeCode === 'awareness')
                  @include('frontend.category_carousel_section', ['TCatData' => $TCatData])
                  @continue
                @endif
                {{-- Legacy CategorySet1[2]: large + 2×2 thumbs (Entertainment) --}}
                @if($__homeSort === 2 || $__homeCode === 'entertainment')
                  @include('frontend.category_entertainment_section', ['TCatData' => $TCatData])
                  @continue
                @endif
                <div class="posts-block">
                  <div class="title-section">
                    <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
                  </div>
                  <div class="row">
                    @foreach(($TCatData['news_list'] ?? []) as $idx => $slider)
                      <div class="col-md-{{ $idx === 0 ? '6' : '3' }}">
                        <div class="news-post {{ $idx === 0 ? 'standart-post' : 'thumb-post' }}">
                          <div class="post-image">
                            <a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
                              <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="{{ $slider->title ?? '' }}">
                            </a>
                            <a href="{{ url('/category/'.($slider->categorycode ?? '').'/'.($slider->subcategorycode ?? '')) }}" class="category category-{{ $slider->categorycode ?? '' }}">{{ $slider->subcategoryname ?? '' }}</a>
                          </div>
                          <h2><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h2>
                        </div>
                      </div>
                    @endforeach
                  </div>
                </div>
              @endforeach
            </div>
            <div class="col-lg-3 sidebar-sticky">
              <div class="sidebar theiaStickySidebar">
                @include('frontend.sidebar_shop')
                @include('frontend.sidebar_ads')
                @include('frontend.sidebar_sm')
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    @include('frontend.inc_carousel_slider')
  </div>

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
