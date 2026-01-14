
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import Permission
from forms.models import Role

def init_roles():
    print("Initializing System Roles...")
    
    # 1. Editor
    editor, created = Role.objects.get_or_create(
        name='Editor',
        defaults={'slug': 'editor', 'is_system': True, 'description': 'Full edit access and viewing responses'}
    )
    if created:
        print("Created Role: Editor")
    
    # Editor Permissions
    # They can Change Form, View Form, Publish, Share, View Responses, Export Responses
    # But NOT Delete Form (that's for Owner)
    editor_perms = [
        'change_form', 'view_form', 'publish_form', 'share_form', 
        'view_responses', 'export_responses'
    ]
    for codename in editor_perms:
        try:
            perm = Permission.objects.get(codename=codename, content_type__app_label='forms')
            editor.permissions.add(perm)
        except Permission.DoesNotExist:
            print(f"Warning: Permission {codename} not found")
    
    # 2. Viewer
    viewer, created = Role.objects.get_or_create(
        name='Viewer',
        defaults={'slug': 'viewer', 'is_system': True, 'description': 'Read-only access to form structure'}
    )
    if created:
        print("Created Role: Viewer")
        
    viewer_perms = ['view_form'] # Can they view results? Maybe create a separate 'Result Viewer' role.
    # The requirement says "Collaborator... View responses (optional)".
    # Let's create 'Viewer' (Structure only) and 'Analyst' (Responses only).
    
    for codename in viewer_perms:
        try:
            perm = Permission.objects.get(codename=codename, content_type__app_label='forms')
            viewer.permissions.add(perm)
        except Permission.DoesNotExist:
            print(f"Warning: Permission {codename} not found")

    # 3. Analyst (Reviewer)
    analyst, created = Role.objects.get_or_create(
        name='Analyst',
        defaults={'slug': 'analyst', 'is_system': True, 'description': 'Can view and export responses'}
    )
    if created:
        print("Created Role: Analyst")
        
    analyst_perms = ['view_form', 'view_responses', 'export_responses']
    for codename in analyst_perms:
         try:
            perm = Permission.objects.get(codename=codename, content_type__app_label='forms')
            analyst.permissions.add(perm)
         except Permission.DoesNotExist:
            print(f"Warning: Permission {codename} not found")

    print("System Roles Initialized.")

if __name__ == "__main__":
    init_roles()
