from rest_framework import serializers

from .models import ContactMessage, WaitlistEntry


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
