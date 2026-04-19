<?php

return [
    /**
     * Optional absolute URL for the homepage sidebar ISL promo image (above AdSense).
     * Use when `public/images/ISL-Course-Ad.jpg` is not deployed (e.g. point at production CDN).
     */
    'sidebar_promo_image_url' => env('ISH_SIDEBAR_PROMO_IMAGE_URL', ''),

    /**
     * Preferred origin for theme images when the file is not under Laravel `public/` (about page, merchandise, etc.).
     * Example: `http://127.0.0.1:8091` to match a local legacy server.
     */
    'theme_image_origin' => env('ISH_THEME_IMAGE_ORIGIN', ''),

    /**
     * Second fallback for theme images when not on disk (see {@see \App\Support\FrontendMedia::themeImageUrl()}).
     */
    'public_images_fallback_base' => env('ISH_PUBLIC_IMAGES_FALLBACK_BASE', ''),
];
