from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FormViewSet, SectionViewSet, QuestionViewSet, OptionViewSet, 
    ResponseViewSet, AnswerViewSet, RegisterView, UploadView,
    RoleViewSet, AdminUserViewSet, ProductionSetupView
)

router = DefaultRouter()
router.register(r'forms', FormViewSet, basename='form') # Explicit basename good practice
router.register(r'sections', SectionViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'options', OptionViewSet)
router.register(r'responses', ResponseViewSet, basename='response')
router.register(r'answers', AnswerViewSet)
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('upload/', UploadView.as_view(), name='upload'),
    path('prod-setup/', ProductionSetupView.as_view(), name='prod-setup'),
]
