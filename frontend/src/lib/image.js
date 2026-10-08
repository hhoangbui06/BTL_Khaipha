// Giới hạn body request của Vercel Functions là 4.5MB -> nén ảnh trước khi upload
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const MAX_DIMENSION = 1600;
const COMPRESS_THRESHOLD = 1024 * 1024;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được file ảnh'));
    };
    img.src = url;
  });

// Thu nhỏ ảnh lớn về tối đa 1600px và nén JPEG; ảnh nhỏ/GIF giữ nguyên
export async function compressImage(file, quality = 0.85) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  if (scale === 1 && file.size <= COMPRESS_THRESHOLD) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // nền trắng cho ảnh PNG trong suốt khi chuyển sang JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}
