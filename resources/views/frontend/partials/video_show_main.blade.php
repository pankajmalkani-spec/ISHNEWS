@php
  $ytCheck = (int) ($news->youtube_url_check ?? 0) === 1;
  $videoFile = trim((string) ($news->youtube_video ?? ''));
  $videoFileSafe = $videoFile !== '' ? basename(str_replace('\\', '/', $videoFile)) : '';
  $videoSrc = $videoFileSafe !== '' ? url('videos/'.$videoFileSafe) : trim((string) ($news->youtube_url ?? ''));
  $subsFile = trim((string) ($news->youtube_subtitles ?? ''));
  $subsSrc = $subsFile !== '' ? url('videos/'.basename(str_replace('\\', '/', $subsFile))) : '';
  $smUrl = url('/videos/'.($news->categorycode ?? '').'/'.($news->permalink ?? ''));
@endphp
<div class="single-post">
  <h1>{{ $news->title ?? '' }}</h1>
  <div id="ish-news-video-root" class="format-post-video" data-youtube-url="{{ e($news->youtube_url ?? '') }}">
    <div class="embed-responsive embed-responsive-16by9">
      @if($ytCheck)
        <iframe id="youtube_frame" title="{{ $news->title ?? 'Video' }}" width="100%" height="100%" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      @else
        <video controls preload="metadata" width="100%" height="550" playsinline>
          @if($videoSrc !== '')
            <source src="{{ $videoSrc }}" type="video/mp4">
          @endif
          @if($subsSrc !== '')
            <track src="{{ $subsSrc }}" kind="subtitles" srclang="en" label="English" default>
          @endif
          <p>It appears that your browser doesn't support HTML5 video.@if($videoSrc !== '') Here's the <a href="{{ $videoSrc }}">video file</a>.@endif</p>
        </video>
      @endif
    </div>
  </div>
  <div class="share-post-box">
    <ul class="post-tags">
      <li><i class="fa fa-calendar"></i><a href="#">@if(! empty($news->schedule_date)){{ \Illuminate\Support\Carbon::parse($news->schedule_date)->format('M j, Y') }}@endif</a></li>
      <li><i class="fa fa-newspaper-o"></i><a href="#">{{ $news->newsourcename ?? '' }}</a></li>
    </ul>
    <ul class="share-box">
      <li><a class="whatsapp" href="whatsapp://send?text=Watch *{{ str_replace(['#', "'", ';'], '', (string) ($news->title ?? '')) }}* on *ISH News* at {{ $smUrl }}" data-action="share/whatsapp/share"><i class="fa fa-whatsapp"></i></a></li>
      <li><a class="facebook" href="https://www.facebook.com/sharer/sharer.php?u={{ urlencode($smUrl) }}&amp;src=sdkpreparse" target="_blank" rel="noopener noreferrer"><i class="fa fa-facebook"></i></a></li>
      <li><a class="instagram" href="https://www.instagram.com/ishnews?url={{ urlencode($smUrl) }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-instagram"></i></a></li>
      <li><a class="twitter" href="https://twitter.com/intent/tweet?hashtags=ishnews%2C&amp;url={{ urlencode($smUrl) }}&amp;text={{ urlencode((string) ($news->title ?? '')) }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-twitter"></i></a></li>
      <li><a class="linkedin" href="http://www.linkedin.com/shareArticle?mini=true&amp;url={{ urlencode($smUrl) }}&amp;title={{ urlencode((string) ($news->title ?? '')) }}" target="_blank" rel="noopener noreferrer"><i class="fa fa-linkedin"></i></a></li>
    </ul>
  </div>
  <div class="clearfix"></div>
  <blockquote class="blockquote-light">
    <p>{!! $news->description ?? '' !!}</p>
  </blockquote>
  <div class="text-boxes">
    <p>{!! $news->article_content ?? '' !!}</p>
  </div>
  <div class="text-boxes">
    <h2>Tags</h2>
    <ul class="tags-list">
      @foreach(array_filter(array_map('trim', explode(',', (string) ($news->seo_keyword ?? '')))) as $tag)
        @if($tag !== '')
          <li><a href="{{ url('/search?sKeyword='.urlencode($tag)) }}">{{ $tag }}</a></li>
        @endif
      @endforeach
    </ul>
  </div>
</div>
