<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use App\Services\FrontendSharedViewData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PageController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    private function layout(): array
    {
        $nav = FrontendSharedViewData::navigationMenuOnly();

        return array_merge($nav, [
            'cslider' => FrontendSharedViewData::sponsorCarousel(),
        ]);
    }

    public function about(): View
    {
        return view('frontend.page_about', $this->layout());
    }

    public function contact(): View
    {
        return view('frontend.contact', $this->layout());
    }

    public function contactSubmit(Request $request): RedirectResponse
    {
        $request->validate([
            'author' => ['required', 'string', 'max:200'],
            'email' => ['required', 'email', 'max:200'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'comment' => ['required', 'string', 'max:8000'],
        ]);

        return redirect()->route('contact')->with('status', 'Thank you. We have received your message.');
    }

    public function sitemap(): View
    {
        return view('frontend.sitemap', array_merge($this->layout(), [
            'sitemapCategories' => FrontendSharedViewData::sitemapCategories(),
        ]));
    }
}
