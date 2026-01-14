from django.contrib.auth.models import User, Permission
from rest_framework import serializers
from .models import Form, Section, Question, Option, Response, Answer, UserProfile, Role, FormCollaborator

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

class RoleSerializer(serializers.ModelSerializer):
    permissions_details = PermissionSerializer(source='permissions', many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'slug', 'description', 'is_system', 'permissions', 'permissions_details']
        extra_kwargs = {
            'permissions': {'write_only': True}
        }

class FormCollaboratorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    role_slug = serializers.CharField(source='role.slug', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = FormCollaborator
        fields = ['id', 'user', 'user_email', 'user_username', 'role', 'role_slug', 'role_name', 'invited_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    mobile_number = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'mobile_number', 'password')

    def create(self, validated_data):
        mobile_number = validated_data.pop('mobile_number', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        UserProfile.objects.create(user=user, mobile_number=mobile_number)
        return user

class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'order']

class QuestionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    temp_id = serializers.CharField(required=False, write_only=True)
    options = OptionSerializer(many=True, required=False)
    
    class Meta:
        model = Question
        fields = [
            'id', 'temp_id', 'section', 'text', 'help_text', 'question_type', 
            'is_required', 'order', 'validation_rules', 'logic_rules', 'options'
        ]
        extra_kwargs = {'section': {'required': False}}

class SectionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    questions = QuestionSerializer(many=True)
    
    class Meta:
        model = Section
        fields = ['id', 'form', 'title', 'description', 'order', 'questions']
        extra_kwargs = {'form': {'required': False}}

class FormSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True)
    creator_username = serializers.SerializerMethodField()
    has_responded = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Form
        fields = [
            'id', 'title', 'description', 'creator', 'creator_username', 
            'is_public', 'created_at', 'updated_at', 'published_at', 'slug',
            'is_active', 'expiry_at', 'inactive_message',
            'sections',
            'primary_color', 'background_color', 'logo_image', 'logo_alignment', 'background_image',
            'notify_creator', 'notify_respondent', 'email_subject', 'email_body', 'allow_multiple_responses',
            'has_responded', 'my_role'
        ]
        read_only_fields = ['creator', 'has_responded']

    def get_creator_username(self, obj):
        return obj.creator.username if obj.creator else None

    def get_has_responded(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from django.apps import apps
            Response = apps.get_model('forms', 'Response')
            return Response.objects.filter(form=obj, respondent=request.user).exists()
        return False

    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.creator == request.user:
            return 'owner'
        
        # Check collaborators
        # Optimization: using filter().first()
        collab = obj.collaborators.filter(user=request.user).select_related('role').first()
        return collab.role.slug if collab else None



    def create(self, validated_data):
        sections_data = validated_data.pop('sections', [])
        form = Form.objects.create(**validated_data)
        
        # Map for resolving temp_ids in logic rules
        temp_id_map = {}

        for section_data in sections_data:
            questions_data = section_data.pop('questions', [])
            section = Section.objects.create(form=form, **section_data)
            for question_data in questions_data:
                question_data.pop('section', None)
                options_data = question_data.pop('options', [])
                temp_id = question_data.pop('temp_id', None) # Fix: Remove temp_id

                question = Question.objects.create(section=section, **question_data)
                
                if temp_id:
                    temp_id_map[str(temp_id)] = question.id

                for opt_data in options_data:
                    Option.objects.create(question=question, **opt_data)
        
        # Second Pass: Resolve Logic Rules
        for section in form.sections.all():
            for question in section.questions.all():
                if question.logic_rules and 'condition' in question.logic_rules:
                    condition = question.logic_rules['condition']
                    target_q_id = str(condition.get('question_id'))
                    
                    if target_q_id in temp_id_map:
                        condition['question_id'] = temp_id_map[target_q_id]
                        question.save()

        return form

    def update(self, instance, validated_data):
        print(f"DEBUG: Entering FormSerializer.update with data: {validated_data.keys()}")
        sections_data = validated_data.pop('sections', None)
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.is_public = validated_data.get('is_public', instance.is_public)
        instance.slug = validated_data.get('slug', instance.slug)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.expiry_at = validated_data.get('expiry_at', instance.expiry_at)
        instance.inactive_message = validated_data.get('inactive_message', instance.inactive_message)
        
        # Branding fields
        instance.primary_color = validated_data.get('primary_color', instance.primary_color)
        instance.background_color = validated_data.get('background_color', instance.background_color)
        instance.logo_alignment = validated_data.get('logo_alignment', instance.logo_alignment)
        instance.notify_creator = validated_data.get('notify_creator', instance.notify_creator)
        instance.notify_respondent = validated_data.get('notify_respondent', instance.notify_respondent)
        instance.email_subject = validated_data.get('email_subject', instance.email_subject)
        instance.email_body = validated_data.get('email_body', instance.email_body)
        instance.allow_multiple_responses = validated_data.get('allow_multiple_responses', instance.allow_multiple_responses)
        
        # Handle images
        if 'logo_image' in validated_data:
            print(f"DEBUG: Updating logo_image: {validated_data['logo_image']}")
            instance.logo_image = validated_data['logo_image']
        if 'background_image' in validated_data:
            print(f"DEBUG: Updating background_image: {validated_data['background_image']}")
            instance.background_image = validated_data['background_image']
            
        print("DEBUG: Saving instance...")
        instance.save()
        print("DEBUG: Instance saved.")

        if sections_data is not None:
            # Map for resolving temp_ids in logic rules
            # Key: temp_id (str), Value: real_id (int)
            temp_id_map = {}
            
            # 1. Update/Create Sections
            existing_section_ids = [s.id for s in instance.sections.all()]
            incoming_section_ids = [item.get('id') for item in sections_data if item.get('id')]
            
            # Delete removed sections
            for sec_id in existing_section_ids:
                if sec_id not in incoming_section_ids:
                    Section.objects.filter(id=sec_id).delete()
            
            for section_data in sections_data:
                section_id = section_data.get('id')
                questions_data = section_data.pop('questions', [])
                section_data.pop('form', None)

                if section_id:
                    section = Section.objects.get(id=section_id, form=instance)
                    for attr, value in section_data.items():
                        setattr(section, attr, value)
                    section.save()
                else:
                    section = Section.objects.create(form=instance, **section_data)

                # 2. Update/Create Questions within Section
                existing_question_ids = [q.id for q in section.questions.all()]
                incoming_question_ids = [q.get('id') for q in questions_data if q.get('id')]

                # Delete removed questions
                for q_id in existing_question_ids:
                    if q_id not in incoming_question_ids:
                        Question.objects.filter(id=q_id).delete()

                for q_data in questions_data:
                    q_id = q_data.get('id')
                    temp_id = q_data.pop('temp_id', None) # Extract temp_id if present
                    q_data.pop('section', None)
                    options_data = q_data.pop('options', [])
                    
                    if q_id:
                        question = Question.objects.get(id=q_id, section=section)
                        for attr, value in q_data.items():
                            setattr(question, attr, value)
                        question.save()
                    else:
                        question = Question.objects.create(section=section, **q_data)
                        if temp_id:
                            temp_id_map[str(temp_id)] = question.id

                    # 3. Update Options
                    existing_opt_ids = [o.id for o in question.options.all()]
                    incoming_opt_ids = [o.get('id') for o in options_data if o.get('id')]

                    for o_id in existing_opt_ids:
                        if o_id not in incoming_opt_ids:
                            Option.objects.filter(id=o_id).delete()

                    for opt_data in options_data:
                        opt_id = opt_data.get('id')
                        if opt_id:
                            opt = Option.objects.get(id=opt_id, question=question)
                            for attr, value in opt_data.items():
                                setattr(opt, attr, value)
                            opt.save()
                        else:
                            Option.objects.create(question=question, **opt_data)
            
            # 4. Second Pass: Resolve Logic Rules
            # Iterate through all questions in the form to update logic references
            for section in instance.sections.all():
                for question in section.questions.all():
                    if question.logic_rules and 'condition' in question.logic_rules:
                        condition = question.logic_rules['condition']
                        target_q_id = str(condition.get('question_id'))
                        
                        # If target is a temp_id, replace with real ID
                        if target_q_id in temp_id_map:
                            condition['question_id'] = temp_id_map[target_q_id]
                            question.save()
                            
        return instance

class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'question', 'question_text', 'value']

class ResponseSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Response
        fields = ['id', 'form', 'respondent', 'created_at', 'answers']
        read_only_fields = ['respondent', 'created_at']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        response = Response.objects.create(**validated_data)
        for answer_data in answers_data:
            Answer.objects.create(response=response, **answer_data)
        return response

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class AdminUserSerializer(serializers.ModelSerializer):
    platform_status = serializers.CharField(source='profile.platform_status', read_only=True)
    is_platform_admin = serializers.BooleanField(source='profile.is_platform_admin', read_only=True)
    roles = RoleSerializer(source='profile.roles', many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'platform_status', 'is_platform_admin', 'roles']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        
        data['is_superuser'] = self.user.is_superuser
        
        # Add Admin/Status info
        if hasattr(self.user, 'profile'):
            data['is_platform_admin'] = self.user.profile.is_platform_admin
            data['platform_status'] = self.user.profile.platform_status
        else:
            data['is_platform_admin'] = False
            data['platform_status'] = 'active' # Default
            
        return data
