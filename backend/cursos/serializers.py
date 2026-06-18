from rest_framework import serializers
from .models import Facultad, Curso, FormulaComponente, Inscripcion, Modulo, Material, ProgresoModulo
from accounts.serializers import UsuarioSerializer


class FacultadSerializer(serializers.ModelSerializer):
    admin_nombre = serializers.SerializerMethodField()

    class Meta:
        model  = Facultad
        fields = ['id', 'nombre', 'codigo', 'admin', 'admin_nombre']

    def get_admin_nombre(self, obj):
        return str(obj.admin) if obj.admin else None


class FormulaComponenteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FormulaComponente
        fields = ['id', 'componente', 'porcentaje', 'orden']


class CursoSerializer(serializers.ModelSerializer):
    facultad_nombre  = serializers.ReadOnlyField(source='facultad.nombre')
    facultad_codigo  = serializers.ReadOnlyField(source='facultad.codigo')
    profesor_nombre  = serializers.SerializerMethodField()
    formula          = FormulaComponenteSerializer(many=True, read_only=True)
    total_estudiantes = serializers.SerializerMethodField()
    mi_rol           = serializers.SerializerMethodField()

    class Meta:
        model  = Curso
        fields = [
            'id', 'nombre', 'codigo', 'descripcion',
            'facultad', 'facultad_nombre', 'facultad_codigo',
            'profesor', 'profesor_nombre',
            'fecha_inicio', 'fecha_fin', 'estado',
            'formula', 'total_estudiantes', 'mi_rol',
        ]

    def get_profesor_nombre(self, obj):
        return str(obj.profesor)

    def get_total_estudiantes(self, obj):
        return obj.inscripciones.filter(rol_en_curso='ESTUDIANTE').count()

    def get_mi_rol(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            ins = obj.inscripciones.filter(usuario=request.user).first()
            return ins.rol_en_curso if ins else None
        return None


class CursoCreateSerializer(serializers.ModelSerializer):
    formula = FormulaComponenteSerializer(many=True)

    class Meta:
        model  = Curso
        fields = [
            'nombre', 'codigo', 'descripcion', 'facultad',
            'fecha_inicio', 'fecha_fin', 'formula',
        ]

    def validate_formula(self, value):
        total = sum(f['porcentaje'] for f in value)
        if total != 100:
            raise serializers.ValidationError("Los porcentajes deben sumar 100%.")
        return value

    def create(self, validated_data):
        formula_data = validated_data.pop('formula', [])
        curso = Curso.objects.create(**validated_data)
        for i, f in enumerate(formula_data):
            FormulaComponente.objects.create(curso=curso, orden=i, **f)
        return curso

    def update(self, instance, validated_data):
        formula_data = validated_data.pop('formula', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if formula_data is not None:
            instance.formula.all().delete()
            for i, f in enumerate(formula_data):
                FormulaComponente.objects.create(curso=instance, orden=i, **f)
        return instance


class InscripcionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')
    usuario_correo = serializers.ReadOnlyField(source='usuario.correo')

    class Meta:
        model  = Inscripcion
        fields = ['id', 'usuario', 'usuario_nombre', 'usuario_correo',
                  'curso', 'rol_en_curso', 'fecha']


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Material
        fields = ['id', 'tipo', 'titulo', 'url']


class ModuloSerializer(serializers.ModelSerializer):
    materiales = MaterialSerializer(many=True, read_only=True)

    class Meta:
        model  = Modulo
        fields = ['id', 'curso', 'titulo', 'descripcion', 'orden', 'materiales']
        read_only_fields = ['curso']


class ProgresoModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProgresoModulo
        fields = ['id', 'modulo', 'completado', 'fecha']
        read_only_fields = ['usuario']
