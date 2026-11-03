from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.security import evaluate_risk

from .models import Address, User
from .serializers import (
    AddressSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def post(self, request):
        action, score = evaluate_risk(request)
        if action == 'honeypot_fake_success':
            return Response(
                {
                    'message': 'Registration successful.',
                    'user': {
                        'id': 9999,
                        'email': request.data.get('email', 'bot@example.com'),
                        'full_name': request.data.get('full_name', 'Customer'),
                        'phone': '',
                        'is_staff': False,
                    },
                },
                status=status.HTTP_201_CREATED
            )
        if action == 'token_expired':
            return Response(
                {'code': 'token_expired', 'message': 'Form session expired. Please refresh and try again.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if action == 'block':
            return Response(
                {'code': 'bot_blocked', 'message': 'Access denied due to automated activity detection.', 'fields': {}},
                status=status.HTTP_403_FORBIDDEN
            )
        if action == 'challenge_required':
            return Response(
                {
                    'code': 'challenge_required',
                    'message': 'Security verification challenge required. Please complete Cloudflare Turnstile.',
                    'fields': {'turnstile_token': ['Turnstile challenge verification required.']}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = RegisterSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(
            {
                'message': 'Registration successful.',
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        failed_count = cache.get(f"failed_logins_{email}", 0) if email else 0
        required_challenge = failed_count >= 3

        action, score = evaluate_risk(request, required_challenge=required_challenge)
        if action == 'honeypot_fake_success':
            return Response(
                {
                    'message': 'Login successful.',
                    'user': {
                        'id': 9999,
                        'email': email or 'customer@example.com',
                        'full_name': 'Customer',
                        'phone': '',
                        'is_staff': False,
                    },
                },
                status=status.HTTP_200_OK
            )
        if action == 'token_expired':
            return Response(
                {'code': 'token_expired', 'message': 'Form session expired. Please refresh and try again.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if action == 'block':
            return Response(
                {'code': 'bot_blocked', 'message': 'Access denied due to automated activity detection.', 'fields': {}},
                status=status.HTTP_403_FORBIDDEN
            )
        if action == 'challenge_required':
            return Response(
                {
                    'code': 'challenge_required',
                    'message': 'Security verification challenge required after consecutive failed attempts.',
                    'fields': {'turnstile_token': ['Turnstile challenge verification required.']}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(
            {
                'message': 'Login successful.',
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_200_OK
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        login(request, user)  # keep session valid after password update
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()

        # Always return identical response to prevent email enumeration
        if user:
            _token = default_token_generator.make_token(user)
            _uid = urlsafe_base64_encode(force_bytes(user.pk))
            # In production, dispatch email with reset link: /reset-password?uid={_uid}&token={_token}

        return Response(
            {'message': 'If an active account exists for this email, password reset instructions have been sent.'},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'code': 'invalid_token', 'message': 'Invalid or expired password reset link.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )

        token = serializer.validated_data['token']
        if not default_token_generator.check_token(user, token):
            return Response(
                {'code': 'invalid_token', 'message': 'Invalid or expired password reset link.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
