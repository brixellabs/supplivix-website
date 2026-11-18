from rest_framework import serializers

from .models import Certificate, ContactMessage, WaitlistEntry


class CertificateSerializer(serializers.ModelSerializer):
    image_url = serializers.ReadOnlyField()

    class Meta:
        model = Certificate
        fields = [
            'id',
            'name',
            'badge_code',
            'subtitle',
            'issuer',
            'image',
            'image_url',
            'description',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at',
        ]


class WaitlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = ['email', 'source']


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'subject', 'message']

    def validate_name(self, value):
        val = value.strip()
        if not (2 <= len(val) <= 80):
            raise serializers.ValidationError('Name must be between 2 and 80 characters.')
        return val

    def validate_message(self, value):
        val = value.strip()
        if not (10 <= len(val) <= 1000):
            raise serializers.ValidationError('Message must be between 10 and 1000 characters.')
        return val
