<?php

return [
    /**
     * Optional absolute URL for the homepage sidebar ISL promo image (above AdSense).
     * Use when `public/images/ISL-Course-Ad.jpg` is not deployed (e.g. point at production CDN).
     */
    'sidebar_promo_image_url' => env('ISH_SIDEBAR_PROMO_IMAGE_URL', ''),
];
