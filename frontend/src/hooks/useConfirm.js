'use client';
import { useState, useRef, useCallback } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

// Thay thế window.confirm bằng hộp thoại ConfirmDialog.
// Cách dùng:
//   const [askConfirm, confirmElement] = useConfirm();
//   if (!(await askConfirm({ title, message, confirmText, danger: true }))) return;
//   ... và render {confirmElement} trong JSX.
export default function useConfirm() {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const askConfirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolverRef.current?.(false); // hộp thoại cũ (nếu có) coi như bị hủy
        resolverRef.current = resolve;
        setOptions(opts);
      }),
    []
  );

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirmElement = (
    <ConfirmDialog
      {...(options || {})}
      open={!!options}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return [askConfirm, confirmElement];
}
