from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FormViewSet, SectionViewSet, QuestionViewSet, OptionViewSet, ResponseViewSet, AnswerViewSet, RegisterView

router = DefaultRouter()
router.register(r'forms', FormViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'options', OptionViewSet)
router.register(r'responses', ResponseViewSet, basename='response')
router.register(r'answers', AnswerViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
]
