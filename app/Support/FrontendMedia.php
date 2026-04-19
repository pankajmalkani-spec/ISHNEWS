<?php

namespace App\Support;

/**
 * Resolves public URLs for legacy frontend assets under {@see public_path('images')}.
 * When a DB filename is missing or the file is not on disk, uses the same placeholders as CodeIgniter mwadmin.
 */
class FrontendMedia
{
    public const COVER_FALLBACK = 'no_img.png';

    public const SPONSOR_FALLBACK = 'no_img.gif';

    /** @var non-empty-string */
    private const COVER_DIR = 'images/NewsContents/coverImages';

    /** @var non-empty-string */
    private const SPONSOR_DIR = 'images/sponsorLogo';

    public static function coverImageUrl(?string $storedFilename): string
    {
        $name = self::resolveExistingBasename((string) ($storedFilename ?? ''), public_path(self::COVER_DIR), self::COVER_FALLBACK);

        return url(self::COVER_DIR.'/'.$name);
    }

    public static function sponsorLogoUrl(?string $storedFilename): string
    {
        $name = self::resolveExistingBasename((string) ($storedFilename ?? ''), public_path(self::SPONSOR_DIR), self::SPONSOR_FALLBACK);

        return url(self::SPONSOR_DIR.'/'.$name);
    }

    /**
     * Sidebar / frontend ads: {@see public_path('images/AdvertiseImages')}. Returns null if missing or invalid (no placeholder URL).
     */
    public static function advertisementImageUrlIfExists(?string $storedFilename): ?string
    {
        $trimmed = trim((string) ($storedFilename ?? ''));
        if ($trimmed === '' || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $trimmed) !== 1) {
            return null;
        }

        $lower = strtolower($trimmed);
        if ($lower === 'no_img.png' || $lower === 'no_img.gif') {
            return null;
        }

        $path = public_path('images/AdvertiseImages/'.$trimmed);

        return is_file($path) ? url('images/AdvertiseImages/'.$trimmed) : null;
    }

    private static function resolveExistingBasename(string $stored, string $absoluteDir, string $fallbackBasename): string
    {
        $trimmed = trim($stored);
        if ($trimmed === '') {
            return $fallbackBasename;
        }

        // DB stores a bare filename (legacy); reject path segments.
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $trimmed) !== 1) {
            return $fallbackBasename;
        }

        $path = $absoluteDir.'/'.$trimmed;

        return is_file($path) ? $trimmed : $fallbackBasename;
    }
}
