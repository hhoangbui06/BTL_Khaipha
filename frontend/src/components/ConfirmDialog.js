'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

// Hộp thoại xác nhận (thay cho window.confirm): tự focus, giữ focus bên trong,
// Esc / bấm nền để hủy, khóa cuộn trang phía sau.
// Render qua portal vào <body> để không bị ảnh hưởng bởi transform của phần tử cha.
export default function ConfirmDialog({
  open,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger = false,
  loading = false,
  onConfirm,
  onCancel
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const loadingRef = useRef(loading);
  const onCancelRef = useRef(onCancel);
  loadingRef.current = loading;
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!loadingRef.current) onCancelRef.current?.();
        return;
      }
      // Giữ phím Tab chỉ di chuyển giữa các nút trong hộp thoại
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button:not([disabled])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        className="modal-content confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="modal-header">
          <h3 id="confirm-dialog-title" className="modal-title">{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Đóng"
          >
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <p id="confirm-dialog-message" className="confirm-dialog-message">{message}</p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
