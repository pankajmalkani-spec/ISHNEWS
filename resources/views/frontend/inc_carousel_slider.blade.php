<section id="Sponsor-section">
  <div class="container">
    <div class="row">
      <div class="col-lg-12">
        <div class="posts-block">
          <h2>Our Sponsors</h2>
          <div class="featured-box owl-wrapper">
            <div class="owl-carousel" data-num="6">
              @foreach(($cslider ?? []) as $cs)
                <div class="item">
                  <div class="news-post standart-post">
                    <div class="post-image"><a href="{{ $cs->website ?? '#' }}" target="_blank"><img src="{{ url('/images/sponsorLogo/'.($cs->logo ?? '')) }}" alt=""></a></div>
                    <h3><a href="{{ $cs->website ?? '#' }}" target="_blank">{{ $cs->organization_name ?? '' }}</a></h3>
                    <a href="#" class="category sponsor-{{ strtolower($cs->package ?? '') }}"></a>
                  </div>
                </div>
              @endforeach
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
