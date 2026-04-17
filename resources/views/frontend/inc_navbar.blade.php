<?php $Base_url = url('/').'/'; ?>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container">
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <form name="frmMobSearch" id="frmMobSearch" role="search" method="get" class="form-mobile my-2 my-lg-0" action="{{ url('/search') }}">
      <input id="sKeywordMob" name="sKeyword" class="form-control mr-sm-2" type="search" placeholder="Search for..." aria-label="Search">
      <button class="btn btn-primary my-2 my-sm-0" type="submit"><i class="fa fa-search"></i></button>
    </form>
    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <ul class="navbar-nav mr-auto">
        <li class="nav-item active"><a class="nav-link" href="{{ url('/') }}">Home</a></li>
        @foreach(($menu ?? []) as $cat)
          <li class="nav-item">
            <a class="nav-link {{ $cat['code'] ?? '' }}" href="{{ url('/category/'.($cat['code'] ?? '')) }}">
              {{ $cat['title'] ?? '' }} <i class="fa fa-angle-down" aria-hidden="true"></i>
            </a>
            <div class="mega-posts-menu">
              <div class="posts-line">
                @if(!empty($cat['subcategories']))
                  <ul class="filter-list">
                    <li><a class="{{ $cat['code'] ?? '' }}" href="{{ url('/category/'.($cat['code'] ?? '')) }}">All</a></li>
                    @foreach($cat['subcategories'] as $sub)
                      <li><a class="{{ $cat['code'] ?? '' }}" href="{{ url('/category/'.($cat['code'] ?? '').'/'.($sub->code ?? '')) }}">{{ $sub->name ?? '' }}</a></li>
                    @endforeach
                  </ul>
                @endif
                @if(!empty($cat['latest']))
                  <div class="row">
                    @foreach(collect($cat['latest'])->take(4) as $item)
                      <div class="col-lg-3 col-md-6">
                        <div class="news-post standart-post">
                          <div class="post-image">
                            <a href="{{ url('/videos/'.($item->categorycode ?? '').'/'.($item->permalink ?? '')) }}">
                              <img src="{{ url('/images/NewsContents/coverImages/'.($item->cover_img ?: 'no_img.png')) }}" alt="{{ $item->content_title ?? '' }}">
                            </a>
                            <a href="{{ url('/category/'.($item->categorycode ?? '').'/'.($item->subcatcode ?? '')) }}" class="category category-{{ $item->categorycode ?? '' }}">
                              {{ $item->subcatname ?? '' }}
                            </a>
                          </div>
                          <h2><a href="{{ url('/videos/'.($item->categorycode ?? '').'/'.($item->permalink ?? '')) }}">{{ $item->content_title ?? '' }}</a></h2>
                        </div>
                      </div>
                    @endforeach
                  </div>
                @endif
              </div>
            </div>
          </li>
        @endforeach
      </ul>
      <form name="frmNavSearch" id="frmNavSearch" role="search" method="get" class="form-inline my-2 my-lg-0" action="{{ url('/search') }}">
        <input id="sKeyword" name="sKeyword" class="form-control mr-sm-2" type="search" placeholder="Search for..." aria-label="Search">
        <button class="btn btn-primary my-2 my-sm-0" type="submit"><i class="fa fa-search"></i></button>
      </form>
    </div>
  </div>
</nav>
<div class="clearfix"></div>
<script>
$(document).ready(function () {
    $('#frmNavSearch, #frmMobSearch').validate({
      rules: { sKeyword: { required: true } },
      messages: { sKeyword: 'Please enter the text to search.' },
      submitHandler: function (form) { form.submit(); }
    });
});
</script>
