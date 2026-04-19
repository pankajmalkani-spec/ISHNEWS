<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta name="description" content="Contact ISH News">
  <title>Contact Us | ISH News</title>
  @include('frontend.inc_htmlhead')
</head>
<body class="ish-theme ish-theme-{{ $frontendTheme ?? 'legacy' }}">
<div id="container">
  <header class="clearfix">
    @include('frontend.inc_header')
    @include('frontend.inc_navbar')
  </header>

  <section id="content-section">
    <div class="container">
      <div class="row">
        <div class="col-lg-9">
          <div class="contact-form-box">
            <div class="title-section">
              <h1>Talk to us</h1>
            </div>
            @if(session('status'))
              <p class="alert alert-success" role="status">{{ session('status') }}</p>
            @endif
            @if($errors->any())
              <div class="alert alert-danger">
                <ul class="mb-0">
                  @foreach($errors->all() as $err)
                    <li>{{ $err }}</li>
                  @endforeach
                </ul>
              </div>
            @endif
            <form id="contact-form" name="contact-form" action="{{ url('/contact') }}" method="post" novalidate>
              @csrf
              <p>We are incredibly responsive to your requests and value your questions.</p>
              <div class="row">
                <div class="col-sm-4">
                  <label for="author" class="input-desc">Name<span class="required">*</span></label>
                  <input id="author" class="form-control" placeholder="Name" name="author" type="text" value="{{ old('author') }}" size="30" aria-required="true" autocomplete="name">
                </div>
                <div class="col-sm-4">
                  <label for="email" class="input-desc">Email<span class="required">*</span></label>
                  <input id="email" class="form-control" placeholder="Your E-mail" name="email" type="email" value="{{ old('email') }}" size="30" aria-required="true" autocomplete="email">
                </div>
                <div class="col-sm-4">
                  <label for="mobile" class="input-desc">Mobile</label>
                  <input id="mobile" class="form-control" placeholder="Mobile" name="mobile" type="text" value="{{ old('mobile') }}" size="30" autocomplete="tel">
                </div>
              </div>
              <label for="comment" class="input-desc">Message<span class="required">*</span></label>
              <textarea class="form-control" id="comment" name="comment" aria-required="true" placeholder="Your Message" rows="6">{{ old('comment') }}</textarea>
              <button name="submit" type="submit" id="submit" value="Send"><i class="fa fa-paper-plane"></i> Send Message</button>
            </form>
          </div>
        </div>
        <div class="col-lg-3 sidebar-sticky">
          <div class="sidebar theiaStickySidebar">
            @include('frontend.sidebar_sm')
            <div class="archive-widget widget">
              <h1>Contact Details</h1>
              <ul class="archive-list">
                <li><i class="fa fa-map-marker" style="padding-right: 5px;"></i>Lower Parel, Mumbai</li>
                <li><i class="fa fa-calendar" style="padding-right: 5px;"></i>Mon-Fri, 10:00AM-3:00PM</li>
                <li><i class="fa fa-phone" style="padding-right: 5px;"></i>+91 7208302075</li>
                <li><i class="fa fa-envelope" style="padding-right: 5px;"></i><a href="mailto:hello@ishnews.tv">hello@ishnews.tv</a></li>
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
<script>
$(document).ready(function () {
  $('#contact-form').validate({
    rules: {
      author: { required: true },
      email: { required: true, email: true },
      comment: { required: true }
    },
    messages: {
      author: 'Please enter your name.',
      email: 'Please enter a valid email.',
      comment: 'Please enter your message.'
    }
  });
});
</script>
</body>
</html>
