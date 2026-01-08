import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Download } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const FormResults = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [formRes, responsesRes] = await Promise.all([
                api.get(`forms/${id}/`),
                api.get(`responses/?form=${id}`)
            ]);
            setForm(formRes.data);
            setResponses(responsesRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading results:', error);
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get('responses/export_csv/', {
                params: { form: id },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `form_${id}_results.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export CSV.');
        }
    };

    if (loading) return <div className="loading">Loading results...</div>;
    if (!form) return <div className="container" style={{ marginTop: '2rem' }}><Card>Form not found.</Card></div>;

    // Flatten all questions for table headers
    const allQuestions = form.sections.flatMap(s => s.questions);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <Card className="sticky-top" style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Button variant="secondary" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} /> Back
                    </Button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{form.title} Results</h1>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{responses.length} total responses</p>
                    </div>
                </div>
                <Button variant="primary" onClick={handleExport}>
                    <Download size={18} /> Export CSV
                </Button>
            </Card>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '2px solid var(--color-border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', whiteSpace: 'nowrap', fontWeight: 'bold' }}>#</th>
                                <th style={{ padding: '1rem', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Date</th>
                                {allQuestions.map(q => (
                                    <th key={q.id} style={{ padding: '1rem', minWidth: '150px', fontWeight: 'bold' }}>
                                        {q.text}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {responses.length === 0 ? (
                                <tr>
                                    <td colSpan={allQuestions.length + 2} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No responses collected yet.
                                    </td>
                                </tr>
                            ) : (
                                responses.map((r, idx) => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                        <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                        <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                            {new Date(r.created_at).toLocaleString()}
                                        </td>
                                        {allQuestions.map(q => {
                                            const answer = r.answers.find(a => a.question === q.id);
                                            return (
                                                <td key={q.id} style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                                    {answer ? (
                                                        <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                                            {answer.value}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default FormResults;
