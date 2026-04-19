@if(!empty($banner) && count($banner) > 0)
<?php $main = 2; ?>
<div id="ish-featured" class="wide-news-heading">
  <div class="item main-news">
    <div class="flexslider">
      <ul class="slides">
        @for($i = 0; $i <= min($main-1, count($banner)-1); $i++)
          <li>
            <div class="news-post large-image-post">
              <img src="{{ \App\Support\FrontendMedia::coverImageUrl($banner[$i]->cover_img ?? null) }}" alt="{{ $banner[$i]->title ?? '' }}">
              <div class="hover-box">
                <a href="{{ url('/category/'.($banner[$i]->categorycode ?? '').'/'.($banner[$i]->subcategorycode ?? '')) }}" class="category category-{{ $banner[$i]->categorycode ?? '' }}">{{ $banner[$i]->categoryname ?? '' }}</a>
                <h2><a href="{{ url('/videos/'.($banner[$i]->categorycode ?? '').'/'.($banner[$i]->permalink ?? '')) }}">{{ $banner[$i]->title ?? '' }}</a></h2>
              </div>
            </div>
          </li>
        @endfor
      </ul>
    </div>
  </div>
  @for($i = $main; $i <= count($banner)-1; $i++)
    <div class="item">
      <div class="news-post image-post">
        <a href="{{ url('/videos/'.($banner[$i]->categorycode ?? '').'/'.($banner[$i]->permalink ?? '')) }}">
          <img src="{{ \App\Support\FrontendMedia::coverImageUrl($banner[$i]->cover_img ?? null) }}" alt="{{ $banner[$i]->title ?? '' }}">
        </a>
        <div class="hover-box">
          <a href="{{ url('/category/'.($banner[$i]->categorycode ?? '').'/'.($banner[$i]->subcategorycode ?? '')) }}" class="category category-{{ $banner[$i]->categorycode ?? '' }}">{{ $banner[$i]->categoryname ?? '' }}</a>
        </div>
      </div>
    </div>
  @endfor
</div>
@endif
