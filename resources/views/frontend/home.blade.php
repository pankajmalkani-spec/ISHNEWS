<!DOCTYPE html>
<html lang="en" class="no-js">
@php
  $isModern = ($frontendTheme ?? 'legacy') === 'modern';
@endphp
<head>
  <meta http-equiv="Cache-control" content="public">
  <meta name="description" content="Daily News, Inspirational, Entertaining, Humorous and Role-Playing stories in Sign Language ISL with Subtitles and Voice Over for the Deaf.">
  <meta name="keywords" content="News, Deaf, Sign Language, Entertainment, Humour, Moral Stories, Jokes, Daily">
  <title>Information Beyond Words | ISH News</title>
  @include('frontend.inc_htmlhead')
</head>
<body @class([
  'ish-theme',
  'ish-theme-'.($frontendTheme ?? 'legacy'),
  'ish-home-modern' => $isModern,
])>
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @if($isModern)
      @include('frontend.inc_navbar_modern')
    @else
      @include('frontend.inc_navbar')
    @endif
  </header>

  @if($isModern)
    <main id="content" class="ish-home-modern-main">
      @include('frontend.home_modern')
    </main>
    @include('frontend.inc_carousel_slider')
  @else
  <div id="content">
    @include('frontend.banner')
    <div class="ish-main-column">
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
      </div>

      <div class="desktop-view">
        <div class="container">
          @include('frontend.breaking_news_section')
          <section id="content-section">
            <div class="row">
              <div class="col-lg-9">
                @foreach([2, 3, 4, 5] as $slot)
                  @php
                    $TCatData = ($CategorySet1 ?? [])[$slot] ?? null;
                  @endphp
                  @if(
                      ! $TCatData
                      || empty($TCatData['news_list'])
                      || count($TCatData['news_list']) === 0
                  )
                    @continue
                  @endif
                  @if($slot === 2)
                    @include('frontend.category_entertainment_section', ['TCatData' => $TCatData])
                  @elseif($slot === 3)
                    @include('frontend.category_sort3_two_column', ['TCatData' => $TCatData])
                  @elseif($slot === 4)
                    @include('frontend.category_carousel_section', ['TCatData' => $TCatData])
                  @else
                    @include('frontend.category_sort5_big_sidebar', ['TCatData' => $TCatData])
                  @endif
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
  </div>
  @endif

  @include('frontend.inc_footerbottom')
</div>
@include('frontend.inc_footerscript')
<script>
(function () {
  var isModernHome = @json($isModern);
  $(document).ready(function () {
    var opts = {
      rules: { sKeyword: { required: true } },
      messages: { sKeyword: 'Please enter the text to search.' },
      submitHandler: function (form) { form.submit(); }
    };
    if (isModernHome) {
      $('#frmSearchModern').validate(opts);
    } else {
      $('#frmSearch').validate(opts);
    }
  });
})();
</script>
</body>
</html>
