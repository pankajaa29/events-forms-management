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
    logo_image = models.ImageField(upload_to='forms/logos/', null=True, blank=True)
    background_image = models.ImageField(upload_to='forms/backgrounds/', null=True, blank=True)

    # Settings / Notifications
    notify_creator = models.BooleanField(default=False)
    notify_respondent = models.BooleanField(default=False)
    email_subject = models.CharField(max_length=255, blank=True, help_text="Template for email subject")
    email_body = models.TextField(blank=True, help_text="Template for email body")
    allow_multiple_responses = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
