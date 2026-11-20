"""
Core views including health check endpoint with database retry logic for Neon.
"""

import time

from django.db import connection
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(['GET', 'HEAD', 'OPTIONS'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint running SELECT 1 with retry on first attempt.
    Supports Neon serverless database wake-up and Render keep-alive heartbeat.
    """
    if request.method == 'OPTIONS':
        response = JsonResponse({'status': 'ok'})
        response['Allow'] = 'GET, HEAD, OPTIONS'
        return response

    db_status = 'disconnected'
    retries = 3
    delay = 1.0

    is_quick = request.GET.get('quick') in ('1', 'true', 'yes')

    if not is_quick:
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
    else:
        db_status = 'skipped'

    status_code = 200 if db_status in ('connected', 'skipped') else 503
    response = JsonResponse(
        {
            'status': 'healthy' if status_code == 200 else 'unhealthy',
            'database': db_status,
            'service': 'supplivix-backend',
            'timestamp': int(time.time()),
        },
        status=status_code
    )
    # Ensure intermediate proxies, CDNs, and browsers do not cache heartbeat keep-alive responses
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response
