import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ACCEPT = 'video/mp4,video/quicktime,video/x-msvideo,video/x-flv,.mp4,.avi,.mov,.flv,.asf';

/**
 * Modal for manual news video upload (legacy `public/videos/`).
 * Mirrors the image editor flow: pick / preview / apply — no re-encode (browser preview only).
 */
export default function MwadminVideoUploadModal({
    open,
    onClose,
    onApply,
    title = 'Video upload',
    pendingFile = null,
    serverVideoUrl = '',
    maxBytes = 500 * 1024 * 1024,
    notify,
}) {
    const fileInputId = useId();
    const fileRef = useRef(null);
    const blobRef = useRef(null);

    const [localFile, setLocalFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const revokeBlob = useCallback(() => {
        if (blobRef.current) {
            URL.revokeObjectURL(blobRef.current);
            blobRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!open) {
            revokeBlob();
            setLocalFile(null);
            setPreviewUrl('');
            setDragOver(false);
            return;
        }
        if (pendingFile instanceof File) {
            setLocalFile(pendingFile);
            revokeBlob();
            const u = URL.createObjectURL(pendingFile);
            blobRef.current = u;
            setPreviewUrl(u);
            return;
        }
        setLocalFile(null);
        revokeBlob();
        setPreviewUrl(typeof serverVideoUrl === 'string' && serverVideoUrl.trim() ? serverVideoUrl.trim() : '');
    }, [open, pendingFile, serverVideoUrl, revokeBlob]);

    const ingestFile = useCallback(
        (file) => {
            if (!file || !file.type.startsWith('video/')) {
                notify?.('Please choose a video file (MP4, MOV, AVI, FLV, etc.).', 'error');
                return;
            }
            if (file.size > maxBytes) {
                notify?.(`Video must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller.`, 'error');
                return;
            }
            setLocalFile(file);
            revokeBlob();
            const u = URL.createObjectURL(file);
            blobRef.current = u;
            setPreviewUrl(u);
        },
        [maxBytes, notify, revokeBlob]
    );

    const onPickFile = (e) => {
        const file = e.target.files?.[0] || null;
        e.target.value = '';
        if (file) ingestFile(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) ingestFile(file);
    };

    const handleApply = () => {
        if (localFile) {
            onApply?.(localFile);
        }
        onClose();
    };

    const handleRemove = () => {
        revokeBlob();
        setLocalFile(null);
        setPreviewUrl('');
        onApply?.(null);
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
                className="mwadmin-modal-card mwadmin-video-upload-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${fileInputId}-title`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="mwadmin-video-upload-modal-head">
                    <h3 id={`${fileInputId}-title`}>{title}</h3>
                    <button type="button" className="mwadmin-category-image-modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="mwadmin-video-upload-modal-body">
                    <div className="mwadmin-video-upload-toolbar">
                        <input
                            id={fileInputId}
                            ref={fileRef}
                            type="file"
                            accept={ACCEPT}
                            className="mwadmin-hidden-input"
                            onChange={onPickFile}
                        />
                        <button type="button" className="mwadmin-upload-btn" onClick={() => fileRef.current?.click()}>
                            Choose video file
                        </button>
                        {previewUrl ? (
                            <button type="button" className="mwadmin-modal-btn ghost" onClick={handleRemove}>
                                Remove video
                            </button>
                        ) : null}
                    </div>
                    <p className="mwadmin-video-upload-hint">
                        Allowed: MP4, MOV, AVI, FLV, ASF — max {Math.round(maxBytes / 1024 / 1024)}MB. File is stored as on the
                        legacy site under <code>/videos/</code>.
                    </p>

                    <div
                        className={`mwadmin-video-upload-drop ${dragOver ? 'is-dragover' : ''}`}
                        onDrop={onDrop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                    >
                        {previewUrl ? (
                            <video
                                key={previewUrl}
                                className="mwadmin-video-upload-preview"
                                src={previewUrl}
                                controls
                                playsInline
                                preload="metadata"
                            />
                        ) : (
                            <div className="mwadmin-video-upload-empty">Drop a video here or use Choose video file.</div>
                        )}
                    </div>
                </div>

                <div className="mwadmin-video-upload-modal-footer">
                    <button type="button" className="mwadmin-modal-btn ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="mwadmin-legacy-done-btn" onClick={handleApply}>
                        {localFile ? 'Use this video' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return node;
    return createPortal(node, document.body);
}
