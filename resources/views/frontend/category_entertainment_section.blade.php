{{--
  CategorySet1[2] (sort 2): legacy “First-Posts-block” — large standart post + 2×2 thumb grid (right).
--}}
@php
    $list = collect($TCatData['news_list'] ?? [])->values()->all();
    $first = $list[0] ?? null;
    $thumbs = array_slice($list, 1);
@endphp
@if($first)
  <div class="posts-block posts-block--sort-2">
    <div class="title-section">
      <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
    </div>
    <div class="row posts-block--sort-2__row">
      @if(count($thumbs) === 0)
        <div class="col-md-12">
          <div class="news-post standart-post">
            <div class="post-image">
              <a href="{{ url('/videos/'.($first->categorycode ?? '').'/'.($first->permalink ?? '')) }}">
                <img src="{{ \App\Support\FrontendMedia::coverImageUrl($first->cover_img ?? null) }}" alt="{{ $first->title ?? '' }}" loading="lazy">
              </a>
              <a href="{{ url('/category/'.($first->categorycode ?? '').'/'.($first->subcategorycode ?? '')) }}" class="category category-{{ $first->categorycode ?? '' }}">{{ $first->subcategoryname ?? '' }}</a>
            </div>
            <h2><a href="{{ url('/videos/'.($first->categorycode ?? '').'/'.($first->permalink ?? '')) }}">{{ $first->title ?? '' }}</a></h2>
            @if(! empty(trim(strip_tags((string) ($first->description ?? '')))))
              <p>{{ \Illuminate\Support\Str::limit(strip_tags((string) $first->description), 400) }}</p>
            @endif
          </div>
        </div>
      @else
        <div class="col-md-6">
          <div class="news-post standart-post">
            <div class="post-image">
              <a href="{{ url('/videos/'.($first->categorycode ?? '').'/'.($first->permalink ?? '')) }}">
                <img src="{{ \App\Support\FrontendMedia::coverImageUrl($first->cover_img ?? null) }}" alt="{{ $first->title ?? '' }}" loading="lazy">
              </a>
              <a href="{{ url('/category/'.($first->categorycode ?? '').'/'.($first->subcategorycode ?? '')) }}" class="category category-{{ $first->categorycode ?? '' }}">{{ $first->subcategoryname ?? '' }}</a>
            </div>
            <h2><a href="{{ url('/videos/'.($first->categorycode ?? '').'/'.($first->permalink ?? '')) }}">{{ $first->title ?? '' }}</a></h2>
            @if(! empty(trim(strip_tags((string) ($first->description ?? '')))))
              <p>{{ \Illuminate\Support\Str::limit(strip_tags((string) $first->description), 400) }}</p>
            @endif
          </div>
        </div>
        <div class="col-md-6">
          <div class="row posts-block--sort-2__thumbs">
            @foreach($thumbs as $slider)
              <div class="col-6">
                <div class="news-post thumb-post">
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
    </div>
  </div>
@endif
