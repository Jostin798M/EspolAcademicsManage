from django.db import models
from django.conf import settings


class Facultad(models.Model):
    nombre   = models.CharField(max_length=200, unique=True)
    codigo   = models.CharField(max_length=10, unique=True)
    admin    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='facultades_administradas'
    )

    class Meta:
        verbose_name        = 'Facultad'
        verbose_name_plural = 'Facultades'
        ordering            = ['nombre']

    def __str__(self):
        return self.codigo


class Curso(models.Model):
    ESTADO_CHOICES = [
        ('activo',    'Activo'),
        ('archivado', 'Archivado'),
    ]

    nombre      = models.CharField(max_length=200)
    codigo      = models.CharField(max_length=20, unique=True)
    descripcion = models.TextField()
    facultad    = models.ForeignKey(Facultad, on_delete=models.CASCADE, related_name='cursos')
    profesor    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cursos_como_profesor'
    )
    fecha_inicio = models.DateField()
    fecha_fin    = models.DateField()
    estado       = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='activo')

    class Meta:
        verbose_name        = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering            = ['-fecha_inicio']

    def __str__(self):
        return f"{self.codigo} — {self.nombre}"

    def archivar_si_vencido(self):
        from django.utils import timezone
        if self.estado == 'activo' and self.fecha_fin < timezone.localdate():
            self.estado = 'archivado'
            self.save(update_fields=['estado'])


class FormulaComponente(models.Model):
    curso      = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='formula')
    componente = models.CharField(max_length=100)
    porcentaje = models.PositiveSmallIntegerField()
    orden      = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering            = ['orden']
        verbose_name        = 'Componente de formula'
        verbose_name_plural = 'Componentes de formula'

    def __str__(self):
        return f"{self.curso.codigo} — {self.componente} ({self.porcentaje}%)"


class Inscripcion(models.Model):
    ROL_CHOICES = [
        ('PROFESOR',    'Profesor'),
        ('ESTUDIANTE',  'Estudiante'),
    ]

    usuario     = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inscripciones'
    )
    curso       = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='inscripciones')
    rol_en_curso = models.CharField(max_length=15, choices=ROL_CHOICES)
    fecha       = models.DateField(auto_now_add=True)

    class Meta:
        unique_together     = ('usuario', 'curso')
        verbose_name        = 'Inscripcion'
        verbose_name_plural = 'Inscripciones'

    def __str__(self):
        return f"{self.usuario} en {self.curso.codigo} ({self.rol_en_curso})"


class Modulo(models.Model):
    curso       = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='modulos')
    titulo      = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    orden       = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering            = ['orden']
        verbose_name        = 'Modulo'
        verbose_name_plural = 'Modulos'

    def __str__(self):
        return f"{self.curso.codigo} — {self.orden}. {self.titulo}"


class Material(models.Model):
    TIPO_CHOICES = [
        ('video',  'Video'),
        ('pdf',    'PDF'),
        ('enlace', 'Enlace externo'),
    ]

    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name='materiales')
    tipo   = models.CharField(max_length=10, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=200)
    url    = models.URLField()

    class Meta:
        verbose_name        = 'Material'
        verbose_name_plural = 'Materiales'

    def __str__(self):
        return self.titulo


class ProgresoModulo(models.Model):
    usuario    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='progresos'
    )
    modulo     = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name='progresos')
    completado = models.BooleanField(default=False)
    fecha      = models.DateField(auto_now=True)

    class Meta:
        unique_together     = ('usuario', 'modulo')
        verbose_name        = 'Progreso de modulo'
        verbose_name_plural = 'Progresos de modulo'

    def __str__(self):
        return f"{self.usuario} — {self.modulo.titulo} ({'OK' if self.completado else '...'})"
