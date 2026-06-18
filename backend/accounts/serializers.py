from rest_framework import serializers
from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    iniciales       = serializers.ReadOnlyField()

    class Meta:
        model  = Usuario
        fields = [
            'id', 'nombres', 'apellidos', 'identificacion',
            'telefono', 'celular', 'correo', 'direccion',
            'estado_civil', 'estado', 'fecha_registro',
            'rol', 'nombre_completo', 'iniciales',
        ]
        read_only_fields = ['id', 'fecha_registro']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model  = Usuario
        fields = [
            'nombres', 'apellidos', 'identificacion',
            'telefono', 'celular', 'correo', 'direccion',
            'estado_civil', 'rol', 'password',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Usuario
        fields = [
            'nombres', 'apellidos', 'identificacion',
            'telefono', 'celular', 'correo', 'direccion',
            'estado_civil', 'estado', 'rol',
        ]


class LoginSerializer(serializers.Serializer):
    correo   = serializers.EmailField()
    password = serializers.CharField()
