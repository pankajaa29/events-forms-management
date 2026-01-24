from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

class OptimizedAuthBackend(ModelBackend):
    """
    Custom authentication backend that optimizes user retrieval
    by prefetching the related profile, avoiding N+1 queries during login.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        
        try:
            # Optimize: Fetch user AND profile in one query
            user = UserModel.objects.select_related('profile').get(**{UserModel.USERNAME_FIELD: username})
        except UserModel.DoesNotExist:
            # Run the default password hasher once to reduce timing attacks
            UserModel().set_password(password)
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        return None
