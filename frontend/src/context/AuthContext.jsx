import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Log user out if token is expired or missing
        const token = localStorage.getItem('access_token');
        if (token) {
            // In a real app, we'd verify the token or fetch user profile here
            // For now, we'll assume valid if present
            setUser({
                username: localStorage.getItem('username') || 'User',
                first_name: localStorage.getItem('first_name') || '',
                last_name: localStorage.getItem('last_name') || '',
                is_platform_admin: localStorage.getItem('is_platform_admin') === 'true',
                is_superuser: localStorage.getItem('is_superuser') === 'true',
                platform_status: localStorage.getItem('platform_status') || 'active'
            });
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await axios.post('/api/token/', {
                username,
                password
            });
            const { access, refresh, first_name, last_name, username: returnedUsername, is_platform_admin, is_superuser, platform_status } = response.data;
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', returnedUsername);
            localStorage.setItem('first_name', first_name);
            localStorage.setItem('last_name', last_name);
            localStorage.setItem('is_platform_admin', is_platform_admin);
            localStorage.setItem('is_superuser', is_superuser);
            localStorage.setItem('platform_status', platform_status);

            setUser({
                username: returnedUsername,
                first_name,
                last_name,
                is_platform_admin,
                is_superuser,
                platform_status
            });
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        localStorage.removeItem('first_name');
        localStorage.removeItem('last_name');
        localStorage.removeItem('is_platform_admin');
        localStorage.removeItem('is_superuser');
        localStorage.removeItem('platform_status');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
