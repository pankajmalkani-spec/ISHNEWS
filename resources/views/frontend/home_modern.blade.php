{{-- Modern home: dark shell; same data as legacy --}}
@php
  $bn = isset($CategorySet1[1]) ? $CategorySet1[1] : null;
  $modernBadgeStyle = static function ($item): string {
      $color = trim((string) (($item->subcategorycolor ?? null) ?: ($item->categorycolor ?? null) ?: '#232323'));
      if (! preg_match('/^#(?:[0-9a-fA-F]{3}){1,2}$/', $color)) {
          $color = '#232323';
      }

      $hex = ltrim($color, '#');
      if (strlen($hex) === 3) {
          $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
      }

      $brightness = ((hexdec(substr($hex, 0, 2)) * 299) + (hexdec(substr($hex, 2, 2)) * 587) + (hexdec(substr($hex, 4, 2)) * 114)) / 1000;
      $textColor = $brightness > 170 ? '#111111' : '#ffffff';

      return 'background-color: '.$color.' !important; color: '.$textColor.' !important;';
  };
@endphp

@if(!empty($banner) && count($banner) > 0)
  @php
    $hero = $banner[0];
    $heroImageUrl = \App\Support\FrontendMedia::coverImageUrl($hero->cover_img ?? null);
    $heroMissingImage = \Illuminate\Support\Str::endsWith(parse_url($heroImageUrl, PHP_URL_PATH) ?: '', '/no_img.png');
  @endphp
  <section class="ish-hm-hero{{ $heroMissingImage ? ' ish-hm-hero--missing-image' : '' }}">
    <div class="ish-hm-hero__media">
      <img src="{{ $heroImageUrl }}" alt="" loading="eager">
      @if($heroMissingImage)
        <div class="ish-hm-hero__missing-label" aria-hidden="true">
          <span>240 × 160</span>
          <strong>No image available</strong>
        </div>
      @endif
      <div class="ish-hm-hero__gradient" aria-hidden="true"></div>
    </div>
    <div class="container ish-hm-hero__content">
      <a class="ish-hm-hero__cat" style="{{ $modernBadgeStyle($hero) }}" href="{{ url('/category/'.($hero->categorycode ?? '').'/'.($hero->subcategorycode ?? '')) }}">{{ $hero->subcategoryname ?? $hero->categoryname ?? '' }}</a>
      <h1 class="ish-hm-hero__title">
        <a href="{{ url('/videos/'.($hero->categorycode ?? '').'/'.($hero->permalink ?? '')) }}">{{ $hero->title ?? '' }}</a>
      </h1>
      @if(!empty($hero->schedule_date))
        <p class="ish-hm-hero__meta">{{ \Illuminate\Support\Carbon::parse($hero->schedule_date)->format('M j, Y') }}</p>
      @endif
    </div>
  </section>

  @if(count($banner) > 1)
    <section class="ish-hm-strip" aria-label="Featured">
      <div class="container-fluid">
        <div class="ish-hm-strip__track">
          @foreach($banner as $idx => $b)
            @if($idx === 0) @continue @endif
            <a class="ish-hm-strip__cell" href="{{ url('/videos/'.($b->categorycode ?? '').'/'.($b->permalink ?? '')) }}">
              <img src="{{ \App\Support\FrontendMedia::coverImageUrl($b->cover_img ?? null) }}" alt="" loading="lazy">
              <span class="ish-hm-strip__cap">{{ \Illuminate\Support\Str::limit($b->title ?? '', 64) }}</span>
            </a>
          @endforeach
        </div>
      </div>
    </section>
  @endif
@endif

<section class="ish-hm-search">
  <div class="container">
    <form name="frmSearchModern" id="frmSearchModern" class="ish-hm-search__form" role="search" method="get" action="{{ url('/search') }}">
      <input id="sKeywordHomeModern" name="sKeyword" type="search" placeholder="Search stories…" aria-label="Search">
      <button type="submit"><i class="fa fa-search"></i></button>
    </form>
  </div>
</section>

@if($bn && ! empty($bn['news_list']) && count($bn['news_list']) > 0)
  <section class="ish-hm-row" aria-label="{{ $bn['title'] ?? 'Top stories' }}">
    <div class="container-fluid">
      <div class="ish-hm-row__head">
        <h2 class="ish-hm-row__title">{{ $bn['title'] ?? 'Top stories' }}</h2>
        <a class="ish-hm-row__more" href="{{ url('/category/'.($bn['code'] ?? '')) }}">View all</a>
      </div>
      <div class="ish-hm-row__track">
        @foreach($bn['news_list'] as $slider)
          <article class="ish-hm-row-card">
            <a class="ish-hm-row-card__media" href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
              <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="" loading="lazy">
              <span class="ish-hm-row-card__overlay" aria-hidden="true"></span>
              <span class="ish-hm-row-card__cat" style="{{ $modernBadgeStyle($slider) }}">{{ $slider->subcategoryname ?? '' }}</span>
            </a>
            <div class="ish-hm-row-card__body">
              <h3 class="ish-hm-row-card__title"><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h3>
            </div>
          </article>
        @endforeach
      </div>
    </div>
  </section>
@endif

@foreach([2, 3, 4, 5] as $slot)
  @php $TCatData = ($CategorySet1 ?? [])[$slot] ?? null; @endphp
  @if(!$TCatData || empty($TCatData['news_list']) || count($TCatData['news_list']) === 0)
    @continue
  @endif
  <section class="ish-hm-row" aria-label="{{ $TCatData['title'] ?? 'Category' }}">
    <div class="container-fluid">
      <div class="ish-hm-row__head">
        <h2 class="ish-hm-row__title">{{ $TCatData['title'] ?? '' }}</h2>
        <a class="ish-hm-row__more" href="{{ url('/category/'.($TCatData['code'] ?? '')) }}">View all</a>
      </div>
      <div class="ish-hm-row__track">
        @foreach($TCatData['news_list'] as $item)
          <article class="ish-hm-row-card">
            <a class="ish-hm-row-card__media" href="{{ url('/videos/'.($item->categorycode ?? '').'/'.($item->permalink ?? '')) }}">
              <img src="{{ \App\Support\FrontendMedia::coverImageUrl($item->cover_img ?? null) }}" alt="" loading="lazy">
              <span class="ish-hm-row-card__overlay" aria-hidden="true"></span>
              <span class="ish-hm-row-card__cat" style="{{ $modernBadgeStyle($item) }}">{{ $item->subcategoryname ?? '' }}</span>
            </a>
            <div class="ish-hm-row-card__body">
              <h3 class="ish-hm-row-card__title"><a href="{{ url('/videos/'.($item->categorycode ?? '').'/'.($item->permalink ?? '')) }}">{{ $item->title ?? '' }}</a></h3>
            </div>
          </article>
        @endforeach
      </div>
    </div>
  </section>
@endforeach

<section class="ish-hm-aside-wrap ish-hm-aside-wrap--modern-hidden">
  <div class="container">
    <div class="row">
      <div class="col-lg-12">
        <div class="ish-hm-sidebar">
          @include('frontend.sidebar_shop')
          @include('frontend.sidebar_ads')
          @include('frontend.sidebar_sm')
        </div>
      </div>
    </div>
  </div>
</section>
