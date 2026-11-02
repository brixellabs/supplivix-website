"""
Core views including health check endpoint with database retry logic for Neon.
"""

import time

from django.db import connection
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint running SELECT 1 with retry on first attempt.
    Supports Neon serverless database wake-up.
    """
    db_status = 'disconnected'
    retries = 3
    delay = 1.0

    for attempt in range(retries):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1;')
                row = cursor.fetchone()
                if row and row[0] == 1:
                    db_status = 'connected'
                    break
        except Exception:
            if attempt < retries - 1:
                time.sleep(delay)
                delay *= 1.5
            else:
                db_status = 'error'

    status_code = 200 if db_status == 'connected' else 503
    return JsonResponse(
        {
            'status': 'healthy' if status_code == 200 else 'unhealthy',
            'database': db_status,
            'service': 'supplivix-backend',
        },
        status=status_code
    )
