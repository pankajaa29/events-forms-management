import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Send, CheckCircle } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const getImageUrl = (url) => {
    return url;
};

const FormViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchForm();
    }, [id]);

    const fetchForm = async () => {
        try {
            const response = await api.get(`forms/${id}/`);
            setForm(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching form:', error);
            setError('Form not found or unavailable.');
            setLoading(false);
        }
    };

    const handleInputChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const responsePayload = {
            form: parseInt(id),
            answers: Object.entries(answers).map(([qId, val]) => ({
                question: parseInt(qId),
                value: String(val)
            }))
        };

        try {
            await api.post('responses/', responsePayload);
            setSubmitted(true);
        } catch (error) {
            console.error('Submission error:', error);
            const detail = error.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const checkLogic = (question) => {
        if (!question.logic_rules || !question.logic_rules.condition) return true;
        const { question_id, operator, value } = question.logic_rules.condition;
        if (!question_id) return true;

        const targetValue = answers[question_id];
        const strAnswer = String(targetValue || '');
        const strValue = String(value || '').trim();

        // Split answer by comma and trim to handle multi-select values
        const answerParts = strAnswer.split(',').map(s => s.trim());
        const isMatch = answerParts.includes(strValue);

        // console.log(`Logic: [Q${question.id}] depends on [Q${question_id}]. Ans: "${strAnswer}" vs Val: "${strValue}". Match: ${isMatch}`);

        if (operator === 'equals') return isMatch;
        if (operator === 'not_equals') return !isMatch;
        return true;
    };

    if (loading) return <div className="loading">Loading form...</div>;
    if (error) return <div className="container" style={{ marginTop: '2rem', textAlign: 'center' }}><Card>{error}</Card></div>;

    // Check for Inactivation / Expiration
    const isExpired = form && form.expiry_at && new Date() > new Date(form.expiry_at);
    if (form && (!form.is_active || isExpired)) {
        return (
            <div className="container" style={{ marginTop: '4rem', textAlign: 'center', maxWidth: '600px' }}>
                <Card style={{ borderTop: `4px solid ${form.primary_color || '#6366F1'}` }}>
                    <h2 style={{ marginBottom: 'var(--space-4)', color: '#EF4444' }}>Form Closed</h2>
                    <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-muted)' }}>
                        {form.inactive_message || "This form is no longer accepting responses."}
                    </p>
                </Card>
            </div>
        );
    }

    // Check if user has already responded (and multiple responses are not allowed)
    if (form && form.has_responded && !form.allow_multiple_responses) {
        return (
            <div className="container" style={{ marginTop: '4rem', textAlign: 'center', maxWidth: '600px' }}>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <CheckCircle size={64} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>You've already responded</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>You can only fill out this form once.</p>
                    <Button variant="secondary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>Back to Home</Button>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="container" style={{ marginTop: '4rem', textAlign: 'center', maxWidth: '600px' }}>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <CheckCircle size={64} style={{ color: 'var(--color-success)' }} />
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Thank you!</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Your response has been successfully recorded.</p>
                    {form.allow_multiple_responses && (
                        <Button onClick={() => window.location.reload()}>Submit Another Response</Button>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            paddingBottom: '4rem',
            backgroundColor: form.background_color || '#F8FAFC',
            backgroundImage: form.background_image ? `url(${getImageUrl(form.background_image)})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            <div className="container" style={{ maxWidth: '800px', paddingTop: '2rem' }}>

                {/* Logo */}
                {form.logo_image && (
                    <div style={{
                        display: 'flex',
                        justifyContent: form.logo_alignment === 'left' ? 'flex-start' : (form.logo_alignment === 'right' ? 'flex-end' : 'center'),
                        marginBottom: '2rem'
                    }}>
                        <img
                            src={getImageUrl(form.logo_image)}
                            alt="Logo"
                            style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain' }}
                        />
                    </div>
                )}

                <div style={{
                    backgroundColor: form.primary_color || 'var(--color-primary)',
                    color: 'white',
                    padding: 'var(--space-8)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-8)',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <h1 style={{ margin: '0 0 0.5rem 0' }}>{form.title}</h1>
                    <div
                        style={{ opacity: 0.9, lineHeight: '1.6', overflowWrap: 'break-word', wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: form.description }}
                    />
                </div>

                <form onSubmit={handleSubmit}>
                    {form.sections.map(section => (
                        <div key={section.id} style={{ marginBottom: 'var(--space-8)' }}>
                            <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                                <h3 style={{ fontSize: '1.25rem', color: form.primary_color || 'var(--color-primary)', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                    {section.title}
                                </h3>
                                {section && section.description && <p style={{ color: 'var(--color-text-muted)' }}>{section.description}</p>}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                {section.questions.map(question => (
                                    checkLogic(question) && (
                                        <Card key={question.id} style={{ padding: 'var(--space-6)', borderTop: `4px solid ${form.primary_color || 'transparent'}` }}>
                                            <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 500, marginBottom: 'var(--space-3)' }}>
                                                {question.text}
                                                {question.is_required && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
                                            </label>

                                            {/* Input Types */}
                                            {['short_text', 'email', 'url', 'numeric', 'phone'].includes(question.question_type) && (
                                                <input
                                                    type={question.question_type === 'numeric' || question.question_type === 'phone' ? 'number' : question.question_type}
                                                    className="full-width"
                                                    required={question.is_required}
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                    style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                />
                                            )}

                                            {question.question_type === 'long_text' && (
                                                <textarea
                                                    rows="3"
                                                    required={question.is_required}
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                    style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                />
                                            )}

                                            {['date', 'time', 'datetime'].includes(question.question_type) && (
                                                <input
                                                    type={question.question_type === 'time' ? 'time' : (question.question_type === 'datetime' ? 'datetime-local' : 'date')}
                                                    required={question.is_required}
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                    style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                />
                                            )}

                                            {/* Choices */}
                                            {['radio', 'checkbox'].includes(question.question_type) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {question.options?.map((opt, i) => (
                                                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)' }}>
                                                            <input
                                                                type={question.question_type}
                                                                name={`q_${question.id}`}
                                                                value={opt.text}
                                                                checked={question.question_type === 'radio'
                                                                    ? (answers[question.id] === opt.text)
                                                                    : ((answers[question.id] || '').split(',').includes(opt.text))
                                                                }
                                                                required={question.question_type === 'radio' && question.is_required}
                                                                onChange={(e) => {
                                                                    if (question.question_type === 'radio') {
                                                                        handleInputChange(question.id, e.target.value);
                                                                    } else {
                                                                        const current = (answers[question.id] || '').split(',').filter(Boolean);
                                                                        let next;
                                                                        if (e.target.checked) next = [...current, opt.text];
                                                                        else next = current.filter(v => v !== opt.text);
                                                                        handleInputChange(question.id, next.join(','));
                                                                    }
                                                                }}
                                                            />
                                                            <span>{opt.text}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {question.question_type === 'dropdown' && (
                                                <select
                                                    required={question.is_required}
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                    style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                                                >
                                                    <option value="" disabled>Select an option...</option>
                                                    {question.options?.map((opt, i) => (
                                                        <option key={i} value={opt.text}>{opt.text}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {/* Advanced Types */}
                                            {question.question_type === 'boolean' && (
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    {['Yes', 'No'].map(val => (
                                                        <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--color-border)', backgroundColor: answers[question.id] === val ? 'var(--color-primary)' : 'white', color: answers[question.id] === val ? 'white' : 'inherit' }}>
                                                            <input
                                                                type="radio"
                                                                name={`q_${question.id}`}
                                                                value={val}
                                                                checked={answers[question.id] === val}
                                                                onChange={(e) => handleInputChange(question.id, val)}
                                                                style={{ display: 'none' }}
                                                            />
                                                            {val}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {question.question_type === 'slider' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <input
                                                        type="range"
                                                        min={(question.config || {}).min || 0}
                                                        max={(question.config || {}).max || 100}
                                                        step={(question.config || {}).step || 1}
                                                        value={answers[question.id] || (question.config || {}).min || 0}
                                                        onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                        style={{ flexGrow: 1 }}
                                                    />
                                                    <span style={{ fontWeight: 'bold', padding: '0.5rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                                        {answers[question.id] || ((question.config || {}).min || 0)}
                                                    </span>
                                                </div>
                                            )}

                                            {question.question_type === 'rating' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {[...Array((question.config || {}).max_stars || 5)].map((_, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => handleInputChange(question.id, i + 1)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '2rem',
                                                                color: (answers[question.id] || 0) > i ? 'var(--color-accent)' : '#E2E8F0',
                                                                transition: 'transform 0.1s'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                                        >
                                                            ★
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {question.question_type === 'file_upload' && (
                                                <div>
                                                    <input
                                                        type="file"
                                                        required={question.is_required && !answers[question.id]}
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            const formData = new FormData();
                                                            formData.append('file', file);
                                                            try {
                                                                const res = await api.post('responses/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                                handleInputChange(question.id, res.data.url);
                                                            } catch (err) { alert('Upload failed'); }
                                                        }}
                                                    />
                                                    {answers[question.id] && <p style={{ color: 'var(--color-success)', marginTop: '0.5rem' }}>File uploaded!</p>}
                                                </div>
                                            )}

                                            {question.question_type === 'matrix' && (
                                                <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                                                                <th style={{ padding: '0.75rem', textAlign: 'left' }}></th>
                                                                {(question.options || []).map((col, c) => (
                                                                    <th key={c} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>{col.text}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {((question.config || {}).rows || []).map((rowText, r) => (
                                                                <tr key={r} style={{ borderTop: '1px solid var(--color-border)' }}>
                                                                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{rowText}</td>
                                                                    {(question.options || []).map((col, c) => (
                                                                        <td key={c} style={{ textAlign: 'center', padding: '0.75rem' }}>
                                                                            <input
                                                                                type="radio"
                                                                                name={`q_${question.id}_row_${r}`}
                                                                                value={col.text}
                                                                                checked={(function () {
                                                                                    try {
                                                                                        const currentObj = JSON.parse(answers[question.id] || '{}');
                                                                                        return currentObj[rowText] === col.text;
                                                                                    } catch { return false; }
                                                                                })()}
                                                                                onChange={() => {
                                                                                    let currentObj = {};
                                                                                    try { currentObj = JSON.parse(answers[question.id] || '{}'); } catch (e) { }
                                                                                    currentObj[rowText] = col.text;
                                                                                    handleInputChange(question.id, JSON.stringify(currentObj));
                                                                                }}
                                                                                required={question.is_required && !answers[question.id]}
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                        </Card>
                                    )
                                ))}
                            </div>
                        </div>
                    ))}

                    <Button
                        type="submit"
                        disabled={submitting}
                        style={{ width: '100%', fontSize: '1.25rem', padding: '1rem', justifyContent: 'center' }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Form'} <Send size={20} />
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default FormViewer;
