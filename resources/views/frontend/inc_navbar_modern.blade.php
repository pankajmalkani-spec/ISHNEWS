{{-- Modern home only: dark cinematic nav + mega panels (same $menu data as legacy) --}}
<nav class="ish-nav-modern" id="ish-nav-modern" aria-label="Main">
  <div class="ish-nav-modern__bar">
    <div class="container-fluid ish-nav-modern__bar-inner">
      <div class="ish-nav-modern__start">
        <a class="ish-nav-modern__brand" href="{{ url('/') }}">
          <img src="{{ url('/images/ish-news-logo.png') }}" alt="ISH News" class="ish-nav-modern__logo" width="120" height="40" loading="eager">
        </a>
        <button type="button" class="ish-nav-modern__burger" id="ish-nav-modern-burger" aria-expanded="false" aria-controls="ish-nav-modern-panel" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      <div class="ish-nav-modern__center">
        <div class="ish-nav-modern__panel" id="ish-nav-modern-panel">
          <ul class="ish-nav-modern__list">
            <li class="ish-nav-modern__item">
              <a class="ish-nav-modern__link ish-nav-modern__link--home" href="{{ url('/') }}">Home</a>
            </li>
            @foreach(($menu ?? []) as $cat)
              <li class="ish-nav-modern__item ish-nav-modern__item--mega">
                <button type="button" class="ish-nav-modern__link ish-nav-modern__link--mega-trigger" aria-expanded="false" aria-controls="ish-mega-{{ $loop->index }}" aria-haspopup="true">
                  {{ $cat['title'] ?? '' }}
                  <span class="ish-nav-modern__chev" aria-hidden="true"></span>
                </button>
                <div class="ish-nav-mega" id="ish-mega-{{ $loop->index }}" role="region" aria-label="{{ $cat['title'] ?? 'Category' }}">
                  <div class="ish-nav-mega__inner container">
                    @if(!empty($cat['subcategories']) && count($cat['subcategories']) > 0)
                      <div class="ish-nav-mega__filters">
                        <a class="ish-nav-mega__pill ish-nav-mega__pill--active" href="{{ url('/category/'.($cat['code'] ?? '')) }}">All</a>
                        @foreach($cat['subcategories'] as $sub)
                          <a class="ish-nav-mega__pill" href="{{ url('/category/'.($cat['code'] ?? '').'/'.($sub->code ?? '')) }}">{{ $sub->name ?? '' }}</a>
                        @endforeach
                      </div>
                    @endif
                    @if(!empty($cat['latest']))
                      <div class="row ish-nav-mega__grid">
                        @foreach(collect($cat['latest'])->take(4) as $item)
                          <div class="col-6 col-md-3">
                            <article class="ish-nav-mega__card">
                              <a class="ish-nav-mega__thumb" href="{{ url('/videos/'.($item->categorycode ?? '').'/'.($item->permalink ?? '')) }}">
                                <img src="{{ \App\Support\FrontendMedia::coverImageUrl($item->cover_img ?? null) }}" alt="" loading="lazy">
                              </a>
                              <a class="ish-nav-mega__card-title" href="{{ url('/videos/'.($item->categorycode ?? '').'/'.($item->permalink ?? '')) }}">{{ $item->content_title ?? '' }}</a>
                            </article>
                          </div>
                        @endforeach
                      </div>
                    @else
                      <p class="ish-nav-mega__empty">Browse <a href="{{ url('/category/'.($cat['code'] ?? '')) }}">{{ $cat['title'] ?? 'category' }}</a>.</p>
                    @endif
                  </div>
                </div>
              </li>
            @endforeach
          </ul>
        </div>
      </div>

      <div class="ish-nav-modern__actions">
        <form name="frmNavSearchModern" class="ish-nav-modern__search ish-nav-modern__search--nav" role="search" method="get" action="{{ url('/search') }}">
          <input name="sKeyword" type="search" placeholder="Search…" aria-label="Search" autocomplete="off">
          <button type="submit" aria-label="Submit search"><i class="fa fa-search"></i></button>
        </form>
      </div>
    </div>
  </div>
  <div class="ish-nav-modern__backdrop" id="ish-nav-modern-backdrop" hidden aria-hidden="true"></div>
