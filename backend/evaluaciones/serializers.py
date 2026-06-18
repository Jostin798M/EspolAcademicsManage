from rest_framework import serializers
from .models import Tarea, Entrega, Quiz, Pregunta, RespuestaQuiz


class TareaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tarea
        fields = ['id', 'curso', 'titulo', 'descripcion', 'criterios',
                  'fecha_limite', 'puntaje_maximo']
        read_only_fields = ['curso']


class EntregaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')
    usuario_correo = serializers.ReadOnlyField(source='usuario.correo')

    class Meta:
        model  = Entrega
        fields = ['id', 'tarea', 'usuario', 'usuario_nombre', 'usuario_correo',
                  'estado', 'fecha', 'texto', 'archivo', 'link',
                  'nota', 'comentario']
        read_only_fields = ['tarea', 'usuario', 'estado', 'fecha']


class EntregaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Entrega
        fields = ['texto', 'archivo', 'link']


class PreguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Pregunta
        fields = ['id', 'tipo', 'enunciado', 'puntaje', 'orden',
                  'opciones', 'respuesta_correcta', 'es_auto_corregible']
        read_only_fields = ['quiz', 'es_auto_corregible']


class PreguntaEstudianteSerializer(serializers.ModelSerializer):
    """Sin respuesta_correcta para no exponer la solucion al estudiante."""
    class Meta:
        model  = Pregunta
        fields = ['id', 'tipo', 'enunciado', 'puntaje', 'orden', 'opciones']


class QuizSerializer(serializers.ModelSerializer):
    total_preguntas = serializers.SerializerMethodField()
    puntaje_total   = serializers.SerializerMethodField()

    class Meta:
        model  = Quiz
        fields = ['id', 'curso', 'titulo', 'descripcion',
                  'tiempo_limite_min', 'fecha_limite', 'total_preguntas', 'puntaje_total']
        read_only_fields = ['curso']

    def get_total_preguntas(self, obj):
        return obj.preguntas.count()

    def get_puntaje_total(self, obj):
        return float(sum(p.puntaje for p in obj.preguntas.all()))


class QuizDetalleSerializer(serializers.ModelSerializer):
    preguntas = PreguntaSerializer(many=True)

    class Meta:
        model  = Quiz
        fields = ['id', 'curso', 'titulo', 'descripcion',
                  'tiempo_limite_min', 'fecha_limite', 'preguntas']
        read_only_fields = ['curso']

    def create(self, validated_data):
        preguntas_data = validated_data.pop('preguntas', [])
        quiz = Quiz.objects.create(**validated_data)
        for i, p in enumerate(preguntas_data):
            Pregunta.objects.create(quiz=quiz, orden=i, **p)
        return quiz

    def update(self, instance, validated_data):
        preguntas_data = validated_data.pop('preguntas', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if preguntas_data is not None:
            instance.preguntas.all().delete()
            for i, p in enumerate(preguntas_data):
                Pregunta.objects.create(quiz=instance, orden=i, **p)
        return instance

class QuizDetalleEstudianteSerializer(serializers.ModelSerializer):
    preguntas = PreguntaEstudianteSerializer(many=True)

    class Meta:
        model  = Quiz
        fields = ['id', 'curso', 'titulo', 'descripcion',
                  'tiempo_limite_min', 'fecha_limite', 'preguntas']
        read_only_fields = ['curso']


class RespuestaQuizSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')

    class Meta:
        model  = RespuestaQuiz
        fields = ['id', 'quiz', 'usuario', 'usuario_nombre',
                  'respuestas', 'nota_automatica', 'nota_manual', 'fecha']
        read_only_fields = ['quiz', 'usuario', 'nota_automatica', 'fecha']
