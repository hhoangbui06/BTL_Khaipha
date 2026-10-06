'use client';
import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { postAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  FiAlignLeft, 
  FiAlignCenter, 
  FiAlignRight, 
  FiTrash2 
} from 'react-icons/fi';

// Global flag to avoid multiple registrations
let customImageBlotRegistered = false;

function registerCustomImageBlot(Quill) {
  if (!Quill || customImageBlotRegistered) return;
  try {
    const BaseImage = Quill.import('formats/image');
    class ResizableImage extends BaseImage {
      static create(value) {
        const src = typeof value === 'object' ? value.url || value.src : value;
        const node = super.create(src);
        if (typeof value === 'object') {
          if (value.width) node.setAttribute('width', value.width);
          if (value.style) node.setAttribute('style', value.style);
        }
        return node;
      }

      static formats(domNode) {
        return {
          width: domNode.getAttribute('width') || domNode.style.width,
          style: domNode.getAttribute('style'),
          class: domNode.getAttribute('class'),
        };
      }

      static value(domNode) {
        return domNode.getAttribute('src');
      }

      format(name, value) {
        if (['width', 'style', 'class'].includes(name)) {
          if (value) {
            this.domNode.setAttribute(name, value);
          } else {
            this.domNode.removeAttribute(name);
          }
        } else {
          super.format(name, value);
        }
      }
    }

    ResizableImage.blotName = 'image';
    ResizableImage.tagName = 'IMG';
    Quill.register(ResizableImage, true);
    customImageBlotRegistered = true;
  } catch (err) {
    console.warn('Could not register custom Quill image blot:', err);
  }
}

