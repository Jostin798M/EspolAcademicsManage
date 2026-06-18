from django.db import models
from django.conf import settings
from cursos.models import Curso


class Tarea(models.Model):
    curso          = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='tareas')
    titulo         = models.CharField(max_length=200)
    descripcion    = models.TextField()
    criterios      = models.TextField(blank=True)
    fecha_limite   = models.DateTimeField()
    puntaje_maximo = models.DecimalField(max_digits=5, decimal_places=2, default=10)

    class Meta:
        ordering            = ['fecha_limite']
        verbose_name        = 'Tarea'
        verbose_name_plural = 'Tareas'

    def __str__(self):
        return f"{self.curso.codigo} — {self.titulo}"


class Entrega(models.Model):
    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente'),
        ('entregado',  'Entregado'),
    ]

    tarea      = models.ForeignKey(Tarea, on_delete=models.CASCADE, related_name='entregas')
    usuario    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='entregas'
    )
    estado     = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='pendiente')
    fecha      = models.DateTimeField(null=True, blank=True)
    texto      = models.TextField(blank=True, null=True)
    archivo    = models.CharField(max_length=300, blank=True, null=True)
    link       = models.URLField(blank=True, null=True)
    nota       = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    comentario = models.TextField(blank=True, null=True)

    class Meta:
        unique_together     = ('tarea', 'usuario')
        verbose_name        = 'Entrega'
        verbose_name_plural = 'Entregas'

    def __str__(self):
        return f"{self.usuario} — {self.tarea.titulo} ({self.estado})"


class Quiz(models.Model):
    curso             = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='quizzes')
    titulo            = models.CharField(max_length=200)
    descripcion       = models.TextField(blank=True)
    tiempo_limite_min = models.PositiveSmallIntegerField(null=True, blank=True)
    fecha_limite      = models.DateTimeField()

    class Meta:
        ordering            = ['fecha_limite']
        verbose_name        = 'Quiz'
        verbose_name_plural = 'Quizzes'

    def __str__(self):
        return f"{self.curso.codigo} — {self.titulo}"


class Pregunta(models.Model):
    TIPO_CHOICES = [
        ('opcion_multiple_una',    'Opcion multiple (1 respuesta)'),
        ('opcion_multiple_varias', 'Opcion multiple (varias respuestas)'),
        ('verdadero_falso',        'Verdadero / Falso'),
        ('completar_espacios',     'Completar espacios'),
        ('relacionar_columnas',    'Relacionar columnas'),
        ('ordenamiento',           'Ordenamiento'),
        ('respuesta_numerica',     'Respuesta numerica'),
        ('menu_desplegable',       'Menu desplegable'),
        ('seleccion_imagen',       'Seleccion en imagen'),
        ('respuesta_corta',        'Respuesta corta'),
        ('ensayo',                 'Ensayo'),
        ('subida_archivo',         'Subida de archivo'),
        ('respuesta_imagen',       'Respuesta con imagen'),
        ('editor_codigo',          'Editor de codigo'),
        ('escala_valoracion',      'Escala de valoracion'),
    ]

    quiz      = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='preguntas')
    tipo      = models.CharField(max_length=30, choices=TIPO_CHOICES)
    enunciado = models.TextField()
    puntaje   = models.DecimalField(max_digits=4, decimal_places=1, default=1)
    orden     = models.PositiveSmallIntegerField(default=0)
    # Opciones y respuesta correcta almacenadas como JSON
    opciones            = models.JSONField(default=list, blank=True)
    respuesta_correcta  = models.JSONField(null=True, blank=True)

    class Meta:
        ordering            = ['orden']
        verbose_name        = 'Pregunta'
        verbose_name_plural = 'Preguntas'

    AUTO_CORREGIBLES = {
        'opcion_multiple_una', 'opcion_multiple_varias', 'verdadero_falso',
        'completar_espacios', 'relacionar_columnas', 'ordenamiento',
        'respuesta_numerica', 'menu_desplegable', 'seleccion_imagen',
    }

    @property
    def es_auto_corregible(self):
        return self.tipo in self.AUTO_CORREGIBLES

    def __str__(self):
        return f"P{self.orden}: {self.enunciado[:60]}"


class RespuestaQuiz(models.Model):
    quiz            = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='respuestas')
    usuario         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='respuestas_quiz'
    )
    respuestas      = models.JSONField(default=dict)
    nota_automatica = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    nota_manual     = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fecha           = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together     = ('quiz', 'usuario')
        verbose_name        = 'Respuesta de quiz'
        verbose_name_plural = 'Respuestas de quiz'

    def __str__(self):
        return f"{self.usuario} — {self.quiz.titulo}"
