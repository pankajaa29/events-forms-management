
from rest_framework import permissions
from .models import FormCollaborator

class IsPlatformAdmin(permissions.BasePermission):
    """
    Allows access only to platform admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        # Check profile
        if hasattr(request.user, 'profile'):
            return request.user.profile.is_platform_admin
        return False

class IsActiveUser(permissions.BasePermission):
    """
    Checks if the user's platform status is 'active'.
    Blocked users are denied access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True # Let other permissions (like IsAuthenticated) decide
        
        # Superusers are always active
        if request.user.is_superuser:
            return True
            
        if hasattr(request.user, 'profile'):
            if request.user.profile.platform_status == 'blocked':
                return False
        return True

class HasFormPermission(permissions.BasePermission):
    """
    Granular permission check for Forms based on Role.
    """
    
    # Map DRF actions to Permission Codenames
    # Note: 'view_form' etc are custom permissions we created.
    # 'change_form', 'delete_form' are Django defaults.
    perms_map = {
        'retrieve': 'forms.view_form',
        'list': 'forms.view_form', # List is special (filtered queryset), but object detail needs this
        'update': 'forms.change_form',
        'partial_update': 'forms.change_form',
        'destroy': 'forms.delete_form',
        'publish': 'forms.publish_form', # Custom action
        'share': 'forms.share_form',
        'collaborators': 'forms.share_form',
        'remove_collaborator': 'forms.share_form',
        'results': 'forms.view_responses',
        'export': 'forms.export_responses', # Custom action
    }

    def has_object_permission(self, request, view, obj):
        # 1. Platform Admin / Superuser
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'profile') and request.user.profile.is_platform_admin:
            return True
            
        # 2. Creator / Owner
        if obj.creator == request.user:
            return True
            
        # 3. Collaborator
        try:
            collab = FormCollaborator.objects.select_related('role').get(form=obj, user=request.user)
            # Determine required permission for this action
            action = view.action
            if not action:
                # Fallback for standard methods if action is not set (e.g. generic views)
                if request.method in permissions.SAFE_METHODS:
                    required_perm = 'forms.view_form'
                elif request.method == 'DELETE':
                    required_perm = 'forms.delete_form'
                else:
                    required_perm = 'forms.change_form'
            else:
                required_perm = self.perms_map.get(action)
            
            if not required_perm:
                return False # Unknown action, deny by default
                
            # Check if role has this permission
            # role.permissions is a ManyToMany.
            # We can check: collab.role.permissions.filter(codename=codename, app_label='forms').exists()
            # To avoid DB hit on every request, we might want to cache this or prefetch.
            # For now, simplistic check:
            perm_codename = required_perm.split('.')[-1]
            return collab.role.permissions.filter(codename=perm_codename).exists()

        except FormCollaborator.DoesNotExist:
            return False # Not a collaborator
