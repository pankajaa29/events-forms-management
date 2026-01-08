from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import Form, Section, Question, Option, Response, Answer
from .serializers import (
    FormSerializer, SectionSerializer, QuestionSerializer, OptionSerializer,
    ResponseSerializer, AnswerSerializer
)

class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.all()
    serializer_class = FormSerializer
    # Uses default permission (IsAuthenticatedOrReadOnly) and authentication (JWT)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(creator=self.request.user)
        else:
            serializer.save()

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

class OptionViewSet(viewsets.ModelViewSet):
    queryset = Option.objects.all()
    serializer_class = OptionSerializer

class ResponseViewSet(viewsets.ModelViewSet):
    serializer_class = ResponseSerializer
    
    def get_queryset(self):
        # Allow anyone to create (handled by permissions), but restrict list/retrieve
        user = self.request.user
        queryset = Response.objects.all()

        # Filter by form ID if provided
        form_id = self.request.query_params.get('form')
        if form_id:
            queryset = queryset.filter(form_id=form_id)

        # For list actions, restrict to the creator of the form
        if self.action == 'list':
            if user.is_authenticated:
                # Only show responses for forms created by the user
                queryset = queryset.filter(form__creator=user)
            else:
                # Anonymous users see nothing in list view
                queryset = Response.objects.none()
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'upload']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    def perform_create(self, serializer):
        user = self.request.user
        form = serializer.validated_data['form'] # form instance

        # 1. Check Response Limits
        if not form.allow_multiple_responses and user.is_authenticated:
            if Response.objects.filter(form=form, respondent=user).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"detail": "You have already responded to this form."})

        # 2. Save Response
        if user.is_authenticated:
            instance = serializer.save(respondent=user)
        else:
            instance = serializer.save()
        
        # 3. Send Emails
        self.send_notifications(instance)

    def send_notifications(self, response):
        from django.core.mail import send_mail
        from django.conf import settings
        
        form = response.form
        
        # Default Subjects/Bodies
        default_subject = f"New Response for {form.title}"
        default_body = f"A new response has been submitted for {form.title}."
        
        # 3a. Notify Creator
        if form.notify_creator and form.creator and form.creator.email:
            try:
                subject = form.email_subject or default_subject
                body = form.email_body or default_body
                body = f"New Response Received:\n\n{body}\n\nLink to results: {settings.FRONTEND_URL}/forms/{form.id}/results"
                
                reply_to_list = []
                if respondent_email:
                    reply_to_list = [respondent_email]

                send_mail(
                    subject=f"[New Response] {subject}",
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@example.com',
                    recipient_list=[form.creator.email],
                    fail_silently=True,
                    reply_to=reply_to_list
                )
            except Exception as e:
                print(f"Failed to send creator email: {e}")

        # 3b. Notify Respondent
        respondent_email = None
        if response.respondent and response.respondent.email:
            respondent_email = response.respondent.email
        else:
            # Try to find an 'email' type question answer
            email_answer = response.answers.filter(question__question_type='email').first()
            if email_answer:
                respondent_email = email_answer.value
        
        if form.notify_respondent and respondent_email:
            try:
                subject = form.email_subject or default_subject
                body = form.email_body or default_body
                body = f"Thank you for your response!\n\n{body}"
                
                reply_to_list = []
                if form.creator and form.creator.email:
                    reply_to_list = [form.creator.email]

                send_mail(
                    subject=f"[Response Receipt] {subject}",
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@example.com',
                    recipient_list=[respondent_email],
                    fail_silently=True,
                    reply_to=reply_to_list
                )
            except Exception as e:
                print(f"Failed to send respondent email: {e}")

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse

        form_id = request.query_params.get('form')
        if not form_id:
            return HttpResponse("Form ID required", status=400)

        # Ensure user owns the form
        try:
            form = Form.objects.get(pk=form_id)
            if form.creator != request.user:
                return HttpResponse("Unauthorized", status=403)
        except Form.DoesNotExist:
            return HttpResponse("Form not found", status=404)

        # Get all questions (ordered)
        questions = Question.objects.filter(section__form=form).order_by('section__order', 'order')
        question_map = {q.id: q.text for q in questions}
        headers = ['Response ID', 'Submitted At'] + [q.text for q in questions]

        # Prepare Response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="form_{form_id}_responses.csv"'

        writer = csv.writer(response)
        writer.writerow(headers)

        # Write Data
        responses = self.get_queryset()
        for resp in responses:
            row = [resp.id, resp.created_at.strftime("%Y-%m-%d %H:%M:%S")]
            # Fetch answers efficiently (could be optimized with prefetch_related)
            answers = {a.question_id: a.value for a in resp.answers.all()}
            
            for q in questions:
                row.append(answers.get(q.id, ""))
            
            writer.writerow(row)

        return response

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def upload(self, request):
        from django.core.files.storage import FileSystemStorage
        from django.conf import settings
        from rest_framework.response import Response as DRFResponse

        if 'file' not in request.FILES:
            return DRFResponse({'error': 'No file provided'}, status=400)

        file_obj = request.FILES['file']
        fs = FileSystemStorage()
        filename = fs.save(f"uploads/{file_obj.name}", file_obj)
        file_url = fs.url(filename)
        
        # Build absolute URL if needed, but relative usually fine for frontend if handled
        full_url = request.build_absolute_uri(file_url)
        return DRFResponse({'url': full_url})

class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
