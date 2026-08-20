from django.contrib.auth import get_user_model

def seed_default_users():
    User = get_user_model()
    
    # 1. Ensure Harshini admin user
    if not User.objects.filter(username='Harshini').exists():
        u = User.objects.create_user(
            username='Harshini',
            email='harshini@careconnect.com',
            password='Harshini@2008',
            first_name='Harshini',
            last_name='P',
            role='admin',
            is_staff=True,
            is_superuser=True,
            is_verified=True
        )
        print("Created default admin user: Harshini")
    else:
        u = User.objects.get(username='Harshini')
        u.set_password('Harshini@2008')
        u.role = 'admin'
        u.is_staff = True
        u.is_superuser = True
        u.save()

    # 2. Ensure Shinchan resident user
    if not User.objects.filter(username='Shinchan').exists():
        User.objects.create_user(
            username='Shinchan',
            email='shinchan@careconnect.com',
            password='Harshini@2008',
            first_name='Shinchan',
            last_name='Nohara',
            role='resident',
            is_verified=True
        )
        print("Created default resident user: Shinchan")
    else:
        u = User.objects.get(username='Shinchan')
        u.set_password('Harshini@2008')
        u.save()

    # 3. Ensure admin superuser
    if not User.objects.filter(username='admin').exists():
        User.objects.create_user(
            username='admin',
            email='admin@careconnect.com',
            password='Harshini@2008',
            first_name='System',
            last_name='Admin',
            role='admin',
            is_staff=True,
            is_superuser=True,
            is_verified=True
        )
        print("Created default admin user: admin")
    else:
        u = User.objects.get(username='admin')
        u.set_password('Harshini@2008')
        u.role = 'admin'
        u.save()
