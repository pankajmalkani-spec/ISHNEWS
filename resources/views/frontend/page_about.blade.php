<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta name="description" content="About ISH News and its Mission / Vision">
  <meta name="keywords" content="videos, category, gallery, listing">
  <title>About Us | ISH News</title>
  @include('frontend.inc_htmlhead')
</head>
<body @class([
  'ish-theme',
  'ish-theme-'.($frontendTheme ?? 'legacy'),
  'ish-home-modern' => ($frontendTheme ?? 'legacy') === 'modern',
])>
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @include('frontend.inc_navbar')
  </header>

  <section id="content-section">
    <div class="container">
      <div class="row">
        <div class="col-lg-12">
          <div class="about-box">
            <div class="title-section">
              <h1 class="">About Us</h1>
            </div>
            <div class="video-playlist">
              <div class="video-playlist__content thumb-container">
                <div class="embed-responsive embed-responsive-16by9">
                  <iframe src="https://www.youtube.com/embed/MqakY4eovu8?feature=oembed" class="video-playlist__content-video" title="About ISH News"></iframe>
                </div>
              </div>
              <div class="video-playlist__list">
                <a href="https://www.youtube.com/embed/MqakY4eovu8?feature=oembed&amp;autoplay=1" class="video-playlist__list-item video-playlist__list-item--active">
                  <div class="video-playlist__list-item-thumb">
                    <img src="https://i.ytimg.com/vi/MqakY4eovu8/mqdefault.jpg" class="video-playlist__list-item-img" alt="" loading="lazy" width="320" height="180">
                  </div>
                  <div class="video-playlist__list-item-description">
                    <h4 class="video-playlist__list-item-title">A Short Information About ISH News</h4>
                  </div>
                </a>
                <a href="https://www.youtube.com/embed/_LaE6SgEz-w?feature=oembed&amp;autoplay=1" class="video-playlist__list-item">
                  <div class="video-playlist__list-item-thumb">
                    <img src="https://i.ytimg.com/vi/_LaE6SgEz-w/mqdefault.jpg" class="video-playlist__list-item-img" alt="" loading="lazy" width="320" height="180">
                  </div>
                  <div class="video-playlist__list-item-description">
                    <h4 class="video-playlist__list-item-title">First Announcement of ISH News</h4>
                  </div>
                </a>
                <a href="https://www.youtube.com/embed/O32Xf1fiSjU?feature=oembed&amp;autoplay=1" class="video-playlist__list-item">
                  <div class="video-playlist__list-item-thumb">
                    <img src="https://i.ytimg.com/vi/O32Xf1fiSjU/mqdefault.jpg" class="video-playlist__list-item-img" alt="" loading="lazy" width="320" height="180">
                  </div>
                  <div class="video-playlist__list-item-description">
                    <h4 class="video-playlist__list-item-title">Leading the Deaf into Light this New Year 2020</h4>
                  </div>
                </a>
                <a href="https://www.youtube.com/embed/V67JWMGVnAE?feature=oembed&amp;autoplay=1" class="video-playlist__list-item">
                  <div class="video-playlist__list-item-thumb">
                    <img src="https://i.ytimg.com/vi/V67JWMGVnAE/mqdefault.jpg" class="video-playlist__list-item-img" alt="" loading="lazy" width="320" height="180">
                  </div>
                  <div class="video-playlist__list-item-description">
                    <h4 class="video-playlist__list-item-title">ISH Wins NCPEDP - Mphasis Universal Design Award</h4>
                  </div>
                </a>
              </div>
            </div>
          </div>
          <div class="compare-box">
            <div class="row">
              <div class="col-sm-6">
                <div class="box-holder">
                  <h2>The Current Situation</h2>
                  <img src="{{ \App\Support\FrontendMedia::themeImageUrl('images/box-about-problem.jpg') }}" alt="The Problem" loading="lazy">
                  <p>90% of the 1.8 crore Deaf population in India is usually deprived of the knowledge and information from the TV channels as they are conveyed in spoken language which they cannot hear. Limited knowledge, causes the Deaf to face difficulties in their life especially with their education and employment.</p>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="box-holder">
                  <h2>The Solution via ISH News</h2>
                  <img src="{{ \App\Support\FrontendMedia::themeImageUrl('images/box-about-solution.jpg') }}" alt="The Solution" loading="lazy">
                  <p>ISH News broadcasts the Daily News and Entertainment online in Deaf-friendly accessible formats which are in Indian Sign Language (ISL), visual images with titles, voice-over and closed-captions. This ensures that we provide equal access to every individual, whilst promoting awareness.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="team-box">
            <div class="title-section">
              <h1 class="">What Can We Do?</h1>
            </div>
            <div class="row">
              <div class="col-md-4">
                <img src="{{ \App\Support\FrontendMedia::themeImageUrl('images/box-news-on-tv.jpg') }}" alt="ISH News on TV" loading="lazy">
                <h2>Daily News &amp; Awareness</h2>
                <span>We educate the Deaf community and keep them up-to-date with News and Awareness with the intention of ensuring their prosperity.</span>
              </div>
              <div class="col-md-4">
                <img src="{{ \App\Support\FrontendMedia::themeImageUrl('images/box-interpret-your-content.jpg') }}" alt="Interpret your content" loading="lazy">
                <h2>Interpret your Content</h2>
                <span>We make your videos, ads, movies or text contents accessible to the Deaf Community via Indian Sign Language (ISL).</span>
              </div>
              <div class="col-md-4">
                <img src="{{ \App\Support\FrontendMedia::themeImageUrl('images/box-brand-advertising.jpg') }}" alt="ISH News Advertises Your Brand" loading="lazy">
                <h2>Promote Your Brands</h2>
                <span>We enhance the recognition of your brand to 1.8 crore Deaf population via creative ads and display of your brand in our channel.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-lg-9">
          <div class="single-post">
            <div class="title-section">
              <h1 class="">ISH News Wins YouTube Creator Award 2021</h1>
            </div>
            <img src="{{ \App\Support\FrontendMedia::themeImageUrl('images/box-youytube-creator-award-2021.jpg') }}" alt="ISH News Wins YouTube Creator Award 2021" loading="lazy">
          </div>
        </div>
        <div class="col-lg-3 sidebar-sticky">
          <div class="sidebar theiaStickySidebar">
            @include('frontend.sidebar_shop')
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
