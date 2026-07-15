import os
from celery import Celery

# Définir le module de configuration Django par défaut pour le programme celery.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("eduguinee")

# Utiliser une chaîne de caractères ici signifie que le worker n'a pas besoin de
# sérialiser l'objet de configuration pour les processus enfants.
# Le préfixe CELERY_ indique que toutes les clés de configuration associées à celery
# doivent avoir ce préfixe.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Charger les modules de tâches de toutes les configurations d'applications Django enregistrées.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
