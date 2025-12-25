#!/usr/bin/env python
"""
Script to create a normal user for the invoice application
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoice_app.settings')
django.setup()

from django.contrib.auth.models import User
from invoices.models import UserProfile

def create_user():
    print("=== Create New User ===\n")
    
    username = input("Username: ").strip()
    if not username:
        print("Error: Username cannot be empty")
        return
    
    if User.objects.filter(username=username).exists():
        print(f"Error: User '{username}' already exists")
        return
    
    email = input("Email (optional): ").strip()
    first_name = input("First name (optional): ").strip()
    last_name = input("Last name (optional): ").strip()
    password = input("Password: ").strip()
    
    if not password:
        print("Error: Password cannot be empty")
        return
    
    # Create user
    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=password,
        is_staff=False,
        is_superuser=False,
        is_active=True
    )
    
    # Create or update user profile
    profile, created = UserProfile.objects.get_or_create(user=user)
    profile.must_change_password = False
    profile.save()
    
    print(f"\n✓ User '{username}' created successfully!")
    print(f"  - Email: {email or 'Not set'}")
    print(f"  - Name: {first_name} {last_name}".strip() or "  - Name: Not set")
    print(f"  - Is Staff: No")
    print(f"  - Is Active: Yes")
    print(f"\nUser can now login at: http://localhost:8000/")

if __name__ == '__main__':
    try:
        create_user()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
    except Exception as e:
        print(f"\nError: {e}")
