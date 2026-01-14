import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/UI/Card';

const DebugAuth = () => {
    const { user } = useAuth();

    return (
        <div className="container" style={{ marginTop: '2rem' }}>
            <Card>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Auth Debug Info</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <strong>Username:</strong> {user?.username || 'Not Sampled'}
                    </div>
                    <div>
                        <strong>Is Platform Admin:</strong> {user?.is_platform_admin ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                        <strong>Is Superuser:</strong> {user?.is_superuser ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                        <strong>Platform Status:</strong> {user?.platform_status || 'N/A'}
                    </div>
                    <hr style={{ border: '0', borderTop: '1px solid var(--color-border)' }} />
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        <p>If "Is Platform Admin" and "Is Superuser" are both NO, the Admin tabs will not show.</p>
                        <p>LocalStorage values:</p>
                        <pre style={{ background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                            {JSON.stringify({
                                is_platform_admin: localStorage.getItem('is_platform_admin'),
                                is_superuser: localStorage.getItem('is_superuser'),
                                username: localStorage.getItem('username')
                            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DebugAuth;
