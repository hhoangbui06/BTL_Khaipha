import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });

          if (data.success) {
            Cookies.set('accessToken', data.data.accessToken, { expires: 7 });
            Cookies.set('refreshToken', data.data.refreshToken, { expires: 30 });
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin-login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateProfile: (data) => api.patch('/auth/update-profile', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
  updateAvatar: (formData) => api.patch('/auth/update-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getUserProfile: (id) => api.get(`/auth/user/${id}`),
};

// Posts API
export const postAPI = {
  getAll: (params) => api.get('/posts', { params }),
  getBySlug: (slug) => api.get(`/posts/slug/${slug}`),
  getById: (id) => api.get(`/posts/${id}`),
  getSuggestions: (q) => api.get('/posts/suggestions', { params: { q } }),
  getUserPosts: (userId, params) => api.get(`/posts/user/${userId}`, { params }),
  create: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/posts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  share: (id, note) => api.post(`/posts/${id}/share`, { note }),
  unshare: (id) => api.delete(`/posts/${id}/share`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Comments API
export const commentAPI = {
  getByPost: (postId, params) => api.get(`/comments/post/${postId}`, { params }),
  create: (data) => api.post('/comments', data),
  update: (id, content) => api.put(`/comments/${id}`, { content }),
  delete: (id) => api.delete(`/comments/${id}`),
  toggleLike: (id) => api.post(`/comments/${id}/like`),
};

// Labels API
export const labelAPI = {
  getAll: () => api.get('/labels'),
  create: (data) => api.post('/labels', data),
  update: (id, data) => api.put(`/labels/${id}`, data),
  delete: (id) => api.delete(`/labels/${id}`),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPosts: (params) => api.get('/admin/posts', { params }),
  updatePost: (id, data) => api.put(`/admin/posts/${id}`, data),
  deletePost: (id) => api.delete(`/admin/posts/${id}`),
  getComments: (params) => api.get('/admin/comments', { params }),
  deleteComment: (id) => api.delete(`/admin/comments/${id}`),
  getUserProfile: (id) => api.get(`/admin/profile/${id}`),
  getRolePermissions: () => api.get('/admin/roles/permissions'),
  updateRolePermissions: (permissions) => api.patch('/admin/roles/permissions', { permissions }),
};
