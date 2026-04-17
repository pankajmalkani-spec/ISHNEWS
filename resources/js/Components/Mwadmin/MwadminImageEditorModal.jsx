import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const rotateFine = [-15, -30, -45, 15, 30, 45];
const MIN_ZOOM_MULTIPLIER = 0.4;
const MAX_ZOOM_MULTIPLIER = 3;
const DEFAULT_ZOOM_MULTIPLIER = 1;

function clampZoom(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return DEFAULT_ZOOM_MULTIPLIER;
    return Math.min(MAX_ZOOM_MULTIPLIER, Math.max(MIN_ZOOM_MULTIPLIER, n));
}

function canvasToFile(canvas, baseName, format, quality) {
    return new Promise((resolve) => {
        const usePng = format === 'png';
        const mime = usePng ? 'image/png' : 'image/jpeg';
        const ext = usePng ? 'png' : 'jpg';
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                resolve(new File([blob], `${baseName}_${Date.now()}.${ext}`, { type: mime }));
            },
            mime,
            usePng ? undefined : Math.min(1, Math.max(0.4, Number(quality || 92) / 100))
        );
    });
}

function canvasToObjectUrl(canvas, format, quality) {
    return new Promise((resolve) => {
        const usePng = format === 'png';
        const mime = usePng ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    resolve('');
                    return;
                }
                resolve(URL.createObjectURL(blob));
            },
            mime,
            usePng ? undefined : Math.min(1, Math.max(0.4, Number(quality || 92) / 100))
        );
    });
}

/**
 * Legacy assets/global/plugins/cropper/cropper.css — .preview-lg / .preview-md / .preview-sm
 * Square boxes (not export aspect). Matches Metronic cropper modals (col-md-9 stage + col-md-3 previews).
 */
const IMAGE_EDITOR_PREVIEW_BOX_SIZES = [184, 100, 50];
const IMAGE_EDITOR_PREVIEW_SIZE_CLASS = [
    'mwadmin-legacy-cropper-preview--lg',
    'mwadmin-legacy-cropper-preview--md',
    'mwadmin-legacy-cropper-preview--sm',
];

