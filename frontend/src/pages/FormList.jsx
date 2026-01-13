import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formService } from '../services/api';
import { Plus, Edit2, Trash2, FileText, BarChart2, Eye } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const FormList = () => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
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

    if (loading) return <div className="loading">Loading forms...</div>;

    return (
        <div className="container">
            <div className="flex-between" style={{ marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>My Forms</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Manage your forms and view results</p>
                </div>
                <Link to="/new" style={{ textDecoration: 'none' }}>
                    <Button>
                        <Plus size={20} /> Create New Form
                    </Button>
                </Link>
            </div>

            {forms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                        <FileText size={64} />
                    </div>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>No forms yet</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>Create your first form to start collecting responses.</p>
                    <Link to="/edit/new" style={{ textDecoration: 'none' }}>
                        <Button>Create Form</Button>
                    </Link>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 'var(--space-6)'
                }}>
                    {forms.map((form) => (
                        <Card key={form.id} className="form-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flexGrow: 1, marginBottom: 'var(--space-4)' }}>
                                <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {form.title}
                                    </h3>
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
                                </div>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {form.description ? form.description.replace(/<[^>]*>?/gm, '') : 'No description provided.'}
                                </p>
                            </div>

                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <Link to={`/edit/${form.id}`} style={{ textDecoration: 'none' }}>
                                        <Button variant="secondary" size="sm" style={{ padding: '0.5rem' }} title="Edit">
                                            <Edit2 size={16} />
                                        </Button>
                                    </Link>
                                    <Link to={`/forms/${form.id}/results`} style={{ textDecoration: 'none' }}>
                                        <Button variant="secondary" size="sm" style={{ padding: '0.5rem' }} title="Results">
                                            <BarChart2 size={16} />
                                        </Button>
                                    </Link>
                                    <Link to={`/forms/${form.id}`} target="_blank" style={{ textDecoration: 'none' }}>
                                        <Button variant="secondary" size="sm" style={{ padding: '0.5rem' }} title="Preview">
                                            <Eye size={16} />
                                        </Button>
                                    </Link>
                                </div>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(form.id)} style={{ padding: '0.5rem' }} title="Delete">
                                    <Trash2 size={16} />
                                </Button>
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
