from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum

from apps.superadmin.models import TenantNetwork, Tenant
from apps.pedagogy.models import Student, YearEndDecision
from apps.finance.models import Payment
from apps.authentication.permissions import IsNetworkAdmin
from apps.superadmin.api.serializers import TenantSerializer


class NetworkDashboardView(APIView):
    """
    Retourne les indicateurs clés (KPIs) agrégés pour le réseau d'écoles.
    """
    permission_classes = [IsNetworkAdmin]

    def get(self, request):
        user = request.user
        
        # Récupération du réseau géré par l'administrateur
        if user.is_superuser:
            # Pour un superadmin, on prend le premier réseau ou on permet un filtrage par query parameter
            network_id = request.query_params.get("network_id")
            if network_id:
                network = TenantNetwork.objects.filter(id=network_id).first()
            else:
                network = TenantNetwork.objects.first()
        else:
            network = user.managed_networks.first()

        if not network:
            return Response(
                {"status": "error", "message": "Aucun réseau d'écoles trouvé ou associé à cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. Effectifs totaux (élèves)
        total_students = Student.objects.filter(tenant__network=network).count()
        active_students = Student.objects.filter(tenant__network=network, statut="ACTIF").count()

        # 2. Chiffre d'Affaires consolidé (somme des paiements complétés)
        ca_total = Payment.objects.filter(
            tenant__network=network, 
            status="COMPLETED"
        ).aggregate(total=Sum("amount"))["total"] or 0

        # 3. Taux de réussite consolidé (décisions de fin d'année ADMIS ou ORIENTE)
        decisions = YearEndDecision.objects.filter(eleve__tenant__network=network)
        total_decisions = decisions.count()
        success_decisions = decisions.filter(decision__in=["ADMIS", "ORIENTE"]).count()
        
        success_rate = (
            round((success_decisions / total_decisions) * 100, 2)
            if total_decisions > 0
            else 0.0
        )

        return Response({
            "status": "success",
            "data": {
                "network_id": network.id,
                "network_name": network.name,
                "schools_count": network.tenants.count(),
                "kpis": {
                    "total_students": total_students,
                    "active_students": active_students,
                    "revenue_total_gnf": float(ca_total),
                    "success_rate_percent": success_rate,
                    "total_decisions_recorded": total_decisions
                }
            }
        })


class NetworkSchoolsView(APIView):
    """
    Retourne la liste des écoles (tenants) associées au réseau.
    """
    permission_classes = [IsNetworkAdmin]

    def get(self, request):
        user = request.user
        
        # Récupération du réseau
        if user.is_superuser:
            network_id = request.query_params.get("network_id")
            if network_id:
                network = TenantNetwork.objects.filter(id=network_id).first()
            else:
                network = TenantNetwork.objects.first()
        else:
            network = user.managed_networks.first()

        if not network:
            return Response(
                {"status": "error", "message": "Aucun réseau d'écoles trouvé ou associé à cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND
            )

        schools = network.tenants.all()
        serializer = TenantSerializer(schools, many=True)

        return Response({
            "status": "success",
            "data": serializer.data
        })
