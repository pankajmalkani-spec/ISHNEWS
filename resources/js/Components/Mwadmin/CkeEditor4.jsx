import { useEffect, useRef } from 'react';

const CKEDITOR_SRC = '/assets/global/plugins/ckeditor/ckeditor.js';

function loadCkScript() {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.CKEDITOR) {
            resolve();
            return;
        }
        const existing = document.querySelector(`script[src="${CKEDITOR_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('CKEditor script failed')));
            return;
        }
        const s = document.createElement('script');
        s.src = CKEDITOR_SRC;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('CKEditor script failed'));
        document.head.appendChild(s);
    });
}

/**
 * CKEditor 4 classic — matches legacy news “Text Article” rich text.
 */
export default function CkeEditor4({ value, onChange, height = 420 }) {
    const textareaRef = useRef(null);
    const editorRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await loadCkScript();
            } catch {
                return;
            }
            if (cancelled || !textareaRef.current || editorRef.current) {
                return;
            }
            const el = textareaRef.current;
            editorRef.current = window.CKEDITOR.replace(el, {
                height,
                removePlugins: 'elementspath',
                toolbar: [
                    { name: 'clipboard', items: ['Cut', 'Copy', 'Paste', 'PasteText', '-', 'Undo', 'Redo'] },
                    { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', '-', 'RemoveFormat'] },
                    { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote'] },
                    { name: 'links', items: ['Link', 'Unlink'] },
                    { name: 'insert', items: ['Image', 'Table', 'HorizontalRule'] },
                    { name: 'styles', items: ['Styles', 'Format'] },
                ],
            });
            editorRef.current.setData(value || '');
            editorRef.current.on('change', () => {
                onChangeRef.current(editorRef.current.getData());
            });
        })();

        return () => {
            cancelled = true;
            if (editorRef.current) {
                try {
                    editorRef.current.destroy();
                } catch {
                    /* ignore */
                }
                editorRef.current = null;
            }
        };
    }, [height]);

    useEffect(() => {
        if (!editorRef.current) return;
        const cur = editorRef.current.getData();
        if ((value || '') !== cur) {
            editorRef.current.setData(value || '');
        }
    }, [value]);

    return <textarea ref={textareaRef} className="mwadmin-cke-textarea" defaultValue={value || ''} />;
}
