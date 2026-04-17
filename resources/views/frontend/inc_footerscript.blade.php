<script src="{{ url('/assets/js/modernmag-plugins.min.js') }}"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.19.1/jquery.validate.min.js"></script>
<script src="{{ url('/assets/js/popper.js') }}"></script>
<script src="{{ url('/assets/js/bootstrap.min.js') }}"></script>
<script src="{{ url('/assets/js/script.js') }}"></script>
<script>
  (function() {
    var fallback = "{{ url('/images/ish_news.png') }}";
    function applyFallback(img) {
      if (!img || img.getAttribute('data-fallback-applied') === '1') return;
      img.setAttribute('data-fallback-applied', '1');
      img.src = fallback;
    }
    document.querySelectorAll('img').forEach(function(img) {
      img.addEventListener('error', function() { applyFallback(img); });
      if (img.complete && typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0) {
        applyFallback(img);
      }
    });
  })();
</script>
