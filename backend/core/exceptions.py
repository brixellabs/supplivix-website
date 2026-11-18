"""
Consistent API error handler for DRF views.
Output format:
{
    "code": "validation_error | authentication_failed | ...",
    "message": "Human readable summary",
    "fields": {
        "field_name": ["Specific error message"]
    }
}
"""

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data
        code = 'error'
        message = 'An error occurred.'
        fields = {}

        if isinstance(data, dict):
            if 'detail' in data:
                message = str(data['detail'])
                code = getattr(exc, 'default_code', 'error')
            else:
                code = 'validation_error'
                reasons = []
                for key, val in data.items():
                    if isinstance(val, list):
                        fields[key] = [str(v) for v in val]
                        reasons.extend([str(v) for v in val])
                    else:
                        fields[key] = [str(val)]
                        reasons.append(str(val))
                if reasons:
                    message = f"Validation failed: {' '.join(reasons)}"
                else:
                    message = 'Validation failed.'
        elif isinstance(data, list):
            code = 'validation_error'
            fields['non_field_errors'] = [str(v) for v in data]
            message = f"Validation failed: {' '.join(str(v) for v in data)}" if data else 'Validation failed.'

        formatted_data = {
            'code': code,
            'message': message,
            'fields': fields,
        }
        response.data = formatted_data
    else:
        # SEC-11: Generic error message for unhandled 500 exceptions, zero stack traces/secrets leaked
        import logging

        from rest_framework import status
        from rest_framework.response import Response

        logger = logging.getLogger('core.security')
        logger.error(f"Unhandled API error: {exc.__class__.__name__}: {exc}")
        response = Response(
            {
                'code': 'internal_server_error',
                'message': 'An internal server error occurred. Our team has been notified.',
                'fields': {},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
