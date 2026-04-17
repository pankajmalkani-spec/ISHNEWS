<footer>
  <div class="container">
    <div class="up-footer">
      <div class="row">
        <div class="col-lg-3 col-md-6">
          <div class="footer-widget text-widget">
            <h1><a href="https://indiasigninghands.com/"><img id="footer-logo" src="{{ url('/images/ish-logo.jpg') }}" alt="ISH Logo"></a></h1>
            <p>ISH News is one of the projects operated by India Signing Hands Private Limited (ISH), dedicated to providing Accessibility and Education for the Deaf Community.</p>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="footer-widget popular-widget">
            <h1>ISH Projects</h1>
            <ul class="small-posts">
              <li><a href="{{ url('/') }}" target="_blank"><img src="{{ url('/images/ish-news-logo.png') }}" alt="ISH News Logo"></a>
                <div class="post-cont">
                  <h2><a href="{{ url('/') }}">ISH News</a></h2>
                  <ul class="post-tags"><li><i class="lnr lnr-user"></i>News & Entertainment</li></ul>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div class="col-lg-3 col-md-6 d-none d-sm-block">
          <div class="footer-widget featured-widget">
            <h1>The Launch</h1>
            <div class="news-post standart-post">
              <div class="post-image"><a href="{{ url('/videos/deaf_buzz/announcement-of-ish-news') }}"><img src="{{ url('/images/NewsContents/coverImages/20181124145558.jpg') }}" alt="Announcement of ISH News"></a></div>
              <h2><a href="{{ url('/videos/deaf_buzz/announcement-of-ish-news') }}">Announcement of ISH News</a></h2>
            </div>
          </div>
        </div>
        <div class="col-lg-3 col-md-6">
          <div class="footer-widget tags-widget">
            <h1>Tags</h1>
            <ul class="tags-list">
              <li><a href="{{ url('/search?sKeyword=Deaf') }}">Deaf</a></li>
              <li><a href="{{ url('/search?sKeyword=Accessibility') }}">Accessibility</a></li>
              <li><a href="{{ url('/search?sKeyword=News') }}">News</a></li>
              <li><a href="{{ url('/search?sKeyword=Entertainment') }}">Entertainment</a></li>
              <li><a href="{{ url('/search?sKeyword=Technology') }}">Technology</a></li>
              <li><a href="{{ url('/search?sKeyword=Business') }}">Business</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="down-footer">
      <ul class="list-footer">
        <li><a href="{{ url('/') }}">Home</a></li>
        <li><a href="{{ url('/about') }}">About</a></li>
        <li><a href="{{ url('/contact') }}">Work With Us</a></li>
        <li><a href="{{ url('/contact') }}">Contact</a></li>
        <li><a href="{{ url('/sitemap') }}">Sitemap</a></li>
      </ul>
      <p>&copy; {{ date('Y') }} - India Signing Hands Private Limited (ISH)<a href="#" class="go-top"><i class="fa fa-caret-up" aria-hidden="true"></i></a></p>
    </div>
  </div>
</footer>
