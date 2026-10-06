'use client';

import { Toaster, ToastBar, toast } from 'react-hot-toast';

export default function CustomToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#16163a',
          color: '#f1f5f9',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    >
      {(t) => (
        <div
          onClick={() => toast.dismiss(t.id)}
          className="custom-toast-container"
          style={{
            cursor: 'pointer',
          }}
          title="Nhấp để đóng"
        >
          <ToastBar
            toast={t}
            style={{
              ...t.style,
              cursor: 'pointer',
              animation: t.visible
                ? 'toastSlideInRight 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards'
                : 'toastSlideOutRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          >
            {({ icon, message }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {icon}
                <div style={{ flex: 1 }}>{message}</div>
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    opacity: 0.5,
                    lineHeight: 1,
                  }}
                  title="Đóng"
                >
                  ✕
                </span>
              </div>
            )}
          </ToastBar>
        </div>
      )}
    </Toaster>
  );
}
