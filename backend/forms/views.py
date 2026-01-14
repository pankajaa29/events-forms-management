from rest_framework import viewsets, permissions, status
from django.contrib.auth.models import User
from rest_framework.decorators import action
from rest_framework.response import Response as DRFResponse # Rename to avoid conflict with model
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Prefetch, Q

from .permissions import HasFormPermission, IsPlatformAdmin, IsActiveUser

# Parsers
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# Utilities
import base64
import uuid
import os

from .models import Form, Section, Question, Option, Response, Answer, Role, FormCollaborator, AuditLog
from .serializers import (
    FormSerializer, 
    SectionSerializer, 
    QuestionSerializer, 
    OptionSerializer, 
    ResponseSerializer, 
    AnswerSerializer,
    UserRegistrationSerializer,
    RoleSerializer,
    FormCollaboratorSerializer,
    AdminUserSerializer,
    PermissionSerializer
)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return DRFResponse({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'username': user.username,
                    'email': user.email
                }
            }, status=status.HTTP_201_CREATED)
        return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UploadView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, format=None):
        print("--- UPLOAD REQUEST RECEIVED ---")
        print(f"Request Data Keys: {request.data.keys()}")
        print(f"Request FILES Keys: {request.FILES.keys()}")
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage
        import os

        # 1. Handle Standard Multipart Upload
        try:
            # 1. Handle Standard Multipart Upload
            if 'file' in request.FILES:
                file_obj = request.FILES['file']
                print(f"--- PROCESSING FILE: {file_obj.name} ({file_obj.size} bytes) ---")
                
                # Use ContentFile to ensure we have a fresh stream read from the upload
                # preventing any 'closed file' issues with TemporaryUploadedFile
                file_content = ContentFile(file_obj.read())
                
                save_path = os.path.join('uploads', file_obj.name)
                print(f"--- SAVING TO: {save_path} ---")
                
                real_path = default_storage.save(save_path, file_content)
                print(f"--- SAVED AT: {real_path} ---")
                
                full_url = request.build_absolute_uri(default_storage.url(real_path))
                print(f"--- SUCCESS! RETURNING URL: {full_url} ---")
                
                return DRFResponse({'url': full_url}, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"!!! SERVER ERROR DURING UPLOAD !!!: {str(e)}")
            import traceback
            traceback.print_exc()
            return DRFResponse({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Handle Base64 JSON Upload (Fallback for network timeouts)
        if request.data and 'file_data' in request.data:
            try:
                print("--- PROCESSING BASE64 UPLOAD ---")
                imgstr = request.data['file_data']
                if ';base64,' in imgstr:
                    format, imgstr = imgstr.split(';base64,') 
                    ext = format.split('/')[-1]
                    decoded_file = base64.b64decode(imgstr)
                    
                    filename = f"{uuid.uuid4()}.{ext}"
                    data = ContentFile(decoded_file, name=filename)
                    
                    save_path = os.path.join('uploads', filename)
                    print(f"--- SAVING BASE64 TO: {save_path} ---")
                    
                    file_path = default_storage.save(save_path, data)
                    print(f"--- SAVED AT: {file_path} ---")
                    
                    full_url = request.build_absolute_uri(default_storage.url(file_path))
                    print(f"--- SUCCESS! RETURNING URL: {full_url} ---")
                    return DRFResponse({'url': full_url}, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"!!! BASE64 UPLOAD ERROR !!!: {str(e)}")
                import traceback
                traceback.print_exc()
                return DRFResponse({'error': f"Base64 Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return DRFResponse({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

class FormViewSet(viewsets.ModelViewSet):
    serializer_class = FormSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, HasFormPermission]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
             return Form.objects.none()
             
        # Admin Access
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.is_platform_admin):
            return Form.objects.all().order_by('-created_at')

        # Ownership + Collaboration + Responded
        return Form.objects.filter(
            Q(creator=user) | Q(collaborators__user=user) | Q(responses__respondent=user)
        ).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        from django.utils import timezone
        save_kwargs = {}
        if self.request.user.is_authenticated:
            save_kwargs['creator'] = self.request.user
        
        # If public on creation, set published_at
        if serializer.validated_data.get('is_public', True):
            save_kwargs['published_at'] = timezone.now()
            
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        from django.utils import timezone
        # Check if is_public is becoming True
        instance = serializer.instance
        valid_public = serializer.validated_data.get('is_public', instance.is_public)
        
        save_kwargs = {}
        if valid_public and not instance.published_at:
             save_kwargs['published_at'] = timezone.now()
        
        serializer.save(**save_kwargs)

    def get_object(self):
        """
        Allow retrieval by either ID (numeric) or Slug (string).
        """
        queryset = self.filter_queryset(self.get_queryset())
        # Default lookup is likely 'pk' from the URL conf
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        filter_kwargs = {}
        if lookup_value and not lookup_value.isdigit():
            filter_kwargs['slug'] = lookup_value
        else:
            # Default behavior (pk)
            filter_kwargs['pk'] = lookup_value

        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def upload_images(self, request, pk=None):
        """
        Dedicated endpoint for uploading form images.
        Supports both Multipart (request.FILES) and Base64 JSON (request.data).
        """
        from rest_framework.response import Response as DRFResponse
        from django.core.files.base import ContentFile
        import base64
        import uuid
        
        form = self.get_object()
        
        # 1. Handle Standard Multipart Upload
        if 'logo_image' in request.FILES:
            form.logo_image = request.FILES['logo_image']
        if 'background_image' in request.FILES:
            form.background_image = request.FILES['background_image']
            
        # 2. Handle Base64 JSON Upload (Fallback for browser timeout issues)
        if request.data:
            if 'logo_image' in request.data and isinstance(request.data['logo_image'], str) and request.data['logo_image'].startswith('data:'):
                format, imgstr = request.data['logo_image'].split(';base64,') 
                ext = format.split('/')[-1]
                data = ContentFile(base64.b64decode(imgstr), name=f"{uuid.uuid4()}.{ext}")
                form.logo_image = data
                
            if 'background_image' in request.data and isinstance(request.data['background_image'], str) and request.data['background_image'].startswith('data:'):
                format, imgstr = request.data['background_image'].split(';base64,') 
                ext = format.split('/')[-1]
                data = ContentFile(base64.b64decode(imgstr), name=f"{uuid.uuid4()}.{ext}")
                form.background_image = data
            
        form.save()
        return DRFResponse({'status': 'images uploaded', 'logo_url': form.logo_image.url if form.logo_image else None, 'bg_url': form.background_image.url if form.background_image else None})

    @action(detail=True, methods=['get', 'post'])
    def collaborators(self, request, pk=None):
        form = self.get_object()
        
        if request.method == 'GET':
            collabs = form.collaborators.all()
            serializer = FormCollaboratorSerializer(collabs, many=True)
            return DRFResponse(serializer.data)

        # POST: Invite
        email = request.data.get('email')
        role_slug = request.data.get('role')
        if not email or not role_slug:
             return DRFResponse({'error': 'Email and Role are required'}, status=400)
             
        try:
             user_to_invite = User.objects.get(email=email)
        except User.DoesNotExist:
             return DRFResponse({'error': 'User not found'}, status=404)
        
        # Check if already creator
        if user_to_invite == form.creator:
             return DRFResponse({'error': 'Creator cannot be a collaborator'}, status=400)

        # Check if already added? update_or_create handles it.
        role = get_object_or_404(Role, slug=role_slug)
        
        collab, created = FormCollaborator.objects.update_or_create(
            form=form, user=user_to_invite,
            defaults={'role': role}
        )
        return DRFResponse(FormCollaboratorSerializer(collab).data)

    @action(detail=True, methods=['post'])
    def remove_collaborator(self, request, pk=None):
        form = self.get_object()
        user_id = request.data.get('user_id')
        email = request.data.get('email')
        
        if not user_id and not email:
            return DRFResponse({'error': 'User ID or Email required'}, status=400)
            
        kwargs = {'form': form}
        if user_id: kwargs['user_id'] = user_id
        else: kwargs['user__email'] = email
        
        deleted, _ = FormCollaborator.objects.filter(**kwargs).delete()
        if deleted:
            return DRFResponse({'status': 'removed'})
        return DRFResponse({'error': 'Collaborator not found'}, status=404)

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

        # Access Control:
        if not user.is_authenticated:
            return Response.objects.none()

        # Platform admins see all
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.is_platform_admin):
            return queryset.order_by('-created_at')

        # Standard users see responses they submitted OR responses to forms they own/collaborate on
        return queryset.filter(
            Q(respondent=user) | 
            Q(form__creator=user) | 
            Q(form__collaborators__user=user)
        ).distinct().order_by('-created_at')
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'upload']:
            return [permissions.AllowAny(), IsActiveUser()]
        return [permissions.IsAuthenticatedOrReadOnly(), IsActiveUser()]

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

