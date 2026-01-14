
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Users, Link, Trash2 } from 'lucide-react';
import { formService } from '../services/api';
import Button from './UI/Button';
import Input from './UI/Input';

const ShareModal = ({ form, onClose }) => {
    const [activeTab, setActiveTab] = useState('link'); // 'link' or 'collaborators'
    const [copied, setCopied] = useState(false);

    // Collab State
    const [roles, setRoles] = useState([]);
    const [collaborators, setCollaborators] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [loadingCollabs, setLoadingCollabs] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (activeTab === 'collaborators') {
            loadCollabData();
        }
    }, [activeTab]);

    const loadCollabData = async () => {
        setLoadingCollabs(true);
        setError('');
        try {
            const [rolesRes, collabsRes] = await Promise.all([
                formService.getRoles(),
                formService.getCollaborators(form.id)
            ]);
            setRoles(rolesRes.data);
            setCollaborators(collabsRes.data);
            // Set default role if available
            if (rolesRes.data.length > 0) {
                // specific logic to pick 'viewer' if exists, else first
                const defaultRole = rolesRes.data.find(r => r.slug === 'viewer') || rolesRes.data[0];
                setInviteRole(defaultRole.slug);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load collaborators");
        } finally {
            setLoadingCollabs(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;
        try {
            await formService.inviteCollaborator(form.id, inviteEmail, inviteRole);
            setInviteEmail('');
            setError('');
            loadCollabData(); // Reload list
        } catch (err) {
            setError(err.response?.data?.error || "Invite failed");
        }
    };

    const handleRemove = async (userId) => {
        if (!window.confirm("Remove this user?")) return;
        try {
            await formService.removeCollaborator(form.id, userId);
            loadCollabData();
        } catch (err) {
            console.error(err);
            setError("Failed to remove user");
        }
    };

    const handleCopy = () => {
        const shareUrl = `${window.location.origin}/forms/${form.slug || form.id}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareUrl = `${window.location.origin}/forms/${form.slug || form.id}`;

    // Styles
    const overlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    };
    const modalStyle = {
        backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem',
        width: '550px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    };
    const tabStyle = {
        background: 'none', border: 'none', padding: '0.5rem 1rem',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
        color: '#4B5563', fontWeight: 500
    };
    const activeTabStyle = { ...tabStyle, color: '#2563EB', borderBottom: '2px solid #2563EB' };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Share Form</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveTab('link')}
                        style={activeTab === 'link' ? activeTabStyle : tabStyle}
                    >
                        <Link size={16} /> Share Link
                    </button>
                    <button
                        onClick={() => setActiveTab('collaborators')}
                        style={activeTab === 'collaborators' ? activeTabStyle : tabStyle}
                    >
                        <Users size={16} /> Collaborators
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'link' ? (
                    <div>
                        <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
                            Share this link with your respondents to collect responses.
                        </p>
                        <div style={{
                            display: 'flex', gap: '0.5rem', padding: '0.75rem',
                            backgroundColor: '#F3F4F6', borderRadius: '0.5rem',
                            border: '1px solid #E5E7EB', marginBottom: '1.5rem'
                        }}>
                            <input
                                type="text" readOnly value={shareUrl}
                                style={{ flexGrow: 1, border: 'none', background: 'transparent', fontSize: '0.875rem', outline: 'none' }}
                            />
                            <button onClick={handleCopy} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: copied ? '#059669' : '#4B5563'
                            }}>
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={handleCopy}>
                                {copied ? 'Copied!' : 'Copy Link'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
                            Invite users to edit or view this form.
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ flexGrow: 1 }}>
                                <Input
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="Email address"
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                style={{
                                    padding: '0.5rem', borderRadius: '0.375rem',
                                    border: '1px solid #D1D5DB', backgroundColor: 'white'
                                }}
                            >
                                {roles.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                            </select>
                            <Button onClick={handleInvite} disabled={!inviteEmail || loadingCollabs}>
                                Invite
                            </Button>
                        </div>

                        {error && <div style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                        <div className="collab-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {loadingCollabs && collaborators.length === 0 && <p>Loading...</p>}

                            {/* Add Creator manually if we want to show them? Or just collaborators */}
                            <div style={{ padding: '0.75rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <span style={{ fontWeight: 500 }}>{form.creator_username || 'Owner'}</span>
                                    <span style={{ color: '#6B7280', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(Owner)</span>
                                </div>
                            </div>

                            {collaborators.map(c => (
                                <div key={c.id} style={{
                                    padding: '0.75rem', borderBottom: '1px solid #F3F4F6',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 500 }}>{c.user_username}</span>
                                        <span style={{ color: '#6B7280', fontSize: '0.875rem', marginLeft: '0.5rem' }}>({c.role_name})</span>
                                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{c.user_email}</div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(c.user)}
                                        style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                        title="Remove access"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareModal;
