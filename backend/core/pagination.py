"""
core/pagination.py

Pagination standard — §0.4 du contrat d'API.
page_size par défaut : 25, max : 100.

Réponse paginée :
{
  "status": "success",
  "data": {
    "count": 143,
    "next": "https://api.../students/?page=3&page_size=25",
    "previous": "https://api.../students/?page=1&page_size=25",
    "results": [...]
  }
}
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "status": "success",
                "data": {
                    "count": self.page.paginator.count,
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                    "results": data,
                },
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "status": {"type": "string", "example": "success"},
                "data": {
                    "type": "object",
                    "properties": {
                        "count": {"type": "integer"},
                        "next": {"type": "string", "nullable": True},
                        "previous": {"type": "string", "nullable": True},
                        "results": schema,
                    },
                },
            },
        }
