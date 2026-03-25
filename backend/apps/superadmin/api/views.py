from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


@require_http_methods(["GET", "POST", "PATCH", "PUT", "DELETE"])
def not_implemented(request):
    """
    Placeholder endpoint. Les vraies vues seront ajoutées après la modélisation
    Tenant/Plan/Subscription.
    """
    return JsonResponse(
        {"status": "error", "message": "Not implemented (placeholder)"},
        status=501,
    )

