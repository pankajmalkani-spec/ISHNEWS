import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { exportEasyCropToFile, exportEasyCropToObjectUrl } from './mwadminEasyCropExport';

const rotateFine = [-15, -30, -45, 15, 30, 45];

function clampZoom(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return 1;
    return Math.min(4, Math.max(1, n));
}

function LegacyPreviewPlaceholder({ outW, outH, frameWidth, caption, blurb }) {
    const aspect = outW / outH;
    const h = frameWidth / aspect;
    return (
        <figure className="mwadmin-legacy-preview-empty">
            <div className="mwadmin-legacy-preview-empty-frame" style={{ width: frameWidth, height: h }}>
                <span className="mwadmin-legacy-preview-empty-dim">
                    {outW}px X {outH}px
                </span>
                <span className="mwadmin-legacy-preview-empty-blurb">{blurb}</span>
            </div>
            <figcaption className="mwadmin-category-export-preview-caption">{caption}</figcaption>
        </figure>
    );
}

/**
 * Image editor using react-easy-crop (ValentinH/react-easy-crop): industry-standard drag + zoom + rotation,
 * with canvas export scaled to exact outputWidth × outputHeight.
 *
 * Reopen: pass initialImageFile (preferred) and/or initialImageUrl. Pass editorSourceFile from onApply’s
 * second argument so re-edits use full resolution; Done still exports exact outputWidth × outputHeight.
 * Main cropper uses objectFit contain for consistent first-time and saved-state behavior.
 */
