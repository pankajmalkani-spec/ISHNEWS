@php
    /** @var array<int, array<string, mixed>>|null $CategorySet1 */
    $bn = isset($CategorySet1[1]) ? $CategorySet1[1] : null;
@endphp
@if($bn && ! empty($bn['news_list']) && count($bn['news_list']) > 0)
  <div class="row">
    <div class="col-lg-12">
      <section id="BreakingNews-section">
        <div class="posts-block">
          <div class="title-section">
            <h1 class="{{ $bn['code'] ?? '' }}">{{ $bn['title'] ?? '' }}<a href="{{ url('/category/'.($bn['code'] ?? '')) }}" class="btn-more category category-{{ $bn['code'] ?? '' }}">More</a></h1>
          </div>
          <div class="featured-box owl-wrapper">
            <div class="owl-carousel owl-theme" data-num="3">
              @foreach($bn['news_list'] as $slider)
                <div class="item">
                  <div class="news-post standart-post">
                    <div class="post-image">
                      <a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">
                        <img src="{{ \App\Support\FrontendMedia::coverImageUrl($slider->cover_img ?? null) }}" alt="{{ $slider->title ?? '' }}">
                      </a>
                      <a href="{{ url('/category/'.($slider->categorycode ?? '').'/'.($slider->subcategorycode ?? '')) }}" class="category category-{{ $slider->categorycode ?? '' }}">{{ $slider->subcategoryname ?? '' }}</a>
                    </div>
                    <h2><a href="{{ url('/videos/'.($slider->categorycode ?? '').'/'.($slider->permalink ?? '')) }}">{{ $slider->title ?? '' }}</a></h2>
                    <ul class="post-tags">
                      <li>
                        <i class="fa fa-calendar"></i>
                        <a href="#">
                          @if(! empty($slider->schedule_date))
                            @php
                              try {
                                  $bnSchedule = \Illuminate\Support\Carbon::parse($slider->schedule_date)->format('M j, Y H:i:s');
                              } catch (\Throwable) {
                                  $bnSchedule = '';
                              }
                            @endphp
                            {{ $bnSchedule }}
                          @endif
                        </a>
                      </li>
                      <li>
                        <i class="fa fa-newspaper-o"></i>
                        <a href="#">{{ $slider->newsourcename ?? '' }}</a>
                      </li>
                    </ul>
                  </div>
                </div>
              @endforeach
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
@endif
