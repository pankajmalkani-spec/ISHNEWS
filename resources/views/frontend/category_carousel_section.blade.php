{{--
  Legacy `home.php` "Third-Posts-block (H-Scrolling)": CategorySet1[4] — horizontal Owl carousel (e.g. Awareness).
--}}
@php
    $newsList = $TCatData['news_list'] ?? [];
@endphp
@if(count($newsList) > 0)
  <div class="posts-block posts-block--horizontal-scroll">
    <div class="title-section">
      <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
    </div>
    <div class="featured-box owl-wrapper">
      <div class="owl-carousel owl-theme" data-num="3">
        @foreach($newsList as $slider)
          <div class="item">
            <div class="news-post standart-post">
              <div class="post-image">
                <a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
                  <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="{{ $slider->title ?? '' }}">
                </a>
                <a href="{{ url('/category/'.($slider->categorycode ?? '').'/'.($slider->subcategorycode ?? '')) }}" class="category category-{{ $slider->categorycode ?? '' }}">{{ $slider->subcategoryname ?? '' }}</a>
              </div>
              <h2><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h2>
              <ul class="post-tags">
                <li>
                  <i class="fa fa-calendar"></i>
                  <a href="#">
                    @if(! empty($slider->schedule_date))
                      @php
                          try {
                              $carouselSchedule = \Illuminate\Support\Carbon::parse($slider->schedule_date)->format('M j, Y');
                          } catch (\Throwable) {
                              $carouselSchedule = '';
                          }
                      @endphp
                      {{ $carouselSchedule }}
                    @endif
                  </a>
                </li>
                <li>
                  <i class="fa fa-newspaper-o"></i>
                  <a href="#">{{ $slider->newsourcename ?? '' }}</a>
                </li>
              </ul>
            </div>
          </div>
        @endforeach
      </div>
    </div>
  </div>
@endif
