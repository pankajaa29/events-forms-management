import axios from 'axios';

const api = axios.create({
    baseURL: '/api/',
    timeout: 60000, // 60 seconds
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
    uploadImages: async (id, payload) => {
        // ... (Keep existing if needed, but we are moving away) ...
        // For now, I'll keep it to avoid breaking other things, but add new method below
        const token = localStorage.getItem('access_token');
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
        const baseUrl = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';
        const url = `${baseUrl}/api/forms/${id}/upload_images/`;

        const isFormData = payload instanceof FormData;
        const headers = { 'Authorization': `Bearer ${token}`, 'X-CSRFToken': csrfToken };
        if (!isFormData) headers['Content-Type'] = 'application/json';

        const response = await fetch(url, { method: 'POST', headers: headers, body: isFormData ? payload : JSON.stringify(payload) });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    uploadBase64: async (base64String) => {
        // Use 'api' instance to leverage Interceptors (Auto-Refresh Token)
        try {
            console.log("Sending Base64 JSON Payload via Axios...");
            const response = await api.post('upload/', { file_data: base64String });
            console.log("Upload Success:", response.data);
            return response.data;
        } catch (error) {
            console.error("Upload Base64 Error:", error);
            // Axios throws clean error objects usually
            throw error;
        }
    },

    // Legacy/Fallback (FormData - seemingly unstable on this env)
    uploadFile: async (file) => {
        // Redirect to Base64 logic if possible, or fail. 
        // We will change FormEditor to call uploadBase64 directly.
        throw new Error("Use uploadBase64 instead.");
    },
    deleteForm: (id) => api.delete(`forms/${id}/`),

    // Collaboration
    getRoles: () => api.get('roles/'),
    getCollaborators: (id) => api.get(`forms/${id}/collaborators/`),
    inviteCollaborator: (id, email, role) => api.post(`forms/${id}/collaborators/`, { email, role }),
    removeCollaborator: (id, userId) => api.post(`forms/${id}/remove_collaborator/`, { user_id: userId }),

    // Private Access
    getInvitees: (id) => api.get(`forms/${id}/invitees/`),
    addInvitees: (id, emails) => api.post(`forms/${id}/invitees/`, { emails }),
    removeInvitee: (id, email) => api.delete(`forms/${id}/invitees/?email=${encodeURIComponent(email)}`),
};

export const adminService = {
    getUsers: () => api.get('admin/users/'),
    blockUser: (id) => api.patch(`admin/users/${id}/block/`),
    unblockUser: (id) => api.patch(`admin/users/${id}/unblock/`),
    assignRoles: (id, roleIds) => api.post(`admin/users/${id}/assign_roles/`, { role_ids: roleIds }),

    // Role Management
    getRoles: () => api.get('roles/'),
    createRole: (data) => api.post('roles/', data),
    updateRole: (id, data) => api.patch(`roles/${id}/`, data),
    deleteRole: (id) => api.delete(`roles/${id}/`),
    duplicateRole: (id, name, slug) => api.post(`roles/${id}/duplicate/`, { name, slug }),
    getPermissions: () => api.get('roles/permissions/'),
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
