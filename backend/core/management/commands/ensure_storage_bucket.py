"""
core/management/commands/ensure_storage_bucket.py — INFRA-V2-01

Crée le bucket S3/MinIO cible (`AWS_STORAGE_BUCKET_NAME`) s'il n'existe pas
déjà — idempotent, sans effet si le bucket est déjà présent.

Étape de déploiement (staging/prod) ou de setup local — volontairement PAS
exécutée automatiquement au démarrage de Django : créer une ressource
d'infrastructure à chaque boot serait surprenant et masquerait un vrai
problème de provisioning derrière un correctif silencieux.

Usage : python manage.py ensure_storage_bucket
"""

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crée le bucket S3/MinIO cible s'il n'existe pas déjà (idempotent)."

    def handle(self, *args, **options):
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        try:
            client.head_bucket(Bucket=bucket)
            self.stdout.write(self.style.SUCCESS(f"Bucket « {bucket} » existe déjà — rien à faire."))
            return
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code not in ("404", "NoSuchBucket"):
                raise

        client.create_bucket(Bucket=bucket)
        self.stdout.write(self.style.SUCCESS(f"Bucket « {bucket} » créé."))
