{{-- Legacy CategorySet1[3]: two-column grid (col-sm-6 × N). --}}
@php
    $newsList = $TCatData['news_list'] ?? [];
@endphp
@if(count($newsList) > 0)
  <div class="posts-block posts-block--sort-3">
    <div class="title-section">
      <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
    </div>
    <div class="row">
      @foreach($newsList as $slider)
        <div class="col-sm-6">
          <div class="news-post standart-post">
            <div class="post-image">
              <a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
                <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="{{ $slider->title ?? '' }}" loading="lazy">
              </a>
              <a href="{{ url('/category/'.($slider->categorycode ?? '').'/'.($slider->subcategorycode ?? '')) }}" class="category category-{{ $slider->categorycode ?? '' }}">{{ $slider->subcategoryname ?? '' }}</a>
            </div>
            <h2><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h2>
          </div>
        </div>
      @endforeach
    </div>
  </div>
@endif
