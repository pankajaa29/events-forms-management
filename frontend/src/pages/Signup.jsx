import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, User } from 'lucide-react';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile_number, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth(); // We'll manually login after signup

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // Register
            // We use direct axios here because api.js might have interceptors we don't need or different config
            // But api.js base URL is hardcoded in some places or env vars. 
            // Let's assume we can use the same base URL structure.
            // Using absolute URL based on previous knowledge or relative if proxy.
            // Vite proxy handles /api -> http://127.0.0.1:8000

            const response = await axios.post('/api/register/', {
                username,
                first_name: firstName,
                last_name: lastName,
                email,
                mobile_number,
                password
            });

            // If successful, the backend returns tokens. 
            // We can store them and redirect, OR just redirect to login.
            // The response matches TokenObtainPairView structure loosely but custom in RegisterView.
            // RegisterView returns { refresh, access, user }

            // Let's try to auto-login using the tokens received
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            // We reload or navigate to root to trigger auth check
            window.location.href = '/';

        } catch (err) {
            console.error("Signup failed", err);
            if (err.response && err.response.data) {
                // Formatting Django errors
                const errors = err.response.data;
                let msg = "Signup failed.";
                if (errors.username) msg = `Username: ${errors.username[0]}`;
                else if (errors.email) msg = `Email: ${errors.email[0]}`;
                else if (errors.mobile_number) msg = `Mobile Number: ${errors.mobile_number[0]}`;
                else if (errors.password) msg = `Password: ${errors.password[0]}`;
                else if (typeof errors === 'string') msg = errors;
                setError(msg);
            } else {
                setError('An error occurred during signup. Please try again.');
            }
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
                        <UserPlus size={32} />
                    </div>
                    <h1 style={{ color: 'var(--color-primary)', fontSize: '1.75rem' }}>Create Account</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Join LCCIA Forms Management</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                required
                            />
                        </div>
                    </div>
                    <Input
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />
                    <Input
                        label="Mobile Number"
                        type="tel"
                        value={mobile_number}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="Enter mobile number"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
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
                        {loading ? 'Creating Account...' : 'Sign Up'} <UserPlus size={18} />
                    </Button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Sign In</Link>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Signup;
