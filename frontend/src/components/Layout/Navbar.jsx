import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, LayoutDashboard, FilePlus, Shield } from 'lucide-react';

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
                <Link to="/" className="navbar-brand" style={{ hideText: 'none', textDecoration: 'none' }}>
                    <LayoutDashboard size={24} /> <span className="mobile-hide">eForms</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    {user ? (
                        <>
                            <NavLink to="/" className="navbar-link">
                                Dashboard
                            </NavLink>
                            {user.is_platform_admin && (
                                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                    <NavLink to="/admin/users" className="navbar-link">
                                        Users
                                    </NavLink>
                                    <NavLink to="/admin/roles" className="navbar-link">
                                        Roles
                                    </NavLink>
                                </div>
                            )}
                            <Link to="/new" className="btn btn-primary" style={{ textDecoration: 'none', marginLeft: 'var(--space-2)', padding: '0.4rem 0.8rem' }}>
                                <FilePlus size={16} /> <span className="mobile-hide">New Form</span>
                            </Link>
                            <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                                    <User size={16} />
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                        {user.first_name ? user.first_name : user.username}
                                    </span>
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
