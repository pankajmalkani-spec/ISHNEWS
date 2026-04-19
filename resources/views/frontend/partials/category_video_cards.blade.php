@foreach($videos as $video)
  <div class="col-lg-3 col-md-4">
    <div class="news-post standart-post">
      <div class="post-image">
        <a href="{{ url('/videos/'.($video->categorycode ?? '').'/'.($video->permalink ?? '')) }}">
          <img src="{{ \App\Support\FrontendMedia::coverImageUrl($video->cover_img ?? null) }}" alt="{{ $video->title ?? '' }}" loading="lazy">
        </a>
        <a href="{{ url('/category/'.($video->categorycode ?? '').'/'.($video->subcategorycode ?? '')) }}" class="category category-{{ $video->categorycode ?? '' }}">{{ $video->subcategoryname ?? '' }}</a>
      </div>
      <h2><a href="{{ url('/videos/'.($video->categorycode ?? '').'/'.($video->permalink ?? '')) }}">{{ $video->title ?? '' }}</a></h2>
      <ul class="post-tags">
        <li><i class="fa fa-calendar"></i><a href="#">@if(! empty($video->schedule_date)){{ \Illuminate\Support\Carbon::parse($video->schedule_date)->format('M j, Y') }}@endif</a></li>
        <li><i class="fa fa-newspaper-o"></i><a href="#">{{ $video->newsourcename ?? '' }}</a></li>
      </ul>
      <p>{{ \Illuminate\Support\Str::limit(strip_tags((string) ($video->description ?? '')), 220) }}</p>
    </div>
  </div>
@endforeach