</nav>

<script>
(function () {
  var nav = document.getElementById('ish-nav-modern');
  var burger = document.getElementById('ish-nav-modern-burger');
  var panel = document.getElementById('ish-nav-modern-panel');
  var backdrop = document.getElementById('ish-nav-modern-backdrop');
  if (!nav || !burger || !panel) return;

  function setOpen(open) {
    nav.classList.toggle('ish-nav-modern--open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    document.body.classList.toggle('ish-nav-modern--lock', open);
  }

  burger.addEventListener('click', function () {
    setOpen(!nav.classList.contains('ish-nav-modern--open'));
  });

  if (backdrop) {
    backdrop.addEventListener('click', function () { setOpen(false); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setOpen(false);
    nav.querySelectorAll('.ish-nav-modern__item--mega-open').forEach(function (el) {
      el.classList.remove('ish-nav-modern__item--mega-open');
      var bt = el.querySelector('.ish-nav-modern__link--mega-trigger');
      if (bt) bt.setAttribute('aria-expanded', 'false');
    });
  });

  // Close mobile menu when following in-panel link
  panel.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 991px)').matches) setOpen(false);
    });
  });

  // Desktop (lg+): category label is a <button> — toggles mega (no navigation from label; use “All” / pills / cards).
  function closeMegaItem(item) {
    if (!item) return;
    item.classList.remove('ish-nav-modern__item--mega-open');
    var btn = item.querySelector('.ish-nav-modern__link--mega-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function closeAllMegaItems() {
    nav.querySelectorAll('.ish-nav-modern__item--mega-open').forEach(closeMegaItem);
  }

  function openMegaItem(item) {
    if (!item || !item.querySelector('.ish-nav-mega')) return;
    closeAllMegaItems();
    item.classList.add('ish-nav-modern__item--mega-open');
    var btn = item.querySelector('.ish-nav-modern__link--mega-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  nav.querySelectorAll('.ish-nav-modern__link--mega-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      var li = btn.closest('.ish-nav-modern__item--mega');
      if (!li || !li.querySelector('.ish-nav-mega')) return;
      var opening = !li.classList.contains('ish-nav-modern__item--mega-open');
      nav.querySelectorAll('.ish-nav-modern__item--mega-open').forEach(function (el) {
        el.classList.remove('ish-nav-modern__item--mega-open');
        var b = el.querySelector('.ish-nav-modern__link--mega-trigger');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (opening) {
        li.classList.add('ish-nav-modern__item--mega-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  nav.querySelectorAll('.ish-nav-modern__item--mega').forEach(function (item) {
    var closeTimer = null;

    item.addEventListener('mouseenter', function () {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      clearTimeout(closeTimer);
      openMegaItem(item);
    });

    item.addEventListener('mouseleave', function () {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      closeTimer = setTimeout(function () {
        closeMegaItem(item);
      }, 150);
    });
  });

  document.addEventListener('click', function (e) {
    if (!window.matchMedia('(min-width: 992px)').matches) return;
    if (nav.contains(e.target)) return;
    nav.querySelectorAll('.ish-nav-modern__item--mega-open').forEach(function (el) {
      el.classList.remove('ish-nav-modern__item--mega-open');
      var b = el.querySelector('.ish-nav-modern__link--mega-trigger');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });
})();
</script>
<script>
$(document).ready(function () {
  $('form[name="frmNavSearchModern"]').validate({
    rules: { sKeyword: { required: true } },
    messages: { sKeyword: 'Please enter the text to search.' },
    submitHandler: function (form) { form.submit(); }
  });

  // Keep navbar search reliable even when validation plugin is delayed/blocked.
  $('form[name="frmNavSearchModern"]').on('submit', function (e) {
    var $form = $(this);
    var $input = $form.find('input[name="sKeyword"]');
    var keyword = ($input.val() || '').trim();
    if (keyword === '') {
      e.preventDefault();
      if ($input.length) $input.focus();
      return false;
    }
    e.preventDefault();
    window.location.href = "{{ url('/search') }}" + '?sKeyword=' + encodeURIComponent(keyword);
    return false;
  });
});
</script>
