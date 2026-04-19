{{--
  Entertainment: uniform 2×2 grid — equal image boxes (fixed aspect ratio + object-fit),
  matching the live layout where all four thumbnails share the same size.
--}}
@php
    $newsList = $TCatData['news_list'] ?? [];
@endphp
@if(count($newsList) > 0)
  <div class="posts-block posts-block--entertainment">
    <div class="title-section">
      <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
    </div>
    <div class="row entertainment-grid-row">
      @foreach($newsList as $slider)
        <div class="col-6 entertainment-grid-col">
          <div class="news-post entertainment-tile">
            <div class="post-image entertainment-tile__image">
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
