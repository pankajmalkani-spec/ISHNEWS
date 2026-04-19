@php
    /** @var \Illuminate\Support\Collection<int, object>|array<int, object> $advertisement */
    $ads = isset($advertisement) ? collect($advertisement) : collect();

    $promoSrc = null;
    $configured = trim((string) config('ishnews.sidebar_promo_image_url', ''));
    if ($configured !== '' && filter_var($configured, FILTER_VALIDATE_URL)) {
        $promoSrc = $configured;
    }
    if ($promoSrc === null && is_file(public_path('images/ISL-Course-Ad.jpg'))) {
        $promoSrc = asset('images/ISL-Course-Ad.jpg');
    }

    $islPromoHref = 'https://www.ishshiksha.com/learn-indian-sign-language/';
@endphp
<div class="widget">
  <h1>Advertisement</h1>
  <div class="advertisement">
    @if($promoSrc)
      <a href="{{ $islPromoHref }}" target="_blank" rel="noopener noreferrer">
        <img src="{{ $promoSrc }}" alt="Indian Sign Language (ISL) Course Online" style="width: 100%; height: auto;" loading="lazy">
      </a>
    @else
      <a href="{{ $islPromoHref }}" class="advertisement-promo-fallback" target="_blank" rel="noopener noreferrer">
        <span class="advertisement-promo-fallback__line1">Learn Indian Sign Language</span>
        <span class="advertisement-promo-fallback__line2">Online course — ISH Shiksha</span>
      </a>
    @endif
    @foreach($ads as $adv)
      @php
        $imgUrl = \App\Support\FrontendMedia::advertisementImageUrlIfExists($adv->img_url ?? null);
        $link = trim((string) ($adv->ad_url ?? ''));
      @endphp
      @continue(! $imgUrl)
      <div class="advertisement-db" style="margin-top: 12px;">
        <a href="{{ $link !== '' ? $link : '#' }}" @if($link !== '') target="_blank" rel="noopener noreferrer" @endif>
          <img src="{{ $imgUrl }}" alt="{{ $adv->title ?? 'Advertisement' }}" style="width: 100%; height: auto;" loading="lazy">
        </a>
      </div>
    @endforeach
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-1871589442673243" data-ad-slot="8621930783" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
</div>