export default function QuillEditor({ value, onChange, placeholder = 'Viết nội dung bài viết của bạn tại đây...' }) {
  const quillRef = useRef(null);
  const containerRef = useRef(null);
  
  // Image Resizer state
  const [selectedImg, setSelectedImg] = useState(null);
  const [overlayRect, setOverlayRect] = useState(null);

  const ReactQuill = useMemo(
    () => dynamic(() => import('react-quill'), { 
      ssr: false,
      loading: () => (
        <div style={{
          height: 250,
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          Đang tải trình soạn thảo...
        </div>
      )
    }),
    []
  );

  // Helper to get raw Quill instance safely & register blot
  const getQuillInstance = useCallback(() => {
    let quill = null;
    if (quillRef.current && typeof quillRef.current.getEditor === 'function') {
      quill = quillRef.current.getEditor();
    } else if (quillRef.current?.editor) {
      quill = quillRef.current.editor;
    } else {
      const container = containerRef.current?.querySelector?.('.ql-container');
      if (container?.__quill) {
        quill = container.__quill;
      } else if (typeof document !== 'undefined') {
        const ql = document.querySelector('.ql-container');
        if (ql?.__quill) quill = ql.__quill;
      }
    }

    if (quill?.constructor) {
      registerCustomImageBlot(quill.constructor);
    }
    return quill;
  }, []);

  // Register on mount
  useEffect(() => {
    const ql = containerRef.current?.querySelector('.ql-container')?.__quill;
    if (ql?.constructor) {
      registerCustomImageBlot(ql.constructor);
    }
  }, []);

  // Recalculate overlay rectangle position relative to container
  const updateOverlayRect = useCallback((img) => {
    if (!img || !containerRef.current) return;
    const containerBox = containerRef.current.getBoundingClientRect();
    const imgBox = img.getBoundingClientRect();
    const editorBox = containerRef.current.querySelector('.ql-editor')?.getBoundingClientRect() || containerBox;

    setOverlayRect({
      top: imgBox.top - containerBox.top,
      left: imgBox.left - containerBox.left,
      width: imgBox.width,
      height: imgBox.height,
      currentWidthPercent: Math.round((imgBox.width / editorBox.width) * 100)
    });
  }, []);

  // Process and insert image: instant preview + background upload
  const uploadAndInsertImage = useCallback(async (file, directQuill = null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh chèn bài viết không được vượt quá 5MB');
      return;
    }

    const quill = directQuill || getQuillInstance();
    if (!quill) {
      toast.error('Trình soạn thảo chưa sẵn sàng');
      return;
    }

    // 1. Read as Data URL for INSTANT preview in editor
    const reader = new FileReader();
    reader.onload = async (e) => {
      const tempSrc = e.target.result;
      
      // Focus and get range
      quill.focus();
      const range = quill.getSelection(true);
      const insertIndex = (range && range.index !== undefined) ? range.index : quill.getLength();

      // Insert image immediately so user sees it right in the article
      quill.insertEmbed(insertIndex, 'image', tempSrc, 'user');
      quill.setSelection(insertIndex + 1, 0, 'user');

      // Immediately sync with parent React state
      if (onChange) {
        onChange(quill.root.innerHTML);
      }

      const toastId = toast.loading('Đang xử lý và tối ưu ảnh bài viết...');

      // 2. Upload to Cloudinary in background for permanent hosting & fast CDN
      try {
        const { data } = await postAPI.uploadImage(file);
        if (data.success && data.url) {
          const editorElement = quill.root;
          const images = editorElement.querySelectorAll('img');
          images.forEach((img) => {
            if (img.getAttribute('src') === tempSrc) {
              img.setAttribute('src', data.url);
            }
          });

          if (onChange) {
            onChange(quill.root.innerHTML);
          }
          toast.success('Đã chèn ảnh vào bài viết!', { id: toastId });
        } else {
          toast.success('Đã hiển thị ảnh trong bài viết', { id: toastId });
        }
      } catch (err) {
        console.warn('Cloudinary upload warning, keeping local image in article:', err);
        toast.success('Đã chèn ảnh vào bài viết!', { id: toastId });
      }
    };
    reader.readAsDataURL(file);
  }, [getQuillInstance, onChange]);

  // Toolbar Image button click handler
  const imageHandler = useCallback(function() {
    const toolbarQuill = this.quill;
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        uploadAndInsertImage(file, toolbarQuill);
      }
    };
  }, [uploadAndInsertImage]);

  // Support paste (Ctrl+V) and drag-and-drop of images
  useEffect(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            uploadAndInsertImage(file);
            break;
          }
        }
      }
    };

    const handleDrop = (e) => {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0 && files[0].type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        uploadAndInsertImage(files[0]);
      }
    };

    wrapper.addEventListener('paste', handlePaste);
    wrapper.addEventListener('drop', handleDrop);

    return () => {
      wrapper.removeEventListener('paste', handlePaste);
      wrapper.removeEventListener('drop', handleDrop);
    };
  }, [uploadAndInsertImage]);

  // Track image selection and reposition overlay on click / resize / scroll
  useEffect(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;

    const handleClick = (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.ql-editor')) {
        e.stopPropagation();
        setSelectedImg(e.target);
        updateOverlayRect(e.target);
      } else if (!e.target.closest('.image-resizer-floating-bar') && !e.target.closest('.image-resize-handle')) {
        setSelectedImg(null);
        setOverlayRect(null);
      }
    };

    const handleUpdate = () => {
      if (selectedImg) {
        updateOverlayRect(selectedImg);
      }
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleUpdate);
    const editor = wrapper.querySelector('.ql-editor');
    if (editor) {
      editor.addEventListener('scroll', handleUpdate);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleUpdate);
      if (editor) {
        editor.removeEventListener('scroll', handleUpdate);
      }
    };
  }, [selectedImg, updateOverlayRect]);

  // Apply format to both DOM element and Quill Blot
  const applyImageFormatting = (img, styleUpdates, widthAttr) => {
    if (!img) return;

    // 1. Update DOM style & attribute directly
    Object.assign(img.style, styleUpdates);
    if (widthAttr) {
      img.setAttribute('width', widthAttr);
    }

    // 2. Format Quill blot if found
    const quill = getQuillInstance();
    if (quill?.constructor?.find) {
      const blot = quill.constructor.find(img);
      if (blot) {
        if (widthAttr) blot.format('width', widthAttr);
        blot.format('style', img.getAttribute('style') || '');
      }
    }

    updateOverlayRect(img);

    // 3. Sync React state
    if (quill && onChange) {
      onChange(quill.root.innerHTML);
    }
  };

  // Handlers for Resizing Presets, Alignment & Delete
  const handlePresetSize = (percent) => {
    if (!selectedImg) return;
    applyImageFormatting(
      selectedImg, 
      { width: `${percent}%`, height: 'auto' }, 
      `${percent}%`
    );
  };

  const handleAlign = (align) => {
    if (!selectedImg) return;
    const styleUpdates = {
      display: 'block',
      marginTop: '16px',
      marginBottom: '16px'
    };

    if (align === 'center') {
      styleUpdates.marginLeft = 'auto';
      styleUpdates.marginRight = 'auto';
    } else if (align === 'right') {
      styleUpdates.marginLeft = 'auto';
      styleUpdates.marginRight = '0';
    } else {
      styleUpdates.marginLeft = '0';
      styleUpdates.marginRight = 'auto';
    }

    applyImageFormatting(selectedImg, styleUpdates, selectedImg.getAttribute('width'));
  };

  const handleDeleteImage = () => {
    if (!selectedImg) return;
    selectedImg.remove();
    setSelectedImg(null);
    setOverlayRect(null);

    const quill = getQuillInstance();
    if (quill && onChange) {
      onChange(quill.root.innerHTML);
    }
    toast.success('Đã xóa hình ảnh');
  };

  // Dragging resize handles
  const handleStartDrag = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg || !containerRef.current) return;

    const startX = e.clientX;
    const startWidth = selectedImg.getBoundingClientRect().width;
    const editorBox = containerRef.current.querySelector('.ql-editor')?.getBoundingClientRect();
    const containerWidth = editorBox ? editorBox.width : 800;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = direction === 'left' ? startWidth - deltaX : startWidth + deltaX;
      newWidth = Math.max(80, Math.min(newWidth, containerWidth));
      const percent = Math.round((newWidth / containerWidth) * 100);
      
      selectedImg.style.width = `${percent}%`;
      selectedImg.style.height = 'auto';
      selectedImg.setAttribute('width', `${percent}%`);
      updateOverlayRect(selectedImg);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      applyImageFormatting(
        selectedImg, 
        { width: selectedImg.style.width, height: 'auto' }, 
        selectedImg.getAttribute('width')
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link',
    'image',
  ];

  return (
    <div 
      ref={containerRef}
      className="custom-quill-wrapper" 
      style={{
        position: 'relative',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'visible'
      }}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
      />

      {/* Interactive Image Resizer Overlay and Floating Controls */}
      {selectedImg && overlayRect && (
        <>
          {/* Bounding box outline */}
          <div
            className="image-resizer-box"
            style={{
              position: 'absolute',
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
              height: overlayRect.height,
              border: '2px solid var(--accent-primary, #6366f1)',
              borderRadius: '6px',
              pointerEvents: 'none',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.4)',
              zIndex: 30
            }}
          >
            {/* Corner & Side Handles */}
            <div 
              className="image-resize-handle nw" 
              onMouseDown={(e) => handleStartDrag(e, 'left')}
              title="Kéo để đổi kích thước"
            />
            <div 
              className="image-resize-handle ne" 
              onMouseDown={(e) => handleStartDrag(e, 'right')}
              title="Kéo để đổi kích thước"
            />
            <div 
              className="image-resize-handle sw" 
              onMouseDown={(e) => handleStartDrag(e, 'left')}
              title="Kéo để đổi kích thước"
            />
            <div 
              className="image-resize-handle se" 
              onMouseDown={(e) => handleStartDrag(e, 'right')}
              title="Kéo để đổi kích thước"
            />
            <div 
              className="image-resize-handle e" 
              onMouseDown={(e) => handleStartDrag(e, 'right')}
              title="Kéo để đổi kích thước"
            />
            <div 
              className="image-resize-handle w" 
              onMouseDown={(e) => handleStartDrag(e, 'left')}
              title="Kéo để đổi kích thước"
            />
          </div>

          {/* Floating Toolbar above the image */}
          <div
            className="image-resizer-floating-bar"
            style={{
              position: 'absolute',
              top: Math.max(8, overlayRect.top - 52),
              left: Math.max(10, Math.min(overlayRect.left + (overlayRect.width / 2) - 170, (containerRef.current?.offsetWidth || 800) - 360)),
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '9999px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)',
              color: '#ffffff',
              fontSize: '12px'
            }}
          >
            {/* Quick Size Presets */}
            <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginRight: 2 }}>
              {overlayRect.currentWidthPercent}%
            </span>
            <button
              type="button"
              onClick={() => handlePresetSize(25)}
              className="resize-btn"
              title="25% chiều rộng"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => handlePresetSize(50)}
              className="resize-btn"
              title="50% chiều rộng"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => handlePresetSize(75)}
              className="resize-btn"
              title="75% chiều rộng"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handlePresetSize(100)}
              className="resize-btn"
              title="100% (Đầy đủ)"
            >
              100%
            </button>

            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

            {/* Align Controls */}
            <button
              type="button"
              onClick={() => handleAlign('left')}
              className="resize-btn"
              title="Căn trái"
            >
              <FiAlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleAlign('center')}
              className="resize-btn"
              title="Căn giữa"
            >
              <FiAlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleAlign('right')}
              className="resize-btn"
              title="Căn phải"
            >
              <FiAlignRight size={14} />
            </button>

            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

            {/* Delete button */}
            <button
              type="button"
              onClick={handleDeleteImage}
              className="resize-btn resize-btn-danger"
              title="Xóa hình ảnh"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </>
      )}

      <style jsx global>{`
        .custom-quill-wrapper .ql-toolbar {
          background: var(--bg-card);
          border: none !important;
          border-bottom: 1px solid var(--border-color) !important;
        }
        .custom-quill-wrapper .ql-container {
          border: none !important;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          min-height: 280px;
          color: var(--text-primary);
        }
        .custom-quill-wrapper .ql-editor {
          min-height: 280px;
          line-height: 1.7;
        }
        .custom-quill-wrapper .ql-editor.ql-blank::before {
          color: var(--text-muted);
          font-style: normal;
        }
        .custom-quill-wrapper .ql-editor img {
          max-width: 100%;
          border-radius: var(--radius-md);
          margin: 16px 0;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          display: block;
          cursor: pointer;
          transition: outline 0.15s ease;
        }
        .custom-quill-wrapper .ql-editor img:hover {
          outline: 2px dashed var(--accent-primary, #6366f1);
          outline-offset: 2px;
        }
        .custom-quill-wrapper .ql-stroke {
          stroke: var(--text-secondary) !important;
        }
        .custom-quill-wrapper .ql-fill {
          fill: var(--text-secondary) !important;
        }
        .custom-quill-wrapper .ql-picker {
          color: var(--text-secondary) !important;
        }
        .custom-quill-wrapper .ql-picker-options {
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: var(--radius-sm);
        }
        .custom-quill-wrapper .ql-picker-item:hover {
          color: var(--accent-primary) !important;
        }

        /* Image Resizer Handles */
        .image-resize-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #6366f1;
          border: 2px solid #ffffff;
          border-radius: 2px;
          pointer-events: auto;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s;
        }
        .image-resize-handle:hover {
          transform: scale(1.3);
          background: #4f46e5;
        }
        .image-resize-handle.nw {
          top: -6px;
          left: -6px;
          cursor: nwse-resize;
        }
        .image-resize-handle.ne {
          top: -6px;
          right: -6px;
          cursor: nesw-resize;
        }
        .image-resize-handle.sw {
          bottom: -6px;
          left: -6px;
          cursor: nesw-resize;
        }
        .image-resize-handle.se {
          bottom: -6px;
          right: -6px;
          cursor: nwse-resize;
        }
        .image-resize-handle.e {
          top: 50%;
          right: -6px;
          transform: translateY(-50%);
          cursor: ew-resize;
        }
        .image-resize-handle.w {
          top: 50%;
          left: -6px;
          transform: translateY(-50%);
          cursor: ew-resize;
        }

        /* Quick Action Toolbar Buttons */
        .resize-btn {
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .resize-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .resize-btn-danger:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #f87171;
        }
      `}</style>
    </div>
  );
}
