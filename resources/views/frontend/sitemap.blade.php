<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <title>Sitemap | ISH News</title>
  @include('frontend.inc_htmlhead')
  <style>
    ul.small-posts { margin-top: 16px; margin-bottom: 40px; }
    ul.small-posts > li > a { width: 10px; }
  </style>
</head>
<body>
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @include('frontend.inc_navbar')
  </header>

  <section id="content-section">
    <div class="container">
      <div class="row">
        <div class="col-lg-12">
          <div class="row">
            @foreach($sitemapCategories ?? [] as $cat)
              <div class="col-lg-3 col-md-4 col-xl-2">
                <div class="title-section">
                  <h1 class="{{ $cat->code ?? '' }}">{{ $cat->title ?? '' }}</h1>
                </div>
                @if(($cat->subcategories ?? null) && $cat->subcategories->count() > 0)
                  <ul class="small-posts">
                    @foreach($cat->subcategories as $sub)
                      <li>
                        <a href="{{ url('/category/'.($cat->code ?? '').'/'.($sub->code ?? '')) }}" class="color-{{ $cat->code ?? '' }}"><i class="fa fa-arrow-circle-right"></i></a>
                        <h2><a href="{{ url('/category/'.($cat->code ?? '').'/'.($sub->code ?? '')) }}">{{ $sub->name ?? '' }}</a></h2>
                      </li>
                    @endforeach
                  </ul>
                @endif
              </div>
            @endforeach
          </div>
          <div class="row">
            <div class="col-lg-4 col-md-6 col-xl-2">
              <div class="title-section">
                <h1>Other Navigation</h1>
              </div>
              <ul class="small-posts">
                <li><a href="{{ url('/about') }}"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="{{ url('/about') }}">About</a></h2>
                </li>
                <li><a href="{{ url('/contact') }}"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="{{ url('/contact') }}">Work With Us</a></h2>
                </li>
                <li><a href="{{ url('/contact') }}"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="{{ url('/contact') }}">Contact</a></h2>
                </li>
                <li><a href="{{ url('/sitemap') }}"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="{{ url('/sitemap') }}">Sitemap</a></h2>
                </li>
                <li><a href="https://indiasigninghands.com/shop" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://indiasigninghands.com/shop" target="_blank" rel="noopener noreferrer">Shop @ ISH</a></h2>
                </li>
              </ul>
            </div>
            <div class="col-lg-4 col-md-6 col-xl-2">
              <div class="title-section">
                <h1>Social Media</h1>
              </div>
              <ul class="small-posts">
                <li><a href="https://www.youtube.com/ishnews" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://www.youtube.com/ishnews" target="_blank" rel="noopener noreferrer">YouTube</a></h2>
                </li>
                <li><a href="https://www.facebook.com/ISHNews/" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://www.facebook.com/ISHNews/" target="_blank" rel="noopener noreferrer">Facebook</a></h2>
                </li>
                <li><a href="https://www.instagram.com/ishnews/" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://www.instagram.com/ishnews/" target="_blank" rel="noopener noreferrer">Instagram</a></h2>
                </li>
                <li><a href="https://twitter.com/ishnews_tv" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://twitter.com/ishnews_tv" target="_blank" rel="noopener noreferrer">Twitter</a></h2>
                </li>
              </ul>
            </div>
            <div class="col-lg-4 col-md-6 col-xl-2">
              <div class="title-section">
                <h1>External Links</h1>
              </div>
              <ul class="small-posts">
                <li><a href="https://indiasigninghands.com/" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://indiasigninghands.com/" target="_blank" rel="noopener noreferrer">India Signing Hands</a></h2>
                </li>
                <li><a href="https://ishshiksha.com/" target="_blank" rel="noopener noreferrer"><i class="fa fa-arrow-circle-right"></i></a>
                  <h2><a href="https://ishshiksha.com/" target="_blank" rel="noopener noreferrer">ISH Shiksha</a></h2>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  @include('frontend.inc_carousel_slider')
  @include('frontend.inc_footerbottom')
</div>
@include('frontend.inc_footerscript')
</body>
</html>
