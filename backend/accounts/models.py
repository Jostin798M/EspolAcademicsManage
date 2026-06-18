from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UsuarioManager(BaseUserManager):
    def create_user(self, correo, password=None, **extra_fields):
        if not correo:
            raise ValueError("El correo es obligatorio.")
        correo = self.normalize_email(correo)
        user = self.model(correo=correo, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, correo, password=None, **extra_fields):
        extra_fields.setdefault('rol', 'SUPERADMIN')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(correo, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    ROL_CHOICES = [
        ('SUPERADMIN', 'Super Admin'),
        ('ADMIN',      'Admin Facultad'),
        ('USER',       'Usuario'),
    ]
    ESTADO_CIVIL_CHOICES = [
        ('soltero',     'Soltero/a'),
        ('casado',      'Casado/a'),
        ('divorciado',  'Divorciado/a'),
        ('separado',    'Separado/a'),
        ('union libre', 'Union libre'),
    ]

    # Campos Clientes (obligatorios por especificacion)
    nombres        = models.CharField(max_length=100)
    apellidos      = models.CharField(max_length=100)
    identificacion = models.CharField(max_length=20, unique=True)
    telefono       = models.CharField(max_length=15, blank=True, null=True)
    celular        = models.CharField(max_length=15)
    correo         = models.EmailField(unique=True)
    direccion      = models.CharField(max_length=200, blank=True, null=True)
    estado_civil   = models.CharField(max_length=20, choices=ESTADO_CIVIL_CHOICES, default='soltero')
    estado         = models.CharField(max_length=10, default='activo')
    fecha_registro = models.DateField(auto_now_add=True)

    # Campos de sistema
    rol      = models.CharField(max_length=15, choices=ROL_CHOICES, default='USER')
    is_active = models.BooleanField(default=True)
    is_staff  = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD  = 'correo'
    REQUIRED_FIELDS = ['nombres', 'apellidos', 'identificacion', 'celular']

    class Meta:
        verbose_name        = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering            = ['apellidos', 'nombres']

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"

    @property
    def iniciales(self):
        return (self.nombres[0] + self.apellidos[0]).upper()
