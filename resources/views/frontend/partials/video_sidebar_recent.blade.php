<div class="sidebar theiaStickySidebar">
  <div class="title-section sidebar-title">
    <h1>Recent News</h1>
  </div>
  <div class="row">
    @foreach($recentNews as $recent)
      <div class="col-lg-12 col-md-6">
        <div class="news-post standart-post">
          <div class="post-image">
            <a href="{{ url('/videos/'.($recent->categorycode ?? '').'/'.($recent->permalink ?? '')) }}">
              <img src="{{ \App\Support\FrontendMedia::coverImageUrl($recent->cover_img ?? null) }}" alt="{{ $recent->title ?? '' }}" loading="lazy">
            </a>
            <a href="{{ url('/category/'.($recent->categorycode ?? '').'/'.($recent->subcategorycode ?? '')) }}" class="category category-{{ $recent->categorycode ?? '' }}">{{ $recent->subcategoryname ?? '' }}</a>
          </div>
          <h2><a href="{{ url('/videos/'.($recent->categorycode ?? '').'/'.($recent->permalink ?? '')) }}">{{ $recent->title ?? '' }}</a></h2>
        </div>
      </div>
    @endforeach
  </div>
</div>
