from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Tarea, Entrega, Quiz, Pregunta, RespuestaQuiz
from .serializers import (
    TareaSerializer, EntregaSerializer, EntregaCreateSerializer,
    QuizSerializer, QuizDetalleSerializer, QuizDetalleEstudianteSerializer,
    RespuestaQuizSerializer,
)


def es_profesor_de(curso, user):
    """True si el usuario administra el curso o esta inscrito como PROFESOR.
    Profesores y estudiantes comparten rol='USER', asi que el rol del sistema
    no basta: se distingue por la inscripcion en el curso."""
    if user.rol in ('ADMIN', 'SUPERADMIN'):
        return True
    return curso.inscripciones.filter(usuario=user, rol_en_curso='PROFESOR').exists()


# ── TAREAS ────────────────────────────────────────────────────
class TareaListCreate(generics.ListCreateAPIView):
    serializer_class   = TareaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Tarea.objects.filter(curso_id=self.kwargs['curso_pk'])

    def perform_create(self, serializer):
        from cursos.models import Curso
        serializer.save(curso=Curso.objects.get(pk=self.kwargs['curso_pk']))


class TareaDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Tarea.objects.all()
    serializer_class   = TareaSerializer
    permission_classes = [permissions.IsAuthenticated]


# ── ENTREGAS ──────────────────────────────────────────────────
@api_view(['GET'])
def entregas_tarea(request, tarea_pk):
    tarea    = Tarea.objects.get(pk=tarea_pk)
    entregas = Entrega.objects.filter(tarea=tarea).select_related('usuario')
    return Response(EntregaSerializer(entregas, many=True).data)


@api_view(['GET', 'POST', 'PATCH'])
def mi_entrega(request, tarea_pk):
    tarea = Tarea.objects.get(pk=tarea_pk)

    if request.method == 'GET':
        try:
            e = Entrega.objects.get(tarea=tarea, usuario=request.user)
            return Response(EntregaSerializer(e).data)
        except Entrega.DoesNotExist:
            return Response({'estado': 'pendiente', 'nota': None})

    if request.method in ('POST', 'PATCH'):
        if timezone.now() > tarea.fecha_limite:
            return Response({'error': 'La fecha limite ha vencido.'}, status=400)
        e, _ = Entrega.objects.get_or_create(tarea=tarea, usuario=request.user)
        serializer = EntregaCreateSerializer(e, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(estado='entregado', fecha=timezone.now())
        return Response(EntregaSerializer(e).data)


@api_view(['PATCH'])
def calificar_entrega(request, entrega_pk):
    try:
        e = Entrega.objects.get(pk=entrega_pk)
    except Entrega.DoesNotExist:
        return Response({'error': 'No encontrada.'}, status=404)
    nota       = request.data.get('nota')
    comentario = request.data.get('comentario', '')
    if nota is None:
        return Response({'error': 'Nota requerida.'}, status=400)
    e.nota = nota
    e.comentario = comentario
    e.save(update_fields=['nota', 'comentario'])
    return Response(EntregaSerializer(e).data)


# ── QUIZZES ───────────────────────────────────────────────────
class QuizListCreate(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Quiz.objects.filter(curso_id=self.kwargs['curso_pk'])

    def get_serializer_class(self):
        return QuizDetalleSerializer if self.request.method == 'POST' else QuizSerializer

    def perform_create(self, serializer):
        from cursos.models import Curso
        serializer.save(curso=Curso.objects.get(pk=self.kwargs['curso_pk']))


class QuizDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Quiz.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method != 'GET':
            return QuizDetalleSerializer
        # En GET, el estudiante no debe ver las respuestas correctas; el profesor si.
        quiz = self.get_object()
        if es_profesor_de(quiz.curso, self.request.user):
            return QuizDetalleSerializer
        return QuizDetalleEstudianteSerializer


# ── RESPUESTAS QUIZ ───────────────────────────────────────────
@api_view(['GET', 'POST'])
def respuestas_quiz(request, quiz_pk):
    quiz = Quiz.objects.prefetch_related('preguntas').get(pk=quiz_pk)

    if request.method == 'GET':
        # Profesor ve todas; estudiante solo la suya
        if es_profesor_de(quiz.curso, request.user):
            qs = RespuestaQuiz.objects.filter(quiz=quiz).select_related('usuario')
        else:
            qs = RespuestaQuiz.objects.filter(quiz=quiz, usuario=request.user)
        return Response(RespuestaQuizSerializer(qs, many=True).data)

    # POST: enviar respuestas
    if RespuestaQuiz.objects.filter(quiz=quiz, usuario=request.user).exists():
        return Response({'error': 'Ya respondiste este quiz.'}, status=400)
    if timezone.now() > quiz.fecha_limite:
        return Response({'error': 'El quiz ha vencido.'}, status=400)

    respuestas = request.data.get('respuestas', {})

    # Auto-correccion
    nota = 0
    for pregunta in quiz.preguntas.all():
        if not pregunta.es_auto_corregible:
            continue
        valor = respuestas.get(str(pregunta.id))
        if valor is None:
            continue
        correcta = pregunta.respuesta_correcta
        if pregunta.tipo == 'opcion_multiple_una':
            if int(valor) == correcta:
                nota += float(pregunta.puntaje)
        elif pregunta.tipo == 'verdadero_falso':
            if (valor == 'Verdadero') == correcta:
                nota += float(pregunta.puntaje)
        else:
            if str(valor).strip().lower() == str(correcta).strip().lower():
                nota += float(pregunta.puntaje)

    r = RespuestaQuiz.objects.create(
        quiz=quiz, usuario=request.user,
        respuestas=respuestas, nota_automatica=nota
    )
    return Response(RespuestaQuizSerializer(r).data, status=201)


@api_view(['PATCH'])
def nota_manual_quiz(request, respuesta_pk):
    try:
        r = RespuestaQuiz.objects.get(pk=respuesta_pk)
    except RespuestaQuiz.DoesNotExist:
        return Response({'error': 'No encontrada.'}, status=404)
    r.nota_manual = request.data.get('nota_manual')
    r.save(update_fields=['nota_manual'])
    return Response(RespuestaQuizSerializer(r).data)
