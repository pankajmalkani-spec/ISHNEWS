{{--
  CategorySet1[2] (sort 2): legacy “First-Posts-block” — large standart post + 2×2 thumb grid (right).
--}}
@php
    $list = collect($TCatData['news_list'] ?? [])->values()->all();
@endphp
@if(count($list) > 0)
  <div class="posts-block posts-block--sort-2">
    <div class="title-section">
      <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
    </div>
    <div class="row posts-block--sort-2__row">
      @foreach($list as $slider)
        <div class="col-md-4 col-sm-6">
          <div class="news-post standart-post">
            <div class="post-image">
              <a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
                <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="{{ $slider->title ?? '' }}" loading="lazy">
              </a>
              @if(! empty($slider->subcategoryname ?? ''))
                <a href="{{ url('/category/'.($slider->categorycode ?? '').'/'.($slider->subcategorycode ?? '')) }}" class="category category-{{ $slider->categorycode ?? '' }}">{{ $slider->subcategoryname ?? '' }}</a>
              @endif
            </div>
            <h2><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h2>
          </div>
        </div>
      @endforeach
    </div>
  </div>
@endif