function LegacyPreviewPlaceholder({ outW, outH, boxSize, caption, sizeClass }) {
    return (
        <figure className="mwadmin-legacy-preview-empty">
            <div
                className={`mwadmin-legacy-cropper-preview mwadmin-legacy-preview-placeholder-inner ${sizeClass || ''}`}
                style={{ width: boxSize, height: boxSize }}
            >
                <span className="mwadmin-legacy-preview-empty-primary">NO IMAGE AVAILABLE</span>
                <span className="mwadmin-legacy-preview-empty-dim">
                    {outW} × {outH}px
                </span>
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
    placeholderBlurb: _placeholderBlurb = 'IMAGE GOES HERE',
    initialImageFile = null,
    initialImageUrl = null,
}) {
    const fileInputId = useId();
    const fileRef = useRef(null);
    const cropperRef = useRef(null);
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
    const [zoom, setZoom] = useState(DEFAULT_ZOOM_MULTIPLIER);
    const [rotation, setRotation] = useState(0);
    const [opts, setOpts] = useState({ format: 'jpg', quality: 92 });
    const [dragOver, setDragOver] = useState(false);
    const [cropperReady, setCropperReady] = useState(false);
    const baseZoomRef = useRef(1);

    // Legacy avatar_category.js / cropper: square crop box; export size is separate (canvas).
    const editorAspect = 1;
    /** Legacy .avatar-wrapper { height: 364px } — main stage beside col-md-3 previews */
    const stageHeight = 364;
    const initialCropArea = 0.8;

    const revokeModalBlob = useCallback(() => {
        if (modalOwnedBlobRef.current) {
            URL.revokeObjectURL(modalOwnedBlobRef.current);
            modalOwnedBlobRef.current = null;
        }
    }, []);

    const resetCropState = useCallback(() => {
        setZoom(DEFAULT_ZOOM_MULTIPLIER);
        setRotation(0);
        setCropperReady(false);
    }, []);

    const ingestFile = useCallback(
        (file) => {
            if (!file || !file.type.startsWith('image/')) {
                notify?.('Please choose or drop an image file (JPG, PNG, GIF, etc.).', 'error');
                return;
            }
            editingSourceFileRef.current = file;
            revokeModalBlob();
            const u = URL.createObjectURL(file);
            modalOwnedBlobRef.current = u;
            setDisplayUrl(u);
            setCropperReady(false);
            setZoom(DEFAULT_ZOOM_MULTIPLIER);
            setRotation(0);
        },
        [notify, resetCropState, revokeModalBlob]
    );

    ingestFileRef.current = ingestFile;

    useEffect(() => {
        if (!open) {
            revokeModalBlob();
            editingSourceFileRef.current = null;
            setDisplayUrl('');
            resetCropState();
            return;
        }

        const file = initialFileRef.current;
        const url = initialUrlRef.current;

        if (file && file.type?.startsWith('image/')) {
            ingestFileRef.current?.(file);
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
        const cropper = cropperRef.current?.cropper;
        if (!cropper || !cropperReady) {
            notify?.('Wait for the image to load, then adjust the crop box.', 'error');
            return;
        }
        const baseName = title.toLowerCase().includes('box') ? 'box' : 'banner';
        const canvas = cropper.getCroppedCanvas({
            width: outputWidth,
            height: outputHeight,
            fillColor: opts.format === 'png' ? 'transparent' : '#ffffff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        if (!canvas) {
            notify?.('Could not export the image. Try another file.', 'error');
            return;
        }
        const out = await canvasToFile(canvas, baseName, opts.format, opts.quality);
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

    const previewBoxSizes = IMAGE_EDITOR_PREVIEW_BOX_SIZES;
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
                        <span className="mwadmin-image-editor-output-note">
                            {' '}
                            (Done exports this size; L/M/S are square crop previews like legacy.)
                        </span>
                    </p>
                </div>

                <div
                    className={`mwadmin-legacy-editor-columns ${dragOver ? 'is-dragover' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    <div className="mwadmin-legacy-stage-column">
                        <div
                            className={`mwadmin-easy-crop-stage ${dragOver ? 'is-dragover' : ''}`}
                            style={{
                                height: stageHeight,
                                width: '100%',
                                maxWidth: '100%',
                            }}
                        >
                            {displayUrl ? (
                                <Cropper
                                    ref={cropperRef}
                                    src={displayUrl}
                                    style={{ width: '100%', height: '100%' }}
                                    aspectRatio={editorAspect}
                                    viewMode={0}
                                    dragMode="crop"
                                    autoCropArea={initialCropArea}
                                    guides
                                    center
                                    background
                                    responsive
                                    restore={false}
                                    checkCrossOrigin={false}
                                    checkOrientation={false}
                                    cropBoxMovable
                                    cropBoxResizable
                                    toggleDragModeOnDblclick={false}
                                    zoomOnTouch
                                    zoomOnWheel
                                    preview=".mwadmin-live-preview-target"
                                    ready={() => {
                                        const cropper = cropperRef.current?.cropper;
                                        if (!cropper) return;
                                        const base = cropper.getImageData()?.ratio || 1;
                                        baseZoomRef.current = base > 0 ? base : 1;
                                        cropper.rotateTo(0);
                                        setZoom(1);
                                        setCropperReady(true);
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
                        {previewBoxSizes.map((box, i) =>
                            displayUrl ? (
                                <figure key={`pv-${box}-${i}`} className="mwadmin-category-export-preview mwadmin-legacy-export-preview">
                                    <div
                                        className={`mwadmin-category-export-preview-frame mwadmin-export-preview-frame--aspect mwadmin-live-preview-target mwadmin-legacy-cropper-preview ${IMAGE_EDITOR_PREVIEW_SIZE_CLASS[i] || ''}`}
                                        style={{
                                            width: box,
                                            height: box,
                                        }}
                                    />
                                    <figcaption className="mwadmin-category-export-preview-caption">{previewLabels[i]}</figcaption>
                                </figure>
                            ) : (
                                <LegacyPreviewPlaceholder
                                    key={`ph-${box}-${i}`}
                                    outW={outputWidth}
                                    outH={outputHeight}
                                    boxSize={box}
                                    caption={previewLabels[i]}
                                    sizeClass={IMAGE_EDITOR_PREVIEW_SIZE_CLASS[i]}
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
                            min={MIN_ZOOM_MULTIPLIER}
                            max={MAX_ZOOM_MULTIPLIER}
                            step="0.02"
                            value={zoom}
                            onChange={(e) => {
                                const next = clampZoom(e.target.value);
                                setZoom(next);
                                const cropper = cropperRef.current?.cropper;
                                if (cropper) {
                                    cropper.zoomTo(baseZoomRef.current * next);
                                }
                            }}
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
                                onChange={(e) =>
                                    setOpts((o) => ({ ...o, quality: Math.max(40, Math.min(100, Number(e.target.value) || 92)) }))
                                }
                            />
                        </label>
                        <button
                            type="button"
                            className="mwadmin-modal-btn ghost"
                            onClick={() => {
                                const cropper = cropperRef.current?.cropper;
                                if (cropper) {
                                    cropper.reset();
                                    cropper.rotateTo(0);
                                    const base = cropper.getImageData()?.ratio || 1;
                                    baseZoomRef.current = base > 0 ? base : 1;
                                }
                                setZoom(1);
                                setRotation(0);
                            }}
                        >
                            Reset crop
                        </button>
                    </div>
                </details>

                <div className="mwadmin-legacy-footer">
                    <div className="mwadmin-legacy-rotate-wrap">
                        <div className="mwadmin-legacy-btn-group" role="group" aria-label="Rotate left">
                            <button
                                type="button"
                                className="mwadmin-legacy-rotate-primary"
                                onClick={() => {
                                    const cropper = cropperRef.current?.cropper;
                                    const next = rotation - 90;
                                    setRotation(next);
                                    if (cropper) {
                                        cropper.rotateTo(next);
                                    }
                                }}
                            >
                                Rotate Left
                            </button>
                            {rotateFine.slice(0, 3).map((deg) => (
                                <button
                                    key={`rl${deg}`}
                                    type="button"
                                    onClick={() => {
                                        const cropper = cropperRef.current?.cropper;
                                        const next = rotation + deg;
                                        setRotation(next);
                                        if (cropper) {
                                            cropper.rotateTo(next);
                                        }
                                    }}
                                >
                                    {deg}deg
                                </button>
                            ))}
                        </div>
                        <div className="mwadmin-legacy-btn-group" role="group" aria-label="Rotate right">
                            <button
                                type="button"
                                className="mwadmin-legacy-rotate-primary"
                                onClick={() => {
                                    const cropper = cropperRef.current?.cropper;
                                    const next = rotation + 90;
                                    setRotation(next);
                                    if (cropper) {
                                        cropper.rotateTo(next);
                                    }
                                }}
                            >
                                Rotate Right
                            </button>
                            {rotateFine.slice(3).map((deg) => (
                                <button
                                    key={`rr${deg}`}
                                    type="button"
                                    onClick={() => {
                                        const cropper = cropperRef.current?.cropper;
                                        const next = rotation + deg;
                                        setRotation(next);
                                        if (cropper) {
                                            cropper.rotateTo(next);
                                        }
                                    }}
                                >
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
