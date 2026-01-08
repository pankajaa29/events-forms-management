import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, LayoutDashboard, FilePlus } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const logoutUser = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="container flex-between">
                <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
                    <LayoutDashboard size={24} /> LCCIA Forms
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    {user ? (
                        <>
                            <Link to="/" className="btn btn-text" style={{ textDecoration: 'none', color: 'var(--color-text-main)' }}>
                                Dashboard
                            </Link>
                            <Link to="/edit/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                                <FilePlus size={16} /> New Form
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                                    <User size={16} />
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{user.username}</span>
                                </div>
                                <button className="btn-icon" onClick={logoutUser} title="Logout">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