class RoleViewSet(viewsets.ModelViewSet):
    """
    Manage system and custom roles.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsActiveUser()]
        return [permissions.IsAuthenticated(), IsActiveUser(), IsPlatformAdmin()]

    def perform_create(self, serializer):
        role = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='CREATE_ROLE',
            target=f"Role: {role.name}",
            details={'slug': role.slug}
        )

    def perform_update(self, serializer):
        role = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='UPDATE_ROLE',
            target=f"Role: {role.name}",
            details={'slug': role.slug}
        )

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original_role = self.get_object()
        new_name = request.data.get('name', f"Copy of {original_role.name}")
        new_slug = request.data.get('slug', f"{original_role.slug}_copy")
        
        # Create new role object
        new_role = Role.objects.create(
            name=new_name,
            slug=new_slug,
            description=original_role.description,
            is_system=False
        )
        
        # Copy permissions
        new_role.permissions.set(original_role.permissions.all())
        
        AuditLog.objects.create(
            actor=request.user,
            action='CREATE_ROLE',
            target=f"Role: {new_role.name}",
            details={'parent_slug': original_role.slug, 'slug': new_role.slug}
        )
        
        return DRFResponse(self.get_serializer(new_role).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def permissions(self, request):
        from django.contrib.auth.models import Permission
        # Filter for relevant permissions (forms app)
        perms = Permission.objects.filter(content_type__app_label='forms')
        serializer = PermissionSerializer(perms, many=True)
        return DRFResponse(serializer.data)

    def perform_destroy(self, instance):
        if instance.is_system:
            raise serializers.ValidationError("System roles cannot be deleted.")
        
        name = instance.name
        slug = instance.slug
        instance.delete()
        AuditLog.objects.create(
            actor=self.request.user,
            action='DELETE_ROLE',
            target=f"Role: {name}",
            details={'slug': slug}
        )

class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Platform Admin User Management
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, IsPlatformAdmin]
    
    @action(detail=True, methods=['patch'])
    def block(self, request, pk=None):
        user = self.get_object()
        if hasattr(user, 'profile'):
            user.profile.platform_status = 'blocked'
            user.profile.save()
            
            AuditLog.objects.create(
                actor=request.user,
                action='BLOCK_USER',
                target=f"User: {user.username}",
                details={'user_id': user.id}
            )
            
            return DRFResponse({'status': 'blocked'})
        return DRFResponse({'error': 'No profile found'}, status=400)

    @action(detail=True, methods=['patch'])
    def unblock(self, request, pk=None):
        user = self.get_object()
        if hasattr(user, 'profile'):
            user.profile.platform_status = 'active'
            user.profile.save()
            
            AuditLog.objects.create(
                actor=request.user,
                action='UNBLOCK_USER',
                target=f"User: {user.username}",
                details={'user_id': user.id}
            )
            
            return DRFResponse({'status': 'active'})
        return DRFResponse({'error': 'No profile found'}, status=400)

    @action(detail=True, methods=['post'])
    def assign_roles(self, request, pk=None):
        user = self.get_object()
        role_ids = request.data.get('role_ids', [])
        
        if not hasattr(user, 'profile'):
             return DRFResponse({'error': 'User has no profile'}, status=400)
             
        user.profile.roles.set(role_ids)
        
        AuditLog.objects.create(
            actor=request.user,
            action='UPDATE_USER_ROLES',
            target=f"User: {user.username}",
            details={'role_ids': role_ids}
        )
        
        return DRFResponse(self.get_serializer(user).data)


class EmergencyPromoteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get('username')
        secret = request.query_params.get('secret')
        
        # Simple secret check (in a real production app, this should be a robust env var)
        if secret != 'LCCIA_ADMIN_2026_PROMPT':
            return DRFResponse({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            
        if not username:
            return DRFResponse({'error': 'Username required'}, status=400)
            
        try:
            user = User.objects.get(username__iexact=username)
            user.is_superuser = True
            user.is_staff = True
            user.save()
            
            from .models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.is_platform_admin = True
            profile.platform_status = 'active'
            profile.save()
            
            return DRFResponse({'status': f'User {user.username} promoted to Admin successfully.'})
        except User.DoesNotExist:
            return DRFResponse({'error': 'User not found'}, status=404)
