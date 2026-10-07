// Kết nối tới LDA Tool (Python, deploy riêng trên Vercel - thư mục /Tool)
let waitUntil = null;
try {
  ({ waitUntil } = require('@vercel/functions'));
} catch (e) {
  // Chạy local không cần waitUntil
}

const TOOL_URL = (process.env.LDA_TOOL_URL || '').replace(/\/+$/, '');
const TOOL_SECRET = process.env.LDA_TOOL_SECRET || '';

const callTool = async (method, path, body, timeoutMs = 55000) => {
  if (!TOOL_URL) {
    throw new Error('Chưa cấu hình LDA_TOOL_URL');
  }
  const res = await fetch(`${TOOL_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-tool-secret': TOOL_SECRET
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `LDA Tool lỗi ${res.status}`);
  }
  return data;
};

// Giữ function Vercel sống cho tới khi tác vụ nền chạy xong
const runInBackground = (promise) => {
  const safe = promise.catch((err) => console.error('LDA Tool error:', err.message));
  if (waitUntil) {
    try { waitUntil(safe); } catch (e) { /* không ở trong request Vercel */ }
  }
  return safe;
};

// Gán nhãn tự động cho bài viết; chờ tối đa waitMs rồi để tiếp tục chạy nền
module.exports.autoLabelPosts = (postIds, waitMs = 8000) => {
  if (!TOOL_URL) return Promise.resolve(null);
  const task = runInBackground(callTool('POST', '/api/predict', { postIds: postIds.map(String) }));
  return Promise.race([task, new Promise((resolve) => setTimeout(resolve, waitMs))]);
};

// Báo dữ liệu (bài viết / nhãn) đã thay đổi -> Tool tự huấn luyện lại nếu cần
module.exports.notifyDataChanged = () => {
  if (!TOOL_URL) return;
  runInBackground(callTool('POST', '/api/sync', {}));
};

module.exports.callTool = callTool;
