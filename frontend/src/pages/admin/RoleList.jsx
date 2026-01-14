
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { Shield, Lock, Settings, Plus, Trash2, Copy, Check, X, Info } from 'lucide-react';

const RoleList = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingRole, setEditingRole] = useState(null);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permsRes] = await Promise.all([
                adminService.getRoles(),
                adminService.getPermissions()
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load roles or permissions.");
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await adminService.getRoles();
            setRoles(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateRole = async () => {
        const name = prompt("Enter name for the new role:");
        if (!name) return;
        const slug = prompt("Enter a unique URL-friendly slug (e.g. manager, lead):").toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!slug) return;

        try {
            await adminService.createRole({ name, slug, description: `Custom role: ${name}`, is_system: false });
            fetchRoles();
        } catch (err) {
            console.error(err);
            alert("Creation failed. Slug might already exist or format is invalid.");
        }
    };

    const handleDuplicate = async (role) => {
        const name = prompt("Enter name for the new role:", `Copy of ${role.name}`);
        if (!name) return;
        const slug = prompt("Enter unique slug for the new role:", `${role.slug}_copy`);
        if (!slug) return;

        try {
            await adminService.duplicateRole(role.id, name, slug);
            fetchRoles();
        } catch (err) {
            console.error(err);
            alert("Duplication failed. Slug might already exist.");
        }
    };

    const handleDelete = async (role) => {
        if (role.is_system) {
            alert("System roles cannot be deleted.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the custom role: ${role.name}?`)) return;

        try {
            await adminService.deleteRole(role.id);
            fetchRoles();
        } catch (err) {
            console.error(err);
            alert("Delete failed. This role might still be assigned to users.");
        }
    };

    const openPermissionModal = (role) => {
        setEditingRole(role);
        // Get current permissions (IDs)
        const currentPerms = role.permissions_details?.map(p => p.id) || [];
        setSelectedPermissions(currentPerms);
        setShowPermissionModal(true);
    };

    const handlePermissionToggle = (permId) => {
        setSelectedPermissions(prev =>
            prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
        );
    };

    const savePermissions = async () => {
        if (!editingRole) return;
        try {
            await adminService.updateRole(editingRole.id, { permissions: selectedPermissions });
            setShowPermissionModal(false);
            fetchRoles();
        } catch (err) {
            console.error(err);
            alert("Failed to update permissions.");
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading roles and permissions...</div>;
    if (error) return <div className="container" style={{ color: 'red', padding: '2rem' }}>{error}</div>;

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Access & Role Management</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Define platform-wide logic. Copy system roles to create custom permission sets.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button variant="secondary" onClick={fetchInitialData}>Refresh</Button>
                    <Button onClick={handleCreateRole}>
                        <Plus size={16} /> New Role
                    </Button>
                </div>
            </div>

            <Card className="no-padding" style={{ overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Role Name</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Slug</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Permissions</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(role => (
                            <tr key={role.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.2s' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            backgroundColor: role.is_system ? '#F3F4F6' : '#EEF2FF',
                                            color: role.is_system ? '#6B7280' : '#4F46E5',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {role.is_system ? <Lock size={16} /> : <Settings size={14} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{role.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: {role.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#6B7280' }}>{role.slug}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                                        {role.permissions_details?.length > 0 ? (
                                            role.permissions_details.map(p => (
                                                <span key={p.id} style={{
                                                    fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                                                    backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0'
                                                }}>
                                                    {p.codename.replace('_', ' ')}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>No atomic permissions</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        display: 'inline-flex', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
                                        backgroundColor: role.is_system ? '#F1F5F9' : '#ECFDF5',
                                        color: role.is_system ? '#475569' : '#047857',
                                        textTransform: 'uppercase'
                                    }}>
                                        {role.is_system ? 'System' : 'Custom'}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openPermissionModal(role)}
                                            style={{ color: 'var(--color-primary)', border: 'none', backgroundColor: 'transparent' }}
                                            title="Edit Atomic Permissions"
                                        >
                                            <Shield size={16} />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDuplicate(role)}
                                            style={{ color: '#6366F1', border: 'none', backgroundColor: 'transparent' }}
                                            title="Copy as New Role"
                                        >
                                            <Copy size={16} />
                                        </Button>
                                        {!role.is_system && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleDelete(role)}
                                                style={{ color: '#EF4444', border: 'none', backgroundColor: 'transparent' }}
                                                title="Delete Custom Role"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Permission Management Modal */}
            {showPermissionModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex-between" style={{ paddingBottom: '1rem', borderBottom: '1px solid #E2E8F0' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem' }}>Atomic Permissions: {editingRole?.name}</h2>
                                <p style={{ fontSize: '0.875rem', color: '#64748B' }}>Configure individual platform rights.</p>
                            </div>
                            <button onClick={() => setShowPermissionModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', padding: '1.5rem 0', flexGrow: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {permissions.map(perm => (
                                    <label key={perm.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                        borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer',
                                        backgroundColor: selectedPermissions.includes(perm.id) ? '#F0F9FF' : 'white',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissions.includes(perm.id)}
                                            onChange={() => handlePermissionToggle(perm.id)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{perm.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>{perm.codename}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex-between" style={{
                            padding: '1.25rem 1.5rem',
                            borderTop: '1px solid #E2E8F0',
                            backgroundColor: '#F9FAFB',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.85rem' }}>
                                <Info size={16} />
                                <span style={{ fontWeight: 500 }}>{selectedPermissions.length} permissions selected</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowPermissionModal(false)}
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
                                    onClick={savePermissions}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.625rem 1.5rem',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                                    }}
                                >
                                    <Check size={18} /> Save Changes
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                    <Shield size={20} /> Permission System Architecture
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Atomic permissions (e.g., <code>view_responses</code>, <code>change_form</code>) are the building blocks of security.
                    Roles group these permissions into logical buckets. When you duplicate a role, you create a new bucket
                    pre-filled with the parent's permissions. Use the <Shield size={14} /> icon to fine-tune rights for any role.
                </p>
            </div>
        </div>
    );
};

export default RoleList;
