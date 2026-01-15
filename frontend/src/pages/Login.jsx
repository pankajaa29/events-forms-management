import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User } from 'lucide-react';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-fill email if passed in query params (from Private Form verification)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            // If the login form was designed for username, we might need adjustments.
            // But typical Django auth uses username. However, user might expect email login.
            // If the system supports email as username, great. If not, we just hint it.
            // For now, let's assume username=email or just prefill if you had an email field.
            // WAIT - This login form ONLY has Username.
            // If standard is username, prefilling email in username field might be wrong unless username==email.
            // Let's sets it anyway as a hint.
            setUsername(emailParam);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError('Invalid username or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-subtle)' }}>
            <Card style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-primary)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
                    }}>
                        <User size={32} />
                    </div>
                    <h1 style={{ color: 'var(--color-primary)', fontSize: '1.75rem' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Sign in to LCCIA Forms</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />

                    {error && (
                        <div style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {loading ? 'Logging in...' : 'Sign In'} <LogIn size={18} />
                    </Button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                    Don't have an account? <Link to={`/signup${location.search}`} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Create Account</Link>
                </div>
            </Card>
        </div>
    );
};

export default Login;
