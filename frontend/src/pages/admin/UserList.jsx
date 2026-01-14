
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { Shield, ShieldAlert, User, CheckCircle, Ban, Settings, X, Check } from 'lucide-react';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                adminService.getUsers(),
                adminService.getRoles()
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load user management data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await adminService.getUsers();
            setUsers(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleBlockToggle = async (user) => {
        if (!window.confirm(`Are you sure you want to ${user.platform_status === 'blocked' ? 'unblock' : 'block'} ${user.username}?`)) return;

        try {
            if (user.platform_status === 'blocked') {
                await adminService.unblockUser(user.id);
            } else {
                await adminService.blockUser(user.id);
            }
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert("Action failed");
        }
    };

    const openRoleModal = (user) => {
        setEditingUser(user);
        setSelectedRoleIds(user.roles?.map(r => r.id) || []);
        setShowRoleModal(true);
    };

    const handleRoleToggle = (roleId) => {
        setSelectedRoleIds(prev =>
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    };

    const saveRoles = async () => {
        if (!editingUser) return;
        try {
            await adminService.assignRoles(editingUser.id, selectedRoleIds);
            setShowRoleModal(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert("Failed to update user roles.");
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading users...</div>;
    if (error) return <div className="container" style={{ color: 'red', padding: '2rem' }}>{error}</div>;

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>User Management</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Manage platform users, block access, and assign administrative roles.</p>
                </div>
                <Button onClick={fetchUsers}>Refresh List</Button>
            </div>

            <Card className="no-padding" style={{ overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>User</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Email</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Roles</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            backgroundColor: '#EEF2FF', color: '#4F46E5', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                        }}>
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{user.first_name} {user.last_name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', color: '#4B5563' }}>{user.email}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500,
                                        backgroundColor: user.platform_status === 'blocked' ? '#FEF2F2' : '#ECFDF5',
                                        color: user.platform_status === 'blocked' ? '#B91C1C' : '#059669',
                                    }}>
                                        {user.platform_status === 'blocked' ? <ShieldAlert size={12} /> : <CheckCircle size={12} />}
                                        {user.platform_status === 'blocked' ? 'Blocked' : 'Active'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {user.is_superuser && (
                                            <span style={{
                                                backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px',
                                                borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px'
                                            }}>
                                                <Shield size={10} /> SUPERUSER
                                            </span>
                                        )}
                                        {user.is_platform_admin && (
                                            <span style={{
                                                backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '2px 8px',
                                                borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px'
                                            }}>
                                                <Shield size={10} /> ADMIN
                                            </span>
                                        )}
                                        {user.roles && user.roles.map(role => (
                                            <span key={role.id} style={{
                                                backgroundColor: '#F3F4F6', color: '#4B5563', padding: '2px 8px',
                                                borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600
                                            }}>
                                                {role.name.toUpperCase()}
                                            </span>
                                        ))}
                                        {(!user.is_superuser && !user.is_platform_admin && (!user.roles || user.roles.length === 0)) && (
                                            <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>No roles assigned</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openRoleModal(user)}
                                            style={{ color: 'var(--color-primary)' }}
                                            title="Assign Roles"
                                        >
                                            <Settings size={14} /> Roles
                                        </Button>
                                        {(!user.is_platform_admin && !user.is_superuser) && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleBlockToggle(user)}
                                                style={{ color: user.platform_status === 'blocked' ? '#059669' : '#EF4444' }}
                                            >
                                                {user.platform_status === 'blocked' ? <CheckCircle size={14} /> : <Ban size={14} />}
                                                {user.platform_status === 'blocked' ? ' Unblock' : ' Block'}
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Role Assignment Modal */}
            {showRoleModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <Card style={{
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Manage User Roles</h2>
                                <p style={{ fontSize: '0.875rem', color: '#64748B' }}>User: <strong style={{ color: 'var(--color-primary)' }}>{editingUser?.username}</strong></p>
                            </div>
                            <button onClick={() => setShowRoleModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: '0.5rem' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', padding: '1.5rem', flexGrow: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {roles.map(role => (
                                    <label key={role.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                        borderRadius: '12px', border: '1px solid #E2E8F0', cursor: 'pointer',
                                        backgroundColor: selectedRoleIds.includes(role.id) ? '#F0F9FF' : 'white',
                                        borderColor: selectedRoleIds.includes(role.id) ? '#BAE6FD' : '#E2E8F0',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '6px',
                                            border: `2px solid ${selectedRoleIds.includes(role.id) ? 'var(--color-primary)' : '#CBD5E1'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: selectedRoleIds.includes(role.id) ? 'var(--color-primary)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}>
                                            {selectedRoleIds.includes(role.id) && <Check size={16} color="white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedRoleIds.includes(role.id)}
                                            onChange={() => handleRoleToggle(role.id)}
                                            style={{ display: 'none' }}
                                        />
                                        <div style={{ flexGrow: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: selectedRoleIds.includes(role.id) ? '#0369A1' : 'var(--color-text-main)' }}>{role.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>{role.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: '0.75rem',
                            borderTop: '1px solid #E2E8F0',
                            padding: '1.25rem 1.5rem',
                            backgroundColor: '#F9FAFB',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px'
                        }}>
                            <Button
                                variant="secondary"
                                onClick={() => setShowRoleModal(false)}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '8px',
                                    fontWeight: 500,
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: 'white'
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={saveRoles}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem 1.5rem',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    transition: 'transform 0.1s active'
                                }}
                            >
                                <Check size={18} /> Update Access
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserList;
