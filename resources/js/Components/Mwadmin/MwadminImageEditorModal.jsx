import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clampMwadminZoom, exportMwadminImage } from './mwadminImageExport';

const rotateFine = [-15, -30, -45, 15, 30, 45];

function PreviewThumb({ preview, rotate, zoom, offset, width, outW, outH, label }) {
    const aspect = outW / outH;
    const h = width / aspect;
    return (
        <div
            className="mwadmin-category-img-thumb"
            style={{ width, height: h }}
            title={label}
        >
            {preview ? (
                <img
                    src={preview}
                    alt=""
                    className="mwadmin-crop-image"
                    style={{
                        transform: `translate(${offset.x * 0.25}px, ${offset.y * 0.25}px) rotate(${rotate}deg) scale(${zoom})`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        pointerEvents: 'none',
                    }}
                />
            ) : (
                <span className="mwadmin-category-img-thumb-placeholder">
                    {outW}×{outH}
                    <br />
                    NO IMAGE
                </span>
            )}
        </div>
    );
}

/**
 * Advanced image editor: local file + drag-and-drop, pan / zoom / rotate, export to fixed frame.
 */
export default function MwadminImageEditorModal({
    open,
    onClose,
    onApply,
    title,
    outputWidth,
    outputHeight,
    notify,
}) {
    const fileRef = useRef(null);
    const dragRef = useRef(null);
    const [workFile, setWorkFile] = useState(null);
    const [displayUrl, setDisplayUrl] = useState('');
    const [rotate, setRotate] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [opts, setOpts] = useState({ format: 'jpg', quality: 88 });
    const [dragging, setDragging] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const resetTransforms = useCallback(() => {
        setRotate(0);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    const revokeDisplay = useCallback((url) => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }, []);

    const ingestFile = useCallback(
        (file) => {
            if (!file || !file.type.startsWith('image/')) {
                notify?.('Please choose or drop an image file (JPG, PNG, GIF, etc.).', 'Invalid file');
                return;
            }
            setWorkFile(file);
            setDisplayUrl((prev) => {
                if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
            resetTransforms();
        },
        [notify, resetTransforms]
    );

    useEffect(() => {
        if (!open) return;
        setWorkFile(null);
        setDisplayUrl((prev) => {
            if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
            return '';
        });
        resetTransforms();
    }, [open, outputWidth, outputHeight, resetTransforms]);

    useEffect(() => {
        return () => {
            revokeDisplay(displayUrl);
        };
    }, [displayUrl, revokeDisplay]);

    const getPoint = (e) =>
        e.touches && e.touches[0]
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };

    const startDrag = (e) => {
        if (!displayUrl) return;
        if (e.cancelable) e.preventDefault();
        const point = getPoint(e);
        dragRef.current = { startX: point.x, startY: point.y, baseX: offset.x, baseY: offset.y };
        setDragging(true);
    };

    const moveDrag = (e) => {
        const d = dragRef.current;
        if (!d) return;
        if (e.cancelable) e.preventDefault();
        const point = getPoint(e);
        setOffset({
            x: d.baseX + (point.x - d.startX),
            y: d.baseY + (point.y - d.startY),
        });
    };

    const endDrag = () => {
        dragRef.current = null;
        setDragging(false);
    };

    useEffect(() => {
        const onMove = (e) => moveDrag(e);
        const onUp = () => endDrag();
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
    }, []);

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
        if (!workFile) {
            notify?.('Choose or drop an image first.', 'Banner Image');
            return;
        }
        const baseName = title.toLowerCase().includes('box') ? 'box' : 'banner';
        const out = await exportMwadminImage(workFile, rotate, zoom, offset, outputWidth, outputHeight, {
            format: opts.format,
            quality: opts.quality,
            baseName,
        });
        if (!out) {
            notify?.('Could not process the image. Try another file.', 'Error');
            return;
        }
        onApply(out);
        onClose();
    };

    if (!open) return null;

    const node = (
        <div
            className="mwadmin-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="mwadmin-modal-card mwadmin-category-image-modal"
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
                <p className="mwadmin-category-image-modal-hint">
                    Output {outputWidth}×{outputHeight}px — drag image to position, use zoom and rotate. Drag and drop a file
                    anywhere in the editor area.
                </p>

                <div
                    className={`mwadmin-category-image-dropzone ${dragOver ? 'is-dragover' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    <span className="mwadmin-category-image-dropzone-label">Drop image here or use upload</span>
                </div>

                <div className="mwadmin-category-image-local-row">
                    <span>Local upload</span>
                    <input ref={fileRef} type="file" accept="image/*" className="mwadmin-hidden-input" onChange={onPickFile} />
                    <button type="button" className="mwadmin-upload-btn" onClick={() => fileRef.current?.click()}>
                        Choose File
                    </button>
                </div>

                <div className="mwadmin-category-image-editor-body">
                    <div className="mwadmin-crop-shell mwadmin-category-image-crop-shell">
                        <div
                            className={`mwadmin-crop-main mwadmin-category-image-crop-main ${dragging ? 'dragging' : ''}`}
                            onMouseDown={startDrag}
                            onTouchStart={startDrag}
                            onWheel={(e) => {
                                e.preventDefault();
                                setZoom((z) => clampMwadminZoom(z + (e.deltaY > 0 ? -0.08 : 0.08)));
                            }}
                            tabIndex={0}
                        >
                            {displayUrl ? (
                                <img
                                    src={displayUrl}
                                    alt=""
                                    style={{
                                        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotate}deg) scale(${zoom})`,
                                    }}
                                    className="mwadmin-crop-image mwadmin-crop-main-image"
                                />
                            ) : (
                                <div className="mwadmin-category-image-placeholder">
                                    <span>{outputWidth} × {outputHeight}</span>
                                    <small>No image — drop a file or choose one</small>
                                </div>
                            )}
                        </div>
                        <div className="mwadmin-crop-right mwadmin-category-image-previews">
                            <PreviewThumb
                                preview={displayUrl}
                                rotate={rotate}
                                zoom={zoom}
                                offset={offset}
                                width={120}
                                outW={outputWidth}
                                outH={outputHeight}
                                label="Large"
                            />
                            <PreviewThumb
                                preview={displayUrl}
                                rotate={rotate}
                                zoom={zoom}
                                offset={offset}
                                width={88}
                                outW={outputWidth}
                                outH={outputHeight}
                                label="Medium"
                            />
                            <PreviewThumb
                                preview={displayUrl}
                                rotate={rotate}
                                zoom={zoom}
                                offset={offset}
                                width={56}
                                outW={outputWidth}
                                outH={outputHeight}
                                label="Small"
                            />
                        </div>
                    </div>
                </div>

                <div className="mwadmin-zoom-row">
                    <label>Zoom</label>
                    <input
                        type="range"
                        min="0.35"
                        max="4"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(clampMwadminZoom(e.target.value))}
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
                </div>
                <div className="mwadmin-rotate-row">
                    <button type="button" onClick={() => setRotate((d) => d - 90)}>
                        Rotate Left
                    </button>
                    {rotateFine.slice(0, 3).map((deg) => (
                        <button key={`rl${deg}`} type="button" onClick={() => setRotate((d) => d + deg)}>
                            {deg}°
                        </button>
                    ))}
                    <button type="button" onClick={() => setRotate((d) => d + 90)}>
                        Rotate Right
                    </button>
                    {rotateFine.slice(3).map((deg) => (
                        <button key={`rr${deg}`} type="button" onClick={() => setRotate((d) => d + deg)}>
                            +{deg}°
                        </button>
                    ))}
                    <button type="button" onClick={resetTransforms}>
                        Reset
                    </button>
                </div>

                <div className="mwadmin-modal-actions">
                    <button type="button" className="mwadmin-modal-btn ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="mwadmin-modal-btn" onClick={handleDone}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return node;
    return createPortal(node, document.body);
}
