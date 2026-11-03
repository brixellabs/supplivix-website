import re

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address, User


def normalize_pakistani_phone(phone_str):
    """Normalize Pakistani phone to +923XXXXXXXXX format."""
    if not phone_str:
        return ''
    cleaned = re.sub(r'[\s\-()]', '', phone_str)
    if cleaned.startswith('+92'):
        digits = cleaned[3:]
    elif cleaned.startswith('0'):
        digits = cleaned[1:]
    elif cleaned.startswith('92'):
        digits = cleaned[2:]
    else:
        digits = cleaned

    if not (digits.startswith('3') and len(digits) == 10 and digits.isdigit()):
        raise serializers.ValidationError('Invalid Pakistani mobile number. Must match 03XXXXXXXXX or +923XXXXXXXXX.')
    return f"+92{digits}"


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'is_staff', 'date_joined']
        read_only_fields = ['id', 'email', 'is_staff', 'date_joined']


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        norm = value.strip().lower()
        if User.objects.filter(email=norm).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return norm

    def validate_phone(self, value):
        if value:
            return normalize_pakistani_phone(value)
        return ''

    def validate_password(self, value):
        validate_password(value)
        if not re.search(r'\d', value):
            raise serializers.ValidationError('Password must contain at least one digit.')
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError('Password must contain at least one letter.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            password=validated_data['password']
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        from django.core.cache import cache

        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        lockout_key = f"failed_logins_{email}"
        failed_count = cache.get(lockout_key, 0)

        if failed_count >= 5:
            raise serializers.ValidationError(
                'Account temporarily locked due to 5 consecutive failed login attempts. Please wait 15 minutes or reset your password.'
            )

        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            cache.set(lockout_key, failed_count + 1, timeout=900)
            request = self.context.get('request')
            if request:
                from core.models import FailedLoginLog
                ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1')).split(',')[0].strip()
                FailedLoginLog.objects.create(
                    email=email,
                    ip_address=ip or '127.0.0.1',
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
                )
            # Identical error message for unknown email and wrong password
            raise serializers.ValidationError('Invalid email or password.')

        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')

        # Reset failed count on successful login
        cache.delete(lockout_key)
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Incorrect existing password.')
        return value

    def validate_new_password(self, value):
        validate_password(value)
        if not re.search(r'\d', value):
            raise serializers.ValidationError('Password must contain at least one digit.')
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError('Password must contain at least one letter.')
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    uid = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        if not re.search(r'\d', value):
            raise serializers.ValidationError('Password must contain at least one digit.')
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError('Password must contain at least one letter.')
        return value


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'full_name', 'phone', 'line1', 'line2',
            'city', 'province', 'postal_code', 'is_default', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def validate_phone(self, value):
        return normalize_pakistani_phone(value)
