import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formService } from '../services/api';
import { Save, ArrowLeft, PlusCircle, Trash2, Share, BarChart, Plus } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
// ImageUploader removed

const FormEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '',
        description: '',
        sections: [],
        primary_color: '#6366F1',
        background_color: '#F8FAFC',
        // logo_image: null,
        // background_image: null,
        notify_creator: false,
        notify_respondent: false,
        email_subject: '',
        email_body: '',
        allow_multiple_responses: true
        // Internal file state removed
    });
    const [loading, setLoading] = useState(id ? true : false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id && id !== 'new' && !isNaN(id)) {
            fetchForm();
        }
    }, [id]);

    const fetchForm = async () => {
        try {
            const response = await formService.getForm(id);
            setForm(response.data);
        } catch (error) {
            console.error('Error fetching form:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... (Section/Question handlers same as before) ...
    const handleAddSection = () => {
        const newSection = {
            title: `New Section ${form.sections.length + 1}`,
            description: '',
            order: form.sections.length,
            questions: []
        };
        setForm({ ...form, sections: [...form.sections, newSection] });
    };

    const handleUpdateSection = (index, field, value) => {
        const updatedSections = [...form.sections];
        updatedSections[index] = { ...updatedSections[index], [field]: value };
        setForm({ ...form, sections: updatedSections });
    };

    const handleDeleteSection = (index) => {
        if (!window.confirm('Delete this section and all its questions?')) return;
        const updatedSections = form.sections.filter((_, i) => i !== index);
        setForm({ ...form, sections: updatedSections });
    };

    const handleAddQuestion = (sectionIndex) => {
        const updatedSections = [...form.sections];
        const newQuestion = {
            text: 'New Question',
            question_type: 'short_text',
            is_required: false,
            order: updatedSections[sectionIndex].questions.length,
            options: [],
            config: {},
            logic_rules: {},
            temp_id: `TEMP_${Date.now()}`
        };
        updatedSections[sectionIndex].questions = [...updatedSections[sectionIndex].questions, newQuestion];
        setForm({ ...form, sections: updatedSections });
    };

    const handleUpdateQuestion = (sectionIndex, questionIndex, field, value) => {
        const updatedSections = [...form.sections];
        updatedSections[sectionIndex].questions[questionIndex] = {
            ...updatedSections[sectionIndex].questions[questionIndex],
            [field]: value
        };
        setForm({ ...form, sections: updatedSections });
    };

    const handleDeleteQuestion = (sectionIndex, questionIndex) => {
        const updatedSections = [...form.sections];
        updatedSections[sectionIndex].questions = updatedSections[sectionIndex].questions.filter((_, i) => i !== questionIndex);
        setForm({ ...form, sections: updatedSections });
    };

    const handlePreview = () => {
        if (id) {
            window.open(`/forms/${id}`, '_blank');
        } else {
            alert("Please save the form first to preview it.");
        }
    };

    const handleSave = async () => {
        if (saving) return;

        // Validation: If notify_respondent is enabled, require a mandatory email question
        if (form.notify_respondent) {
            const hasRequiredEmail = form.sections.some(section =>
                section.questions.some(q => q.question_type === 'email' && q.is_required)
            );

            if (!hasRequiredEmail) {
                alert("Configuration Error:\nTo send a confirmation email to the respondent, your form MUST include a 'Required' Email question.\n\nPlease add an Email question and mark it as 'Required', or disable the 'Send Confirmation Email' option in Settings.");
                return;
            }
        }

        setSaving(true);
        try {
            // Exclude internal file states from metadata payload
            const { logo_image, background_image, _logoFile, _bgFile, ...formPayload } = form;
            console.log('Sending Form Payload:', JSON.stringify(formPayload, null, 2));

            let savedFormId = id;
            if (id) {
                await formService.updateForm(id, formPayload);
            } else {
                const response = await formService.createForm(formPayload);
                savedFormId = response.data.id;
            }

            // Handle Image Uploads via Dedicated Endpoint
            // Image Upload logic removed

            alert('Form saved successfully!');
        } catch (error) {
            console.error('Error saving form:', error);
            if (error.response && error.response.data) {
                const errorMsg = JSON.stringify(error.response.data, null, 2);
                alert(`Error saving form:\n${errorMsg}`);
            } else {
                alert(`Error saving form: ${error.message}`);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading editor...</div>;

    return (
        <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
            {/* Header Actions - Same as before */}
            <Card className="sticky-top" style={{ marginBottom: 'var(--space-6)', position: 'sticky', top: '1rem', zIndex: 10 }}>
                <div className="flex-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <Button variant="secondary" onClick={() => navigate('/')}>
                            <ArrowLeft size={18} /> Back
                        </Button>
                        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{id ? 'Edit Form' : 'New Form'}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {id && (
                            <Button variant="secondary" onClick={() => navigate(`/forms/${id}/results`)}>
                                <BarChart size={18} /> Results
                            </Button>
                        )}
                        <Button variant="secondary" onClick={handlePreview}>
                            <Share size={18} /> Preview
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save size={18} /> {saving ? 'Saving...' : 'Save Form'}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Design & Branding */}
            <Card style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    Form Design & Branding
                </h3>
                <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>

                    {/* Colors */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Theme Colors</label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem' }}>Primary</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        value={form.primary_color || '#6366F1'}
                                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                                        style={{ height: '40px', width: '60px', padding: 0, border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem' }}>Background</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        value={form.background_color || '#F8FAFC'}
                                        onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                                        style={{ height: '40px', width: '60px', padding: 0, border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Images Removed */}
                </div>
            </Card>

            {/* Notification & Settings */}
            <Card style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    Settings & Notifications
                </h3>

                {/* Response Limits */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={form.allow_multiple_responses !== false}
                            onChange={(e) => setForm({ ...form, allow_multiple_responses: e.target.checked })}
                        />
                        Allow Multiple Responses
                    </label>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginLeft: '1.5rem' }}>
                        If unchecked, authenticated users can only submit this form once.
                    </div>
                </div>

                {/* Email Settings */}
                <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email Triggers</label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={!!form.notify_creator}
                                onChange={(e) => setForm({ ...form, notify_creator: e.target.checked })}
                            />
                            Notify Me (Creator) on new response
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={!!form.notify_respondent}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    let newForm = { ...form, notify_respondent: isChecked };

                                    if (isChecked) {
                                        const hasRequiredEmail = form.sections.some(s =>
                                            s.questions.some(q => q.question_type === 'email' && q.is_required)
                                        );

                                        if (!hasRequiredEmail) {
                                            // Auto-add email question to first section
                                            const updatedSections = [...form.sections];
                                            if (updatedSections.length === 0) {
                                                updatedSections.push({
                                                    title: 'Contact Information',
                                                    description: '',
                                                    questions: []
                                                });
                                            }

                                            updatedSections[0].questions.push({
                                                text: 'Email Address',
                                                question_type: 'email',
                                                is_required: true,
                                                order: updatedSections[0].questions.length,
                                                options: [],
                                                config: {},
                                                logic_rules: {},
                                                temp_id: `TEMP_${Date.now()}`
                                            });

                                            newForm.sections = updatedSections;
                                            alert("Notice: A 'Required' Email question has been automatically added to the form to support confirmation emails.");
                                        }
                                    }

                                    setForm(newForm);
                                }}
                            />
                            Send Confirmation Email to Respondent
                        </label>
                    </div>

                    {(form.notify_creator || form.notify_respondent) && (
                        <div style={{ flex: 1, minWidth: '300px', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-6)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email Template</label>
                            <Input
                                label="Subject Line"
                                value={form.email_subject || ''}
                                onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
                                placeholder="New Response Received / Thank you for your response"
                                style={{ marginBottom: '1rem' }}
                            />
                            <div className="field">
                                <label>Email Body</label>
                                <textarea
                                    value={form.email_body || ''}
                                    onChange={(e) => setForm({ ...form, email_body: e.target.value })}
                                    placeholder="Enter custom message..."
                                    rows={4}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    System will append response details automatically.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Card style={{ marginBottom: 'var(--space-6)' }}>
                <Input
                    label="Form Title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter form title..."
                    style={{ fontSize: '1.25rem', fontWeight: 'bold' }}
                />
                <div className="field">
                    <label>Description</label>
                    <ReactQuill
                        theme="snow"
                        value={form.description}
                        onChange={(value) => setForm(prev => ({ ...prev, description: value }))}
                        placeholder="Enter form description..."
                    />
                </div>
            </Card>

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {form.sections.map((section, sIdx) => (
                    <div key={sIdx} className="section-block" style={{ borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                        <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ flexGrow: 1, marginRight: 'var(--space-4)' }}>
                                <Input
                                    value={section.title}
                                    onChange={(e) => handleUpdateSection(sIdx, 'title', e.target.value)}
                                    placeholder="Section Title"
                                    style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: 0 }}
                                />
                            </div>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteSection(sIdx)}>
                                <Trash2 size={16} /> Delete Section
                            </Button>
                        </div>

                        <div className="questions-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {section.questions?.map((question, qIdx) => (
                                <Card key={qIdx} style={{ borderLeft: '4px solid var(--color-primary)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                                        <div style={{ flexGrow: 1 }}>
                                            <Input
                                                value={question.text}
                                                onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'text', e.target.value)}
                                                placeholder="Question Text"
                                                style={{ marginBottom: '0.5rem' }}
                                            />
                                            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                                <select
                                                    value={question.question_type}
                                                    onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'question_type', e.target.value)}
                                                    style={{ maxWidth: '200px' }}
                                                >
                                                    <option value="short_text">Short Text</option>
                                                    <option value="long_text">Long Text</option>
                                                    <option value="email">Email</option>
                                                    <option value="numeric">Numeric</option>
                                                    <option value="phone">Phone</option>
                                                    <option value="url">URL</option>
                                                    <option value="date">Date</option>
                                                    <option value="time">Time</option>
                                                    <option value="datetime">DateTime</option>
                                                    <option value="radio">Single Choice (Radio)</option>
                                                    <option value="checkbox">Multiple Choice</option>
                                                    <option value="dropdown">Dropdown</option>
                                                    <option value="boolean">Boolean (Yes/No)</option>
                                                    <option value="slider">Slider</option>
                                                    <option value="rating">Rating</option>
                                                    <option value="file_upload">File Upload</option>
                                                    <option value="matrix">Matrix</option>
                                                </select>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={question.is_required}
                                                        onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'is_required', e.target.checked)}
                                                    /> Required
                                                </label>
                                            </div>
                                        </div>
                                        <Button variant="icon" onClick={() => handleDeleteQuestion(sIdx, qIdx)} title="Delete Question">
                                            <Trash2 size={18} color="var(--color-danger)" />
                                        </Button>
                                    </div>

                                    {/* Question Type Specific Editors */}
                                    {question.question_type === 'matrix' && (
                                        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Matrix Rows</label>
                                            {((question.config || {}).rows || []).map((row, rIdx) => (
                                                <div key={rIdx} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                    <input
                                                        type="text"
                                                        value={row}
                                                        onChange={(e) => {
                                                            const newRows = [...((question.config || {}).rows || [])];
                                                            newRows[rIdx] = e.target.value;
                                                            handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, rows: newRows });
                                                        }}
                                                        placeholder={`Row ${rIdx + 1}`}
                                                    />
                                                    <Button variant="icon" size="sm" onClick={() => {
                                                        const newRows = ((question.config || {}).rows || []).filter((_, i) => i !== rIdx);
                                                        handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, rows: newRows });
                                                    }}><Trash2 size={14} /></Button>
                                                </div>
                                            ))}
                                            <Button variant="text" size="sm" onClick={() => {
                                                const newRows = [...((question.config || {}).rows || []), 'New Row'];
                                                handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, rows: newRows });
                                            }}><Plus size={14} /> Add Row</Button>
                                        </div>
                                    )}

                                    {['radio', 'checkbox', 'dropdown', 'matrix'].includes(question.question_type) && (
                                        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                                                {question.question_type === 'matrix' ? 'Columns' : 'Options'}
                                            </label>
                                            {(question.options || []).map((opt, oIdx) => (
                                                <div key={oIdx} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                    <input
                                                        type="text"
                                                        value={opt.text}
                                                        onChange={(e) => {
                                                            const newOptions = [...question.options];
                                                            newOptions[oIdx] = { ...newOptions[oIdx], text: e.target.value };
                                                            handleUpdateQuestion(sIdx, qIdx, 'options', newOptions);
                                                        }}
                                                        placeholder={`Option ${oIdx + 1}`}
                                                    />
                                                    <Button variant="icon" size="sm" onClick={() => {
                                                        const newOptions = question.options.filter((_, i) => i !== oIdx);
                                                        handleUpdateQuestion(sIdx, qIdx, 'options', newOptions);
                                                    }}><Trash2 size={14} /></Button>
                                                </div>
                                            ))}
                                            <Button variant="text" size="sm" onClick={() => {
                                                const newOptions = [...(question.options || []), { text: 'New Option', order: (question.options?.length || 0) }];
                                                handleUpdateQuestion(sIdx, qIdx, 'options', newOptions);
                                            }}><Plus size={14} /> Add Option</Button>
                                        </div>
                                    )}

                                    {question.question_type === 'slider' && (
                                        <div style={{ display: 'flex', gap: '1rem', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem' }}>Min</label>
                                                <input
                                                    type="number"
                                                    value={(question.config || {}).min || 0}
                                                    onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, min: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem' }}>Max</label>
                                                <input
                                                    type="number"
                                                    value={(question.config || {}).max || 100}
                                                    onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, max: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem' }}>Step</label>
                                                <input
                                                    type="number"
                                                    value={(question.config || {}).step || 1}
                                                    onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, step: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {question.question_type === 'rating' && (
                                        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                            <label style={{ fontSize: '0.8rem' }}>Max Stars</label>
                                            <input
                                                type="number"
                                                value={(question.config || {}).max_stars || 5}
                                                onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'config', { ...question.config, max_stars: parseInt(e.target.value) })}
                                                style={{ width: '80px' }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        <Button
                                            variant="text"
                                            size="sm"
                                            onClick={() => {
                                                if (question.logic_rules?.condition) {
                                                    handleUpdateQuestion(sIdx, qIdx, 'logic_rules', {});
                                                } else {
                                                    handleUpdateQuestion(sIdx, qIdx, 'logic_rules', { condition: { question_id: '', operator: 'equals', value: '' } });
                                                }
                                            }}
                                            style={{ color: 'var(--color-primary)' }}
                                        >
                                            <Share size={14} /> {question.logic_rules?.condition ? 'Remove Logic' : 'Add Conditional Logic'}
                                        </Button>

                                        {question.logic_rules?.condition && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Show this question if:</p>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <select
                                                        value={question.logic_rules.condition.question_id}
                                                        onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'logic_rules', { ...question.logic_rules, condition: { ...question.logic_rules.condition, question_id: e.target.value } })}
                                                        style={{ flex: 2 }}
                                                    >
                                                        <option value="">Select Question...</option>
                                                        {form.sections.flatMap((s, si) =>
                                                            s.questions.filter((q, qi) => ((si < sIdx) || (si === sIdx && qi < qIdx)) && (q.id || q.temp_id))
                                                                .map(q => ({ id: q.id || q.temp_id, text: q.text }))
                                                        ).map(q => (
                                                            <option key={q.id} value={q.id}>{q.text.substring(0, 30)}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={question.logic_rules.condition.operator}
                                                        onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'logic_rules', { ...question.logic_rules, condition: { ...question.logic_rules.condition, operator: e.target.value } })}
                                                        style={{ flex: 1 }}
                                                    >
                                                        <option value="equals">Equals</option>
                                                        <option value="not_equals">Does Not Equal</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={question.logic_rules.condition.value}
                                                        onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'logic_rules', { ...question.logic_rules, condition: { ...question.logic_rules.condition, value: e.target.value } })}
                                                        placeholder="Value"
                                                        style={{ flex: 1 }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            <Button variant="secondary" style={{ alignSelf: 'center', borderStyle: 'dashed' }} onClick={() => handleAddQuestion(sIdx)}>
                                <PlusCircle size={16} /> Add Question
                            </Button>
                        </div>
                    </div>
                ))}

                <Card className="flex-center" style={{ borderStyle: 'dashed', backgroundColor: 'transparent', boxShadow: 'none' }}>
                    <Button onClick={handleAddSection}>
                        <PlusCircle size={20} /> Add New Section
                    </Button>
                </Card>
            </div>
        </div >
    );
};

export default FormEditor;
