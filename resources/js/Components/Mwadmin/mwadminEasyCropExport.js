/**
 * Export pipeline for react-easy-crop: croppedAreaPixels are in the rotated
 * natural-image bounding box (same coordinate system as ValentinH/react-easy-crop).
 */

function getRadianAngle(degrees) {
    return (degrees * Math.PI) / 180;
}

function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation);
    return {
        width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', reject);
        img.crossOrigin = 'anonymous';
        img.src = src;
    });
}

/**
 * @param {string} imageSrc Object URL or URL of the image being cropped
 * @param {{ x: number; y: number; width: number; height: number }} pixelCrop from onCropComplete
 * @param {number} rotation same as passed to Cropper
 * @param {number} outWidth final file width
 * @param {number} outHeight final file height
 * @param {{ format?: string; quality?: number; baseName?: string }} options
 * @returns {Promise<File | null>}
 */
export async function exportEasyCropToFile(imageSrc, pixelCrop, rotation, outWidth, outHeight, options = {}) {
    if (!pixelCrop || pixelCrop.width < 2 || pixelCrop.height < 2) {
        return null;
    }
    try {
        const image = await loadImage(imageSrc);
        const srcW = image.naturalWidth || image.width;
        const srcH = image.naturalHeight || image.height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const rotRad = getRadianAngle(rotation);
        const { width: boxW, height: boxH } = rotateSize(srcW, srcH, rotation);

        canvas.width = Math.max(1, Math.round(boxW));
        canvas.height = Math.max(1, Math.round(boxH));
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotRad);
        ctx.translate(-srcW / 2, -srcH / 2);
        ctx.drawImage(image, 0, 0, srcW, srcH);

        const cropped = document.createElement('canvas');
        const cctx = cropped.getContext('2d');
        if (!cctx) return null;

        const cw = Math.round(pixelCrop.width);
        const ch = Math.round(pixelCrop.height);
        cropped.width = Math.max(1, cw);
        cropped.height = Math.max(1, ch);

        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = 'high';
        cctx.drawImage(
            canvas,
            Math.round(pixelCrop.x),
            Math.round(pixelCrop.y),
            cw,
            ch,
            0,
            0,
            cw,
            ch
        );

        const out = document.createElement('canvas');
        const octx = out.getContext('2d');
        if (!octx) return null;
        out.width = outWidth;
        out.height = outHeight;
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(cropped, 0, 0, cropped.width, cropped.height, 0, 0, outWidth, outHeight);

        const fmt = String(options.format || 'jpg').toLowerCase();
        const wantPng = fmt === 'png';
        const mime = wantPng ? 'image/png' : 'image/jpeg';
        const q = (Number(options.quality) || 92) / 100;
        const base = options.baseName || 'image';

        return await new Promise((resolve) => {
            out.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    const ext = wantPng ? 'png' : 'jpg';
                    resolve(new File([blob], `${base}_${Date.now()}.${ext}`, { type: mime }));
                },
                mime,
                wantPng ? undefined : q
            );
        });
    } catch {
        return null;
    }
}

/**
 * Same as export but returns an object URL for live previews (caller must revoke).
 * @returns {Promise<string | null>}
 */
export async function exportEasyCropToObjectUrl(imageSrc, pixelCrop, rotation, outWidth, outHeight, options = {}) {
    const file = await exportEasyCropToFile(imageSrc, pixelCrop, rotation, outWidth, outHeight, options);
    if (!file) return null;
    return URL.createObjectURL(file);
}
