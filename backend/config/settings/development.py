from .base import *

# CONFIGURATION DE DÉVELOPPEMENT
DEBUG = True
ALLOWED_HOSTS = ["*"]

# CORS pour le développement
CORS_ALLOW_ALL_ORIGINS = True

# Cache local en mémoire pour simplifier en dev si Redis n'est pas lancé
# Mais base.py utilise Redis, ce qui est parfait pour le dev via Docker.
