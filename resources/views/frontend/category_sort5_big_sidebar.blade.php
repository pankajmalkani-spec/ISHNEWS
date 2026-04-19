{{-- Legacy CategorySet1[5]: featured (col-md-6) + stacked list (ul.small-posts). --}}
@php
    $list = collect($TCatData['news_list'] ?? [])->values()->all();
    $first = $list[0] ?? null;
    $rest = array_slice($list, 1);
@endphp
@if($first)
  <div class="posts-block posts-block--sort-5">
    <div class="title-section">
      <h1 class="{{ $TCatData['code'] ?? '' }}">{{ $TCatData['title'] ?? '' }}<a href="{{ url('/category/'.($TCatData['code'] ?? '')) }}" class="btn-more category category-{{ $TCatData['code'] ?? '' }}">More</a></h1>
    </div>
    <div class="row">
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
      @if(count($rest) > 0)
        <div class="col-md-6">
          <ul class="small-posts">
            @foreach($rest as $slider)
              <li>
                <a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
                  <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="{{ $slider->title ?? '' }}" loading="lazy">
                </a>
                <div class="post-cont">
                  <h2><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h2>
                </div>
              </li>
            @endforeach
          </ul>
        </div>
      @endif
    </div>
  </div>
@endif
