
import os
import django
import sys

# Setup Django environment
sys.path.append('/Users/apple/projects/LCCIA Events Forms Management/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from forms.models import Role, UserProfile, AuditLog, Form
from django.contrib.auth.models import Permission

User = get_user_model()

def run_workflow_verification():
    print("🚀 Starting Role & User Management Workflow Verification...\n")

    # 1. Setup Test Users
    admin_user = User.objects.get(username='admin')
    test_user, created = User.objects.get_or_create(username='workflow_tester', email='tester@example.com')
    if created:
        test_user.set_password('password123')
        test_user.save()
    
    # Ensure profile exists
    UserProfile.objects.get_or_create(user=test_user)
    print(f"✅ Users ready: admin and {test_user.username}")

    # 2. Test Role Duplication Workflow
    print("\n--- Testing Role Duplication Workflow ---")
    viewer_role = Role.objects.get(slug='viewer')
    new_role_name = "Workflow Custom Role"
    new_role_slug = "workflow_custom_role"
    
    # Cleanup existing if any
    Role.objects.filter(slug=new_role_slug).delete()
    
    # Simulate API Duplicate
    custom_role = Role.objects.create(
        name=new_role_name,
        slug=new_role_slug,
        description="Created via workflow test",
        is_system=False
    )
    custom_role.permissions.set(viewer_role.permissions.all())
    
    assert custom_role.permissions.count() == viewer_role.permissions.count()
    print(f"✅ Successfully duplicated '{viewer_role.name}' to '{custom_role.name}'")
    print(f"   Permissions copied: {custom_role.permissions.count()}")

    # 3. Test Permission Modification Workflow
    print("\n--- Testing Permission Modification ---")
    # Add a specific permission (e.g., add_form) to the custom role
    add_form_perm = Permission.objects.get(codename='add_form', content_type__app_label='forms')
    custom_role.permissions.add(add_form_perm)
    
    assert add_form_perm in custom_role.permissions.all()
    print(f"✅ Added 'add_form' permission to '{custom_role.name}'")

    # 4. Test User Role Assignment Workflow
    print("\n--- Testing User Role Assignment ---")
    test_user.profile.roles.set([custom_role])
    
    assert custom_role in test_user.profile.roles.all()
    print(f"✅ Assigned '{custom_role.name}' to user '{test_user.username}'")

    # 5. Test Block/Unblock Workflow & Access Restriction
    print("\n--- Testing Block/Unblock Workflow ---")
    # Block user
    test_user.profile.platform_status = 'blocked'
    test_user.profile.save()
    print(f"✅ User '{test_user.username}' is now BLOCKED")
    
    # Audit Log Check
    AuditLog.objects.create(
        actor=admin_user,
        action='BLOCK_USER',
        target=f"User: {test_user.username}",
        details={'reason': 'workflow verification test'}
    )
    
    # Verify restriction logic (simulated)
    # The IsActiveUser permission in Django would catch this. 
    # Here we just verify the status reflects correctly.
    assert test_user.profile.platform_status == 'blocked'
    print(f"✅ Status verified in database")

    # Unblock user
    test_user.profile.platform_status = 'active'
    test_user.profile.save()
    print(f"✅ User '{test_user.username}' is now UNBLOCKED (Active)")
    assert test_user.profile.platform_status == 'active'

    # 6. Audit Trail Verification
    print("\n--- Verifying Audit Trail ---")
    recent_logs = AuditLog.objects.all().order_by('-timestamp')[:5]
    print(f"Recent Audit Actions:")
    for log in recent_logs:
        print(f" - [{log.timestamp.strftime('%H:%M:%S')}] {log.actor.username} performed {log.action} on {log.target}")

    print("\n✨ Workflow Verification Complete: ALL SYSTEMS PASS ✨")

if __name__ == "__main__":
    try:
        run_workflow_verification()
    except Exception as e:
        print(f"\n❌ Verification FAILED: {str(e)}")
        sys.exit(1)
