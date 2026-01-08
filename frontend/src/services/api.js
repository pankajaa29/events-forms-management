import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth & CSRF Handling
api.interceptors.request.use((config) => {
    // Modify headers for FormData
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    // CSRF
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
        const csrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1];
        if (csrfToken) {
            config.headers['X-CSRFToken'] = csrfToken;
        }
    }

    // JWT
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
});

// Response Interceptor for handling 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized (401) - Logging out...');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('username');
            // Only redirect if not already on login page to avoid loops (though 401 usually implies protected resource)
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const formService = {
    getForms: () => api.get('forms/'),
    getForm: (id) => api.get(`forms/${id}/`),
    createForm: (data) => api.post('forms/', data),
    updateForm: (id, data) => api.patch(`forms/${id}/`, data),
    deleteForm: (id) => api.delete(`forms/${id}/`),
};

export const sectionService = {
    createSection: (data) => api.post('sections/', data),
    updateSection: (id, data) => api.patch(`sections/${id}/`, data),
    deleteSection: (id) => api.delete(`sections/${id}/`),
};

export const questionService = {
    createQuestion: (data) => api.post('questions/', data),
    updateQuestion: (id, data) => api.patch(`questions/${id}/`, data),
    deleteQuestion: (id) => api.delete(`questions/${id}/`),
};

export default api;
