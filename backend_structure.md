backend/
  manage.py
  core/
    __init__.py
    settings.py
    urls.py                 # inclusion de /api/v1/
    asgi.py
    wsgi.py
    celery.py               # Celery config
    schema.py               # drf-spectacular (OpenAPI/Swagger)
    pagination.py           # pagination DRF partagée
    exceptions.py           # réponses d'erreurs standardisées
    permissions.py          # permissions globales (si besoin)

  apps/
    authentication/
      __init__.py
      apps.py
      models.py             # User, Role, Permission (RBAC)
      admin.py
      migrations/
        __init__.py
      api/
        serializers.py      # register/login/refresh...
        views.py            # endpoints /auth/*
        urls.py             # routes du module authentication
      permissions.py        # helpers de permissions (si besoin)
      services/
        auth_service.py     # logique métier (token, verification, etc.)
      tests/
        test_auth.py

    superadmin/
      __init__.py
      apps.py
      models.py             # Tenant, Plan, Subscription
      admin.py
      migrations/
        __init__.py
      api/
        serializers.py
        views.py            # endpoints /superadmin/*
        urls.py
      permissions.py
      services/
        tenant_service.py   # création/suspension/réactivation
      tests/

    pedagogy/
      __init__.py
      apps.py
      models.py             # SchoolYear, Level, Class, Subject, ...
      admin.py
      migrations/
        __init__.py
      api/
        serializers.py
        views.py            # endpoints /pedagogy/*
        urls.py
      permissions.py
      services/
        grading_service.py
        attendance_service.py
      tests/

    finance/
      __init__.py
      apps.py
      models.py             # FeeCategory, StudentFee, Payment, Invoice
      admin.py
      migrations/
        __init__.py
      api/
        serializers.py
        views.py            # endpoints /finance/*
        urls.py
      permissions.py
      services/
        billing_service.py
        payments_service.py
        invoice_service.py
      tests/

    monitoring/
      __init__.py
      apps.py
      models.py             # AuditLog, SystemAlert
      admin.py
      migrations/
        __init__.py
      api/
        serializers.py
        views.py            # endpoints /monitoring/*
        urls.py
      permissions.py
      tests/

    support/
      __init__.py
      apps.py
      models.py             # SupportTicket, TicketMessage
      admin.py
      migrations/
        __init__.py
      api/
        serializers.py
        views.py            # endpoints /support/*
        urls.py
      permissions.py
      services/
        ticket_service.py
      tests/

  integrations/
    __init__.py
    storage/
      s3_client.py          # MinIO/S3 via django-storages (config/adapter)
    messaging/
      sms_africastalking.py # envoi SMS
    email/
      sendgrid_client.py    # envoi emails
    push/
      firebase_client.py    # FCM
    payments/
      momo_orange.py        # webhooks + logique Mobile Money

  requirements.txt           # ou pyproject.toml selon ton choix
  .env.example