export default function MwadminImageEditorModal({
    open,
    onClose,
    onApply,
    title,
    outputWidth,
    outputHeight,
    notify,
    placeholderBlurb = 'IMAGE GOES HERE',
    initialImageFile = null,
    initialImageUrl = null,
}) {
    const fileInputId = useId();
    const fileRef = useRef(null);
    const pixelsRef = useRef(null);
    const modalOwnedBlobRef = useRef(null);
    /** Full-resolution File last loaded into the cropper (pick, drop, or reopen). Used so parents can re-edit from pixels, not from the small export. */
    const editingSourceFileRef = useRef(null);
    const initialFileRef = useRef(null);
    const initialUrlRef = useRef('');
    const ingestFileRef = useRef(null);
    initialFileRef.current = initialImageFile ?? null;
    initialUrlRef.current =
        typeof initialImageUrl === 'string' && initialImageUrl.trim() ? initialImageUrl.trim() : '';

    const [displayUrl, setDisplayUrl] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [opts, setOpts] = useState({ format: 'jpg', quality: 92 });
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    const aspect = outputWidth / outputHeight;

    const revokeModalBlob = useCallback(() => {
        if (modalOwnedBlobRef.current) {
            URL.revokeObjectURL(modalOwnedBlobRef.current);
            modalOwnedBlobRef.current = null;
        }
    }, []);

    const resetCropState = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
        pixelsRef.current = null;
    }, []);

    const ingestFile = useCallback(
        (file, options = {}) => {
            const { fromReopen = false } = options;
            if (!file || !file.type.startsWith('image/')) {
                notify?.('Please choose or drop an image file (JPG, PNG, GIF, etc.).', 'error');
                return;
            }
            editingSourceFileRef.current = file;
            revokeModalBlob();
            const u = URL.createObjectURL(file);
            modalOwnedBlobRef.current = u;
            setDisplayUrl(u);
            resetCropState();
        },
        [notify, resetCropState, revokeModalBlob]
    );

    ingestFileRef.current = ingestFile;

    useEffect(() => {
        if (!open) {
            setPreviewUrl((u) => {
                if (u) URL.revokeObjectURL(u);
                return '';
            });
            revokeModalBlob();
            editingSourceFileRef.current = null;
            setDisplayUrl('');
            resetCropState();
            return;
        }

        setPreviewUrl((u) => {
            if (u) URL.revokeObjectURL(u);
            return '';
        });

        const file = initialFileRef.current;
        const url = initialUrlRef.current;

        if (file && file.type?.startsWith('image/')) {
            ingestFileRef.current?.(file, { fromReopen: true });
            return;
        }

        if (url) {
            revokeModalBlob();
            editingSourceFileRef.current = null;
            setDisplayUrl(url);
            resetCropState();
            return;
        }

        revokeModalBlob();
        editingSourceFileRef.current = null;
        setDisplayUrl('');
        resetCropState();
    // Only re-run when open toggles; initialImage* is read from refs on each open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const onCropComplete = useCallback((_, pixels) => {
        pixelsRef.current = pixels;
        setCroppedAreaPixels(pixels);
    }, []);

    useEffect(() => {
        if (!displayUrl || !croppedAreaPixels) {
            setPreviewUrl((u) => {
                if (u) URL.revokeObjectURL(u);
                return '';
            });
            return;
        }
        let canceled = false;
        const t = window.setTimeout(async () => {
            const px = pixelsRef.current;
            if (!px) return;
            const maxPrev = 400;
            const pw = outputWidth > maxPrev ? maxPrev : outputWidth;
            const ph = Math.max(1, Math.round(pw / aspect));
            const url = await exportEasyCropToObjectUrl(displayUrl, px, rotation, pw, ph, {
                format: opts.format === 'png' ? 'png' : 'jpg',
                quality: Math.min(opts.quality, 85),
                baseName: 'preview',
            });
            if (canceled) {
                if (url) URL.revokeObjectURL(url);
                return;
            }
            setPreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url || '';
            });
        }, 240);
        return () => {
            canceled = true;
            window.clearTimeout(t);
        };
    }, [displayUrl, croppedAreaPixels, rotation, outputWidth, outputHeight, opts.format, opts.quality, aspect]);

    const onPickFile = (e) => {
        const file = e.target.files?.[0] || null;
        e.target.value = '';
        if (file) ingestFile(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) ingestFile(file);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) setDragOver(false);
    };

    const handleDone = async () => {
        if (!displayUrl) {
            notify?.('Choose or drop an image first.', 'error');
            return;
        }
        const pixels = pixelsRef.current || croppedAreaPixels;
        if (!pixels) {
            notify?.('Wait for the image to load, then adjust the crop.', 'error');
            return;
        }
        const baseName = title.toLowerCase().includes('box') ? 'box' : 'banner';
        const out = await exportEasyCropToFile(displayUrl, pixels, rotation, outputWidth, outputHeight, {
            format: opts.format,
            quality: opts.quality,
            baseName,
        });
        if (!out) {
            notify?.('Could not export the image. Try another file.', 'error');
            return;
        }
        const editorSourceFile = editingSourceFileRef.current;
        onApply(out, {
            editorSourceFile: editorSourceFile instanceof File ? editorSourceFile : null,
        });
        onClose();
    };

    if (!open) return null;

    const previewFrames = [168, 120, 76];
    const previewLabels = ['Large', 'Medium', 'Small'];

    const node = (
        <div
            className="mwadmin-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="mwadmin-modal-card mwadmin-category-image-modal mwadmin-image-editor-legacy"
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="mwadmin-category-image-modal-head">
                    <h3>{title}</h3>
                    <button type="button" className="mwadmin-category-image-modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="mwadmin-legacy-upload-block">
                    <div className="mwadmin-legacy-upload-row">
                        <label className="mwadmin-legacy-upload-label" htmlFor={fileInputId}>
                            Local upload
                        </label>
                        <input
                            id={fileInputId}
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="mwadmin-hidden-input"
                            onChange={onPickFile}
                        />
                        <button type="button" className="mwadmin-upload-btn" onClick={() => fileRef.current?.click()}>
                            Choose File
                        </button>
                    </div>
                    <p className="mwadmin-legacy-size-hint">
                        <strong>
                            Output size — {outputWidth} × {outputHeight}px
                        </strong>
                        <span className="mwadmin-image-editor-output-note"> (Done exports exactly this; previews match this aspect)</span>
                    </p>
                </div>

                <div
                    className={`mwadmin-legacy-editor-columns ${dragOver ? 'is-dragover' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    <div className="mwadmin-legacy-stage-column">
                        <div className={`mwadmin-easy-crop-stage ${dragOver ? 'is-dragover' : ''}`}>
                            {displayUrl ? (
                                <Cropper
                                    image={displayUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={aspect}
                                    objectFit="contain"
                                    minZoom={1}
                                    maxZoom={4}
                                    cropShape="rect"
                                    showGrid
                                    restrictPosition
                                    zoomWithScroll
                                    onCropChange={setCrop}
                                    onZoomChange={(z) => setZoom(clampZoom(z))}
                                    onCropComplete={onCropComplete}
                                    style={{
                                        containerStyle: {
                                            background:
                                                'repeating-conic-gradient(#d4d4d4 0% 25%, #f0f0f0 0% 50%) 50% / 16px 16px',
                                        },
                                        cropAreaStyle: {},
                                    }}
                                />
                            ) : (
                                <div className="mwadmin-category-image-placeholder mwadmin-legacy-stage-placeholder mwadmin-easy-crop-empty">
                                    <span>
                                        {outputWidth} × {outputHeight}
                                    </span>
                                    <small>Drop an image here or use Choose File</small>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="mwadmin-legacy-previews-column" aria-label="Export previews">
                        {previewFrames.map((fw, i) =>
                            previewUrl ? (
                                <figure key={fw} className="mwadmin-category-export-preview mwadmin-legacy-export-preview">
                                    <div
                                        className="mwadmin-category-export-preview-frame mwadmin-export-preview-frame--aspect"
                                        style={{
                                            width: fw,
                                            height: Math.max(1, Math.round(fw / aspect)),
                                        }}
                                    >
                                        <img src={previewUrl} alt="" className="mwadmin-category-export-preview-img" />
                                    </div>
                                    <figcaption className="mwadmin-category-export-preview-caption">{previewLabels[i]}</figcaption>
                                </figure>
                            ) : (
                                <LegacyPreviewPlaceholder
                                    key={fw}
                                    outW={outputWidth}
                                    outH={outputHeight}
                                    frameWidth={fw}
                                    caption={previewLabels[i]}
                                    blurb={placeholderBlurb}
                                />
                            )
                        )}
                    </aside>
                </div>

                <details className="mwadmin-image-editor-advanced">
                    <summary>Zoom &amp; export options</summary>
                    <div className="mwadmin-zoom-row">
                        <label>Zoom</label>
                        <input
                            type="range"
                            min="1"
                            max="4"
                            step="0.02"
                            value={zoom}
                            onChange={(e) => setZoom(clampZoom(e.target.value))}
                        />
                        <span>{zoom.toFixed(2)}×</span>
                    </div>
                    <div className="mwadmin-advanced-row">
                        <select value={opts.format} onChange={(e) => setOpts((o) => ({ ...o, format: e.target.value }))}>
                            <option value="jpg">JPG</option>
                            <option value="png">PNG</option>
                        </select>
                        <label className="mwadmin-category-quality-label">
                            Quality
                            <input
                                type="number"
                                min="40"
                                max="100"
                                value={opts.quality}
                                onChange={(e) => setOpts((o) => ({ ...o, quality: Number(e.target.value) }))}
                            />
                        </label>
                        <button
                            type="button"
                            className="mwadmin-modal-btn ghost"
                            onClick={() => {
                                resetCropState();
                            }}
                        >
                            Reset crop
                        </button>
                    </div>
                </details>

                <div className="mwadmin-legacy-footer">
                    <div className="mwadmin-legacy-rotate-wrap">
                        <div className="mwadmin-legacy-btn-group" role="group" aria-label="Rotate left">
                            <button type="button" className="mwadmin-legacy-rotate-primary" onClick={() => setRotation((d) => d - 90)}>
                                Rotate Left
                            </button>
                            {rotateFine.slice(0, 3).map((deg) => (
                                <button key={`rl${deg}`} type="button" onClick={() => setRotation((d) => d + deg)}>
                                    {deg}deg
                                </button>
                            ))}
                        </div>
                        <div className="mwadmin-legacy-btn-group" role="group" aria-label="Rotate right">
                            <button type="button" className="mwadmin-legacy-rotate-primary" onClick={() => setRotation((d) => d + 90)}>
                                Rotate Right
                            </button>
                            {rotateFine.slice(3).map((deg) => (
                                <button key={`rr${deg}`} type="button" onClick={() => setRotation((d) => d + deg)}>
                                    {deg}deg
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mwadmin-legacy-footer-actions">
                        <button type="button" className="mwadmin-modal-btn ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="button" className="mwadmin-legacy-done-btn" onClick={handleDone}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return node;
    return createPortal(node, document.body);
}
