from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Facultad, Curso, FormulaComponente, Inscripcion, Modulo, Material, ProgresoModulo
from .serializers import (
    FacultadSerializer, CursoSerializer, CursoCreateSerializer,
    InscripcionSerializer, ModuloSerializer, MaterialSerializer, ProgresoModuloSerializer,
)


# ── FACULTADES ────────────────────────────────────────────────
class FacultadList(generics.ListCreateAPIView):
    queryset           = Facultad.objects.all()
    serializer_class   = FacultadSerializer
    permission_classes = [permissions.IsAuthenticated]


class FacultadDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Facultad.objects.all()
    serializer_class   = FacultadSerializer
    permission_classes = [permissions.IsAuthenticated]


# ── CURSOS ────────────────────────────────────────────────────
class CursoList(generics.ListAPIView):
    serializer_class   = CursoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'SUPERADMIN':
            return Curso.objects.all()
        if user.rol == 'ADMIN':
            facs = Facultad.objects.filter(admin=user).values_list('id', flat=True)
            return Curso.objects.filter(facultad_id__in=facs)
        # USER: cursos donde esta inscrito
        ids = user.inscripciones.values_list('curso_id', flat=True)
        return Curso.objects.filter(id__in=ids)


class CursoCreate(generics.CreateAPIView):
    serializer_class   = CursoCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(profesor=self.request.user)


class CursoDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Curso.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH', 'POST'):
            return CursoCreateSerializer
        return CursoSerializer


# ── INSCRIPCIONES ─────────────────────────────────────────────
@api_view(['GET', 'POST'])
def inscripciones_curso(request, curso_pk):
    try:
        curso = Curso.objects.get(pk=curso_pk)
    except Curso.DoesNotExist:
        return Response({'error': 'Curso no encontrado.'}, status=404)

    if request.method == 'GET':
        ins = Inscripcion.objects.filter(curso=curso).select_related('usuario')
        return Response(InscripcionSerializer(ins, many=True).data)

    # POST: inscribir estudiante
    usuario_id = request.data.get('usuario_id')
    rol        = request.data.get('rol_en_curso', 'ESTUDIANTE')
    from accounts.models import Usuario
    try:
        usuario = Usuario.objects.get(pk=usuario_id)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=404)

    ins, created = Inscripcion.objects.get_or_create(
        usuario=usuario, curso=curso,
        defaults={'rol_en_curso': rol}
    )
    if not created:
        return Response({'error': 'Ya esta inscrito.'}, status=400)
    return Response(InscripcionSerializer(ins).data, status=201)


@api_view(['DELETE'])
def desinscribir(request, curso_pk, usuario_pk):
    Inscripcion.objects.filter(curso_id=curso_pk, usuario_id=usuario_pk).delete()
    return Response(status=204)


# ── MODULOS ───────────────────────────────────────────────────
class ModuloListCreate(generics.ListCreateAPIView):
    serializer_class   = ModuloSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Modulo.objects.filter(curso_id=self.kwargs['curso_pk'])

    def perform_create(self, serializer):
        curso = Curso.objects.get(pk=self.kwargs['curso_pk'])
        serializer.save(curso=curso)


class ModuloDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Modulo.objects.all()
    serializer_class   = ModuloSerializer
    permission_classes = [permissions.IsAuthenticated]


# ── MATERIALES ────────────────────────────────────────────────
class MaterialListCreate(generics.ListCreateAPIView):
    serializer_class   = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Material.objects.filter(modulo_id=self.kwargs['modulo_pk'])

    def perform_create(self, serializer):
        modulo = Modulo.objects.get(pk=self.kwargs['modulo_pk'])
        serializer.save(modulo=modulo)


class MaterialDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Material.objects.all()
    serializer_class   = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]


# ── PROGRESO ──────────────────────────────────────────────────
@api_view(['POST'])
def marcar_modulo_completado(request, modulo_pk):
    modulo = Modulo.objects.get(pk=modulo_pk)
    prog, _ = ProgresoModulo.objects.get_or_create(
        usuario=request.user, modulo=modulo
    )
    prog.completado = True
    prog.save(update_fields=['completado'])
    return Response({'completado': True})


@api_view(['GET'])
def progreso_curso(request, curso_pk):
    modulos    = Modulo.objects.filter(curso_id=curso_pk)
    total      = modulos.count()
    completados = ProgresoModulo.objects.filter(
        usuario=request.user, modulo__in=modulos, completado=True
    ).count()
    pct = round((completados / total) * 100) if total else 0
    return Response({'total': total, 'completados': completados, 'porcentaje': pct})
