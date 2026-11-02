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
                message = 'Validation failed.'
                for key, val in data.items():
                    if isinstance(val, list):
                        fields[key] = [str(v) for v in val]
                    else:
                        fields[key] = [str(val)]
        elif isinstance(data, list):
            code = 'validation_error'
            message = 'Validation failed.'
            fields['non_field_errors'] = [str(v) for v in data]

        formatted_data = {
            'code': code,
            'message': message,
            'fields': fields,
        }
        response.data = formatted_data

    return response
