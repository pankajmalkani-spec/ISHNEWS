<section id="Sponsor-section">
  <div class="container">
    <div class="row">
      <div class="col-lg-12">
        <div class="posts-block">
          <h2>Our Sponsors</h2>
          <div class="featured-box owl-wrapper">
            <div class="owl-carousel" data-num="6">
              @forelse(($cslider ?? collect()) as $cs)
                <div class="item">
                  <div class="news-post standart-post">
                    <div class="post-image"><a href="{{ $cs->website ?? '#' }}" target="_blank" rel="noopener noreferrer"><img src="{{ \App\Support\FrontendMedia::sponsorLogoUrl($cs->logo ?? null) }}" alt="{{ trim((string) ($cs->organization_name ?? '')) ?: 'Sponsor' }}"></a></div>
                    <h3><a href="{{ $cs->website ?? '#' }}" target="_blank" rel="noopener noreferrer">{{ $cs->organization_name ?? '' }}</a></h3>
                    <a href="#" class="category sponsor-{{ strtolower($cs->package ?? '') }}"></a>
                  </div>
                </div>
              @empty
                <div class="item">
                  <div class="news-post standart-post">
                    <div class="post-image">
                      <span class="d-inline-block"><img src="{{ \App\Support\FrontendMedia::sponsorLogoUrl(null) }}" alt="No image available" width="240" height="160" loading="lazy"></span>
                    </div>
                  </div>
                </div>
              @endforelse
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
