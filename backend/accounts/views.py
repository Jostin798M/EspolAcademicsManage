from django.contrib.auth import authenticate, login, logout
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Usuario
from .serializers import (
    UsuarioSerializer, UsuarioCreateSerializer,
    UsuarioUpdateSerializer, LoginSerializer,
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    correo   = serializer.validated_data['correo']
    password = serializer.validated_data['password']

    user = authenticate(request, username=correo, password=password)
    if not user:
        return Response({'error': 'Correo o contrasena incorrectos.'}, status=400)
    if user.estado == 'inactivo':
        return Response({'error': 'Cuenta inactiva. Contacta al administrador.'}, status=403)

    login(request, user)

    rol_activo = None
    if user.rol == 'USER':
        es_profesor = user.inscripciones.filter(rol_en_curso='PROFESOR').exists()
        rol_activo  = 'PROFESOR' if es_profesor else 'ESTUDIANTE'

    return Response({
        'usuario':    UsuarioSerializer(user).data,
        'rol_activo': rol_activo,
    })


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
def me_view(request):
    if not request.user.is_authenticated:
        return Response({'error': 'No autenticado.'}, status=401)
    rol_activo = None
    if request.user.rol == 'USER':
        es_profesor = request.user.inscripciones.filter(rol_en_curso='PROFESOR').exists()
        rol_activo  = 'PROFESOR' if es_profesor else 'ESTUDIANTE'
    return Response({
        'usuario':    UsuarioSerializer(request.user).data,
        'rol_activo': rol_activo,
    })


class UsuarioListCreate(generics.ListCreateAPIView):
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return UsuarioCreateSerializer if self.request.method == 'POST' else UsuarioSerializer


class UsuarioDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UsuarioUpdateSerializer
        return UsuarioSerializer


@api_view(['PATCH'])
def toggle_estado(request, pk):
    try:
        usuario = Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:
        return Response({'error': 'No encontrado.'}, status=404)
    usuario.estado = 'inactivo' if usuario.estado == 'activo' else 'activo'
    usuario.save(update_fields=['estado'])
    return Response({'estado': usuario.estado})
