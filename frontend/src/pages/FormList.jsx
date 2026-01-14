import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formService } from '../services/api';
import { Plus, Edit2, Trash2, FileText, BarChart2, Eye, LayoutGrid, List, CheckCircle } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const FormList = () => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [filterMode, setFilterMode] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const response = await formService.getForms();
            setForms(response.data);
        } catch (error) {
            console.error('Error fetching forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this form?')) {
            try {
                await formService.deleteForm(id);
                fetchForms();
            } catch (error) {
                console.error('Error deleting form:', error);
            }
        }
    };

    const filteredForms = forms.filter(f => {
        if (filterMode === 'owned') return f.my_role === 'owner';
        if (filterMode === 'shared') return f.my_role && f.my_role !== 'owner';
        if (filterMode === 'responded') return f.has_responded;
        return true;
    });

    if (loading) return <div className="loading">Loading forms...</div>;

    return (
        <div className="container">
            <div className="flex-between mobile-stack" style={{ marginBottom: 'var(--space-8)', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>My Forms</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Manage your forms and view results</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', background: '#e5e7eb', borderRadius: '8px', padding: '4px', overflowX: 'auto', maxWidth: '100%' }}>
                        {['all', 'owned', 'shared', 'responded'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setFilterMode(mode)}
                                style={{
                                    background: filterMode === mode ? 'white' : 'transparent',
                                    border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                                    boxShadow: filterMode === mode ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    fontWeight: 500, fontSize: '0.875rem', color: filterMode === mode ? 'black' : '#6B7280',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {mode === 'all' ? 'All' : mode === 'owned' ? 'Owned' : mode === 'shared' ? 'Shared' : 'Responded'}
                            </button>
                        ))}
                    </div>

                    <div className="mobile-hide" style={{ display: 'flex', background: '#e5e7eb', borderRadius: '8px', padding: '4px' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                background: viewMode === 'grid' ? 'white' : 'transparent',
                                border: 'none',
                                padding: '6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} color={viewMode === 'grid' ? '#4F46E5' : '#6B7280'} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                background: viewMode === 'list' ? 'white' : 'transparent',
                                border: 'none',
                                padding: '6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                            title="List View"
                        >
                            <List size={18} color={viewMode === 'list' ? '#4F46E5' : '#6B7280'} />
                        </button>
                    </div>
                    <Link to="/new" style={{ textDecoration: 'none', width: '100%' }} className="mobile-show">
                        <Button style={{ width: '100%' }}>
                            <Plus size={20} /> New Form
                        </Button>
                    </Link>
                    <Link to="/new" style={{ textDecoration: 'none' }} className="mobile-hide">
                        <Button>
                            <Plus size={20} /> Create New Form
                        </Button>
                    </Link>
                </div>
            </div>

            {filteredForms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                        <FileText size={64} />
                    </div>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>No forms found</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                        {filterMode === 'all' ? 'Create your first form to start collecting responses.' : 'Try changing your filter settings.'}
                    </p>
                    {filterMode === 'all' && (
                        <Link to="/edit/new" style={{ textDecoration: 'none' }}>
                            <Button>Create Form</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
                    gap: 'var(--space-6)'
                }}>
                    {filteredForms.map((form) => (
                        <Card key={form.id} className="form-card" style={{
                            display: 'flex',
                            flexDirection: viewMode === 'grid' ? 'column' : 'row',
                            height: '100%',
                            alignItems: viewMode === 'list' ? 'center' : 'stretch',
                            padding: viewMode === 'list' ? 'var(--space-4)' : undefined,
                            gap: viewMode === 'list' ? 'var(--space-6)' : undefined
                        }}>
                            <div style={{
                                flexGrow: 1,
                                marginBottom: viewMode === 'grid' ? 'var(--space-4)' : 0,
                                minWidth: 0 // For text truncation in flex child
                            }}>
                                <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {form.title}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '999px',
                                            backgroundColor: form.is_public ? '#ECFDF5' : '#F3F4F6',
                                            color: form.is_public ? '#059669' : '#4B5563',
                                            border: '1px solid transparent',
                                            borderColor: form.is_public ? '#A7F3D0' : '#E5E7EB'
                                        }}>
                                            {form.is_public ? 'Public' : 'Draft'}
                                        </span>
                                        {form.has_responded && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '999px',
                                                backgroundColor: '#DCFCE7',
                                                color: '#166534',
                                                border: '1px solid #BBF7D0'
                                            }}>
                                                Responded
                                            </span>
                                        )}
                                        {form.my_role && form.my_role !== 'owner' && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '999px',
                                                backgroundColor: '#EEF2FF',
                                                color: '#4F46E5',
                                                border: '1px solid #C7D2FE',
                                                title: `Owner: ${form.creator_username}`
                                            }}>
                                                {form.my_role.charAt(0).toUpperCase() + form.my_role.slice(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
                                    {(() => {
                                        if (!form.description) return 'No description provided.';
                                        // Robust pattern to strip HTML and entities
                                        const tmp = document.createElement("DIV");
                                        tmp.innerHTML = form.description;
                                        return tmp.textContent || tmp.innerText || "";
                                    })()}
                                </p>

                                <div style={{ fontSize: '0.7rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: 'var(--space-2)' }}>
                                    <div><strong>Created:</strong> {new Date(form.created_at).toLocaleString()}</div>
                                    <div><strong>Edited:</strong> {new Date(form.updated_at).toLocaleString()}</div>
                                    {form.published_at && (
                                        <div style={{ color: '#059669' }}><strong>Published:</strong> {new Date(form.published_at).toLocaleString()}</div>
                                    )}
                                    {form.my_role !== 'owner' && (
                                        <div style={{ color: '#4B5563', marginTop: '2px' }}><strong>Owner:</strong> {form.creator_username || 'Unknown'}</div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                borderTop: viewMode === 'grid' ? '1px solid var(--color-border)' : 'none',
                                borderLeft: viewMode === 'list' ? '1px solid var(--color-border)' : 'none',
                                paddingTop: viewMode === 'grid' ? 'var(--space-4)' : 0,
                                paddingLeft: viewMode === 'list' ? 'var(--space-6)' : 0,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    {/* Edit: Owner or Editor */}
                                    {(form.my_role === 'owner' || form.my_role === 'editor') && (
                                        <Link to={`/edit/${form.id}`} style={{ textDecoration: 'none' }}>
                                            <Button variant="secondary" size="sm" style={{ padding: '0.5rem' }} title="Edit">
                                                <Edit2 size={16} />
                                            </Button>
                                        </Link>
                                    )}

                                    {/* Results: Anyone with a role or who responded */}
                                    {(form.my_role || form.has_responded) && (
                                        <Link to={`/forms/${form.id}/results`} style={{ textDecoration: 'none' }}>
                                            <Button variant="secondary" size="sm" style={{ padding: '0.5rem', backgroundColor: form.has_responded && !form.my_role ? '#ECFDF5' : undefined, color: form.has_responded && !form.my_role ? '#059669' : undefined }} title={form.my_role ? "Results" : "My Submission"}>
                                                {form.has_responded && !form.my_role ? <CheckCircle size={16} /> : <BarChart2 size={16} />}
                                                {form.has_responded && !form.my_role && <span style={{ marginLeft: '4px', fontSize: '0.75rem' }} className="mobile-hide">View Submission</span>}
                                            </Button>
                                        </Link>
                                    )}

                                    {/* Preview: Accessible to all */}
                                    <Link to={`/forms/${form.id}`} target="_blank" style={{ textDecoration: 'none' }}>
                                        <Button variant="secondary" size="sm" style={{ padding: '0.5rem' }} title="Preview">
                                            <Eye size={16} />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Delete: Owner only */}
                                {form.my_role === 'owner' && (
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(form.id)} style={{ padding: '0.5rem' }} title="Delete">
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )
            }
        </div >
    );
};

export default FormList;
