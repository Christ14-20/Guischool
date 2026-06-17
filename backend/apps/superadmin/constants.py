"""Constantes partagées pour la configuration tenant (ARCH-03)."""

VALID_EDUCATION_CYCLES = {
    "MATERNELLE", "PRIMAIRE", "CQP", "COLLEGE", "LYCEE_GEN",
    "LYCEE_TECH", "ETFP_A", "ETFP_B", "SUPERIEUR",
}

VALID_EXAM_TYPES = {
    "CEP", "BEPC", "BAC", "CAP", "BT", "BTS", "DEF", "PROBAC",
}

# Mapping drapeaux tenant → clé module plan (modules_activated)
TENANT_MODULE_FLAGS = {
    "has_internat": "internat",
    "has_transport": "transport",
    "has_cantine": "cantine",
    "has_bibliotheque": "bibliotheque",
    "has_labo": "labo",
    "has_official_exams": "official_exams",
    "has_payroll": "payroll",
    "has_whatsapp": "whatsapp",
    "has_offline_advanced": "offline_advanced",
    "has_predictive_analytics": "predictive_analytics",
}
