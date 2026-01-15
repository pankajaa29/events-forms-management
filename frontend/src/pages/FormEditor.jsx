import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formService } from '../services/api';
import { Save, ArrowLeft, PlusCircle, Trash2, Share2, BarChart, Eye } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import ShareModal from '../components/ShareModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
// ImageUploader removed

const getImageUrl = (url) => {
    return url;
};

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
        email_subject: '',
        email_body: '',
        slug: '',
        is_active: true,
        expiry_at: null,
        inactive_message: "This form is no longer accepting responses.",
        allow_multiple_responses: true
        // Internal file state removed
    });
    const [loading, setLoading] = useState(id && id !== 'new' ? true : false);
    const [saving, setSaving] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (id && id !== 'new' && !isNaN(id)) {
            fetchForm();
        }
    }, [id]);

    const fetchForm = async () => {
        try {
            const response = await formService.getForm(id);
            const formData = response.data;
            setForm(formData);

            // If private, fetch invitees
            if (!formData.is_public) {
                fetchInvitees(formData);
            }
        } catch (error) {
            console.error('Error fetching form:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvitees = async (currentForm) => {
        try {
            const res = await formService.getInvitees(id);
            setForm(prev => ({ ...prev, _invitees: res.data }));
        } catch (error) {
            console.error("Error fetching invitees:", error);
            setForm(prev => ({ ...prev, _invitees: [] }));
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
            // Exclude internal file states from metadata payload
            const { _logoFile, _bgFile, ...formPayload } = form;
            console.log('Sending Form Payload:', JSON.stringify(formPayload, null, 2));

            let savedFormId = id;
            if (id) {
                await formService.updateForm(id, formPayload);
            } else {
                const response = await formService.createForm(formPayload);
                savedFormId = response.data.id;
            }

            // Handle Image Uploads via Dedicated Endpoint (Base64 JSON Strategy)
            if (form._logoBase64 || form._bgBase64) {



                const imagesPayload = {};
                if (form._logoBase64) {
                    imagesPayload.logo_image = form._logoBase64;
                }
                if (form._bgBase64) {
                    imagesPayload.background_image = form._bgBase64;
                }

                const uploadResponse = await formService.uploadImages(savedFormId, imagesPayload);

                // CRITICAL: Update form state with the new server URLs so the UI reflects the saved state
                setForm(prev => ({
                    ...prev,
                    logo_image: uploadResponse.logo_url || prev.logo_image,
                    background_image: uploadResponse.bg_url || prev.background_image,
                    _logoBase64: null,
                    _bgBase64: null
                }));


            }


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

    const myRole = form.my_role || (id && id !== 'new' ? 'viewer' : 'owner');
    const canEdit = myRole === 'owner' || myRole === 'editor';
    const canShare = myRole === 'owner';

    return (
        <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
            {!canEdit && (
                <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Eye size={16} /> You are viewing this form in read-only mode.
                </div>
            )}

            {/* Header Actions */}
            <Card className="sticky-top" style={{ marginBottom: 'var(--space-6)', position: 'sticky', top: '1rem', zIndex: 10 }}>
                <div className="flex-between mobile-stack" style={{ gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%' }}>
                        <Button variant="secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem' }}>
                            <ArrowLeft size={18} /> <span className="mobile-hide">Back</span>
                        </Button>
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {id ? 'Edit Form' : 'New Form'}
                            </h1>
                            {id && myRole && (
                                <span style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>
                                    Role: {myRole}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {id && (
                            <Button variant="secondary" onClick={() => navigate(`/forms/${id}/results`)} size="sm">
                                <BarChart size={18} /> <span className="mobile-hide">Results</span>
                            </Button>
                        )}
                        <Button variant="secondary" onClick={handlePreview} size="sm">
                            <Eye size={18} /> <span className="mobile-hide">Preview</span>
                        </Button>
                        {id && canShare && (
                            <Button variant="secondary" onClick={() => setShowShareModal(true)} size="sm" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#4F46E5' }}>
                                <Share2 size={18} /> <span className="mobile-hide">Share</span>
                            </Button>
                        )}
                        {canEdit && (
                            <Button onClick={handleSave} disabled={saving} size="sm">
                                <Save size={18} /> {saving ? 'Saving...' : <><span className="mobile-hide">Save Form</span><span style={{ display: 'none' }} className="mobile-show">Save</span></>}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Share Modal */}
            {/* Share Modal */}
            {showShareModal && (
                <ShareModal form={form} onClose={() => setShowShareModal(false)} />
            )}

            {/* Design & Branding */}
            <fieldset disabled={!canEdit} style={{ border: 'none', margin: 0, padding: 0, width: '100%' }}>
                <Card style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                        Form Design & Branding
                    </h3>
                    <div className="flex-between mobile-stack" style={{ gap: 'var(--space-8)' }}>

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

                        {/* Logo & Background */}
                        <div style={{ flex: 1, width: '100%' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Logo Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            // Robust Base64 Reader in UI Thread
                                            const reader = new FileReader();
                                            reader.onload = async (ev) => {
                                                try {
                                                    const base64 = ev.target.result;
                                                    const res = await formService.uploadBase64(base64);
                                                    setForm(prev => ({ ...prev, logo_image: res.url }));
                                                } catch (err) {
                                                    console.error("Upload Error:", err);
                                                    alert(`Upload failed: ${err.message || JSON.stringify(err)}`);
                                                }
                                            };
                                            reader.onerror = (err) => alert("Browser could not read file. Try a different folder (e.g. Desktop).");
                                            try {
                                                reader.readAsDataURL(file);
                                            } catch (readErr) {
                                                alert("Immediate File Access Error. Permission denied.");
                                            }
                                        }
                                    }}
                                    style={{ marginBottom: '0.5rem', display: 'block', width: '100%' }}
                                />
                                {/* Show Preview of Logo */}
                                {form.logo_image && (
                                    <div style={{ marginBottom: '1rem', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '0.8rem', marginBottom: '5px', color: 'var(--color-text-muted)' }}>Preview:</div>
                                        <img
                                            src={getImageUrl(form.logo_image)}
                                            alt="Logo Preview"
                                            style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}

                                {/* Logo Alignment */}
                                <div style={{ marginTop: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', marginRight: '0.5rem' }}>Alignment:</label>
                                    <select
                                        value={form.logo_alignment || 'center'}
                                        onChange={(e) => setForm({ ...form, logo_alignment: e.target.value })}
                                        style={{ padding: '0.25rem', borderRadius: '4px' }}
                                    >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Background Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = async (ev) => {
                                                try {
                                                    const base64 = ev.target.result;
                                                    const res = await formService.uploadBase64(base64);
                                                    setForm(prev => ({ ...prev, background_image: res.url }));
                                                } catch (err) {
                                                    console.error("Upload Error:", err);
                                                    alert(`Upload failed: ${err.message || JSON.stringify(err)}`);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    style={{ marginBottom: '0.5rem', display: 'block', width: '100%' }}
                                />
                                {form.background_image && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-success)' }}>
                                        Background set. <a href={getImageUrl(form.background_image)} target="_blank" rel="noreferrer">View</a>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </Card>
            </fieldset>

            {/* Notification & Settings */}
            <fieldset disabled={!canEdit} style={{ border: 'none', margin: 0, padding: 0, width: '100%' }}>
                <Card style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                        Settings & Notifications
                    </h3>

                    {/* Custom URL Slug */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Custom URL Extension</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{window.location.origin}/forms/</span>
                            <Input
                                placeholder="(Optional) e.g. my-event-name"
                                value={form.slug || ''}
                                onChange={(e) => {
                                    // Only allow alphanumeric and hyphens
                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    setForm({ ...form, slug: val });
                                }}
                                style={{ maxWidth: '300px' }}
                            />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Leave blank to use the default numeric ID.
                        </p>
                    </div>

                    {/* Response Limits */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={form.allow_multiple_responses !== false}
                                onChange={(e) => setForm({ ...form, allow_multiple_responses: e.target.checked })}
                            />
                            Allow Multiple Responses per Person
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '24px' }}>
                            If unchecked, users can only submit once.
                        </p>
                    </div>

                    {/* Access Control (Private Forms) */}
                    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Access Control</h4>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!form.is_public}
                                    onChange={(e) => setForm({ ...form, is_public: !e.target.checked })}
                                />
                                Private Form (Invite Only)
                            </label>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '24px', marginTop: '4px' }}>
                                Only people listed below can access and submit this form. They must be logged in with the invited email.
                            </p>
                        </div>

                        {!form.is_public && (
                            <div style={{ marginLeft: '24px', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Invited Respondents</label>

                                {/* Add Invitee Input */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Input
                                        placeholder="Enter email address"
                                        id="new-invitee-email"
                                        style={{ marginBottom: 0 }}
                                    />
                                    <Button size="sm" onClick={async () => {
                                        const emailInput = document.getElementById('new-invitee-email');
                                        const email = emailInput.value;
                                        if (!email || !email.includes('@')) return alert("Please enter a valid email");

                                        try {
                                            await formService.addInvitees(id, [email]);
                                            emailInput.value = '';
                                            // Refresh invitees list (TODO: optimize with local state update)
                                            fetchInvitees();
                                        } catch (err) {
                                            alert("Failed to invite: " + err.message);
                                        }
                                    }}>
                                        Add
                                    </Button>
                                </div>

                                {/* CSV Upload */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>📂 Upload CSV</span>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;

                                                const reader = new FileReader();
                                                reader.onload = async (event) => {
                                                    const text = event.target.result;
                                                    // Simple regex to extract emails from CSV
                                                    const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

                                                    if (!emails || emails.length === 0) {
                                                        alert("No valid emails found in file.");
                                                        return;
                                                    }

                                                    if (window.confirm(`Found ${emails.length} emails. Import them?`)) {
                                                        try {
                                                            const res = await formService.addInvitees(id, emails);
                                                            alert(`Successfully added ${res.data.added} emails.`);
                                                            fetchInvitees();
                                                        } catch (err) {
                                                            alert("Import failed: " + err.message);
                                                        }
                                                    }
                                                    e.target.value = null; // Reset input
                                                };
                                                reader.readAsText(file);
                                            }}
                                        />
                                    </label>
                                    <a
                                        href="data:text/csv;charset=utf-8,email%0Auser1@example.com%0Auser2@example.com"
                                        download="invitees_template.csv"
                                        style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                                    >
                                        Download Template
                                    </a>
                                </div>

                                {/* List Invitees */}
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {form._invitees ? (
                                        form._invitees.length === 0 ? (
                                            <p style={{ fontSize: '0.8rem', color: '#6B7280', fontStyle: 'italic' }}>No one invited yet.</p>
                                        ) : (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {form._invitees.map(inv => (
                                                    <li key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #E5E7EB', fontSize: '0.9rem' }}>
                                                        <span>{inv.email}</span>
                                                        <span
                                                            onClick={async () => {
                                                                if (!window.confirm("Remove access for " + inv.email + "?")) return;
                                                                await formService.removeInvitee(id, inv.email);
                                                                fetchInvitees();
                                                            }}
                                                            style={{ color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            &times;
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )
                                    ) : (
                                        <p style={{ fontSize: '0.8rem' }}>Save form to manage invitees.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form Availability */}
                    <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Form Availability</h4>

                        {/* Manual Toggle */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.is_active !== false}
                                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                />
                                Form is Active (Open for responses)
                            </label>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '24px', marginTop: '4px' }}>
                                Uncheck to immediately close the form.
                            </p>
                        </div>

                        {/* Expiration Date */}
                        <div style={{ marginBottom: '1rem', marginLeft: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Auto-Close Schedule
                            </label>
                            <input
                                type="datetime-local"
                                value={form.expiry_at ? new Date(form.expiry_at).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setForm({ ...form, expiry_at: e.target.value || null })}
                                style={{
                                    padding: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px',
                                    width: '100%',
                                    maxWidth: '300px'
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                Form will automatically close after this time. Leave blank to keep open indefinitely.
                            </p>
                        </div>

                        {/* Inactive Message */}
                        <div style={{ marginLeft: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Inactive Message
                            </label>
                            <textarea
                                value={form.inactive_message || ''}
                                onChange={(e) => setForm({ ...form, inactive_message: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '4px'
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                This message is shown to visitors when the form is closed.
                            </p>
                        </div>
                    </div>

                    {/* Email Settings */}
                    <div className="flex-between mobile-stack" style={{ gap: 'var(--space-8)' }}>
                        <div style={{ flex: 1, width: '100%' }}>
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
                </Card >
            </fieldset>

            <Card style={{ marginBottom: 'var(--space-6)' }}>
                <fieldset disabled={!canEdit} style={{ border: 'none', margin: 0, padding: 0, width: '100%' }}>
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
                            readOnly={!canEdit}
                        />
                    </div>
                </fieldset>
            </Card>

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                <fieldset disabled={!canEdit} style={{ border: 'none', margin: 0, padding: 0, width: '100%' }}>
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
                                                <div className="flex-between mobile-stack" style={{ gap: 'var(--space-4)' }}>
                                                    <select
                                                        value={question.question_type}
                                                        onChange={(e) => handleUpdateQuestion(sIdx, qIdx, 'question_type', e.target.value)}
                                                        style={{ width: '100%', maxWidth: '100%' }}
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
                                                <Share2 size={14} /> {question.logic_rules?.condition ? 'Remove Logic' : 'Add Conditional Logic'}
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
                                {canEdit && (
                                    <Button variant="secondary" style={{ alignSelf: 'center', borderStyle: 'dashed' }} onClick={() => handleAddQuestion(sIdx)}>
                                        <PlusCircle size={16} /> Add Question
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </fieldset>

                {
                    canEdit && (
                        <Card className="flex-center" style={{ borderStyle: 'dashed', backgroundColor: 'transparent', boxShadow: 'none' }}>
                            <Button onClick={handleAddSection}>
                                <PlusCircle size={20} /> Add New Section
                            </Button>
                        </Card>
                    )
                }
            </div >
        </div >
    );
};

export default FormEditor;
