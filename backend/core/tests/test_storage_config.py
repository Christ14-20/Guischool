"""
core/tests/test_storage_config.py — INFRA-V2-01

Garde-fou contre la régression exacte découverte pendant ce ticket :
`DEFAULT_FILE_STORAGE` (réglage legacy) n'est plus lu du tout par Django
depuis la 5.0 — seul `STORAGES` l'est depuis la 4.2. Le réglage legacy était
donc resté en place, silencieusement mort, alors que `default_storage`
retombait sur `FileSystemStorage` dans tous les environnements (dev ET
staging) — des dizaines de PDF de reçus réels ont fini sur disque local
plutôt que dans MinIO avant ce correctif.

Ce test n'a pas besoin d'une vraie connexion MinIO — il vérifie uniquement
que la configuration Django, telle que chargée par le module de settings
réel (config.settings.development, dont staging.py hérite du même bloc
STORAGES), pointe vers le bon backend. La vérification réseau réelle
(écriture + lecture via une URL générée) a été faite manuellement pendant
le développement de ce ticket, documentée dans le backlog.
"""

from django.conf import settings
from django.core.files.storage import default_storage


class TestStorageConfig:
    def test_storages_default_backend_is_s3(self):
        """
        `settings.STORAGES["default"]` est la SEULE clé que Django ≥5.0 lit
        réellement — `DEFAULT_FILE_STORAGE` (legacy) n'a plus aucun effet.
        """
        assert settings.STORAGES["default"]["BACKEND"] == "storages.backends.s3boto3.S3Boto3Storage"

    def test_default_storage_resolves_to_s3(self):
        """
        Preuve que `default_storage` (le proxy utilisé par tout le code
        applicatif — receipts, factures, bulletins) résout bien vers
        S3Boto3Storage, pas vers le FileSystemStorage par défaut de Django.
        """
        assert default_storage.__class__.__name__ == "S3Storage"

    def test_querystring_expire_is_long_lived(self):
        """
        Décision PO (2026-08-01) : receipt_pdf_url/pdf_url sont stockées de
        façon permanente en base — une expiration par défaut de 3600s (1h)
        casserait ces liens silencieusement après coup.
        """
        assert settings.AWS_QUERYSTRING_EXPIRE > 3600 * 24 * 365  # > 1 an
