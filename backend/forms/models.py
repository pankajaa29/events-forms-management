from django.db import models
from django.conf import settings

class Form(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forms', null=True, blank=True)
    is_public = models.BooleanField(default=True)
    
    # Branding / Theming
    primary_color = models.CharField(max_length=7, default='#6366F1')
    background_color = models.CharField(max_length=7, default='#F8FAFC')
    logo_image = models.TextField(blank=True, null=True, help_text="URL to logo image")
    logo_alignment = models.CharField(max_length=10, choices=[('left', 'Left'), ('center', 'Center'), ('right', 'Right')], default='center')
    background_image = models.TextField(blank=True, null=True, help_text="URL to background image")

    # Settings / Notifications
    notify_creator = models.BooleanField(default=False)
    notify_respondent = models.BooleanField(default=False)
    email_subject = models.CharField(max_length=255, blank=True, help_text="Template for email subject")
    email_body = models.TextField(blank=True, help_text="Template for email body")
    allow_multiple_responses = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(blank=True, null=True, help_text="Date when the form was first published")
    slug = models.SlugField(max_length=255, unique=True, blank=True, null=True, help_text="Custom URL identifier")
    
    # Expiration / Inactivation
    is_active = models.BooleanField(default=True, help_text="Manual switch to open/close form")
    expiry_at = models.DateTimeField(blank=True, null=True, help_text="Automatically close form at this time")
    inactive_message = models.TextField(default="This form is no longer accepting responses.", help_text="Message to show when inactive")

    class Meta:
        permissions = [
            ("publish_form", "Can publish form"),
            ("share_form", "Can share form"),
            ("view_responses", "Can view responses"),
            ("export_responses", "Can export responses"),
        ]

    def __str__(self):
        return self.title

class Section(models.Model):
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.form.title} - {self.title}"

class Question(models.Model):
    QUESTION_TYPES = [
        ('short_text', 'Short Text'),
        ('long_text', 'Long Text'),
        ('email', 'Email'),
        ('phone', 'Phone Number'),
        ('numeric', 'Numeric'),
        ('url', 'URL'),
        ('date', 'Date'),
        ('time', 'Time'),
        ('datetime', 'DateTime'),
        ('radio', 'Single Choice (Radio)'),
        ('checkbox', 'Multiple Choice (Checkbox)'),
        ('dropdown', 'Dropdown'),
        ('boolean', 'Boolean (Yes/No)'),
        ('slider', 'Slider'),
        ('linear_scale', 'Linear Scale'),
        ('rating', 'Rating'),
        ('nps', 'NPS'),
        ('file_upload', 'File Upload'),
    ]

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    help_text = models.TextField(blank=True, null=True)
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPES)
    is_required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    
    # Configuration for advanced types (min, max, step, rows, icons, etc.)
    config = models.JSONField(default=dict, blank=True)
    
    # Validation / Logic JSON fields (simplified for now)
    validation_rules = models.JSONField(default=dict, blank=True)
    logic_rules = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.question_type}: {self.text[:50]}"

class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text

class Response(models.Model):
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='responses')
    respondent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='responses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Response to {self.form.title} (#{self.id})"

class Answer(models.Model):
    response = models.ForeignKey(Response, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    value = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Ans to {self.question.id}: {self.value[:20]}"

class UserProfile(models.Model):
    PLATFORM_STATUS_CHOICES = [
        ('active', 'Active'),
        ('blocked', 'Blocked'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    mobile_number = models.CharField(max_length=15, blank=True, null=True)
    platform_status = models.CharField(max_length=20, choices=PLATFORM_STATUS_CHOICES, default='active')
    is_platform_admin = models.BooleanField(default=False, help_text="Grant full platform access")
    roles = models.ManyToManyField('Role', blank=True, related_name='user_profiles')

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Role(models.Model):
    """
    Defines a set of permissions for generic roles (e.g., Editor, Viewer).
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    permissions = models.ManyToManyField('auth.Permission', blank=True)
    is_system = models.BooleanField(default=False, help_text="System roles cannot be deleted")

    def __str__(self):
        return self.name

class FormCollaborator(models.Model):
    """
    Links a User to a Form with a specific Role.
    """
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='form_collaborations')
    role = models.ForeignKey(Role, on_delete=models.PROTECT) # Prevent deleting role if used
    
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True) # If we use invite flow
    
    class Meta:
        unique_together = ('form', 'user')

    def __str__(self):
        return f"{self.user.username} as {self.role.name} on {self.form.title}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('BLOCK_USER', 'Block User'),
        ('UNBLOCK_USER', 'Unblock User'),
        ('CREATE_ROLE', 'Create Role'),
        ('UPDATE_ROLE', 'Update Role'),
        ('DELETE_ROLE', 'Delete Role'),
        ('CHANGE_OWNERSHIP', 'Change Ownership'),
        ('LOGIN', 'Login'),
        ('OTHER', 'Other'),
    ]

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_actions')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target = models.CharField(max_length=255, help_text="Target object identifier")
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.actor} performed {self.action} on {self.target}"
