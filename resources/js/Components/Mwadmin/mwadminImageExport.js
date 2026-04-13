/** Generic canvas export for category / asset images (fixed output frame, cover-style fit). */

export const clampMwadminZoom = (value) => Math.min(4, Math.max(0.35, Number(value) || 1));

/**
 * @param {File} file
 * @param {number} rotate
 * @param {number} zoom
 * @param {{ x: number; y: number }} offset
 * @param {number} outWidth
 * @param {number} outHeight
 * @param {{ format?: string; quality?: number; baseName?: string }} options
 * @returns {Promise<File | null>}
 */
export function exportMwadminImage(file, rotate, zoom, offset, outWidth, outHeight, options = {}) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(null);
            return;
        }
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
        };
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = outWidth;
                canvas.height = outHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(objectUrl);
                    resolve(null);
                    return;
                }
                const rad = (rotate * Math.PI) / 180;
                const scale = Math.max(outWidth / img.width, outHeight / img.height) * zoom;
                const drawW = img.width * scale;
                const drawH = img.height * scale;
                ctx.clearRect(0, 0, outWidth, outHeight);
                ctx.translate(outWidth / 2, outHeight / 2);
                ctx.rotate(rad);
                ctx.drawImage(img, -drawW / 2 + offset.x, -drawH / 2 + offset.y, drawW, drawH);
                const wantPng = options.format === 'png';
                const mime = wantPng ? 'image/png' : 'image/jpeg';
                const q = (Number(options.quality) || 88) / 100;
                const base = options.baseName || 'image';
                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(objectUrl);
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
            } catch {
                URL.revokeObjectURL(objectUrl);
                resolve(null);
            }
        };
        img.src = objectUrl;
    });
}
