"""
python manage.py seed
Crea los datos iniciales equivalentes al mockdata.js del frontend.
"""
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_date, parse_datetime
from accounts.models import Usuario
from cursos.models import Facultad, Curso, FormulaComponente, Inscripcion, Modulo, Material, ProgresoModulo
from evaluaciones.models import Tarea, Entrega, Quiz, Pregunta, RespuestaQuiz


class Command(BaseCommand):
    help = 'Poblar la base de datos con datos de prueba'

    def add_arguments(self, parser):
        parser.add_argument(
            '--if-empty', action='store_true',
            help='Solo sembrar si no existen usuarios (no borra datos existentes).'
        )

    def handle(self, *args, **options):
        if options.get('if_empty') and Usuario.objects.exists():
            self.stdout.write('La base de datos ya tiene datos; se omite el sembrado.')
            return

        self.stdout.write('Limpiando datos anteriores...')
        RespuestaQuiz.objects.all().delete()
        Pregunta.objects.all().delete()
        Quiz.objects.all().delete()
        Entrega.objects.all().delete()
        Tarea.objects.all().delete()
        ProgresoModulo.objects.all().delete()
        Material.objects.all().delete()
        Modulo.objects.all().delete()
        Inscripcion.objects.all().delete()
        FormulaComponente.objects.all().delete()
        Curso.objects.all().delete()
        Facultad.objects.all().delete()
        Usuario.objects.all().delete()

        self.stdout.write('Creando usuarios...')
        carlos = Usuario.objects.create_user(
            correo='carlos.mendoza@espol.edu.ec', password='admin123',
            nombres='Carlos Alberto', apellidos='Mendoza Rios',
            identificacion='0912345678', telefono='042123456', celular='0991234567',
            direccion='Cdla. Kennedy Norte', estado_civil='casado', rol='SUPERADMIN',
        )
        maria = Usuario.objects.create_user(
            correo='maria.torres@espol.edu.ec', password='admin123',
            nombres='Maria Elena', apellidos='Torres Vega',
            identificacion='0923456789', celular='0987654321',
            estado_civil='soltero', rol='ADMIN',
        )
        roberto = Usuario.objects.create_user(
            correo='roberto.llerena@espol.edu.ec', password='user123',
            nombres='Roberto', apellidos='Llerena Castillo',
            identificacion='0934567890', telefono='042987654', celular='0976543210',
            direccion='Urdesa Central', estado_civil='divorciado', rol='USER',
        )
        ana = Usuario.objects.create_user(
            correo='ana.paredes@espol.edu.ec', password='user123',
            nombres='Ana Lucia', apellidos='Paredes Suarez',
            identificacion='0945678901', celular='0965432109',
            estado_civil='soltero', rol='USER',
        )
        diego = Usuario.objects.create_user(
            correo='diego.ochoa@espol.edu.ec', password='user123',
            nombres='Diego Fernando', apellidos='Ochoa Mora',
            identificacion='0956789012', telefono='042111222', celular='0954321098',
            direccion='Los Ceibos', estado_civil='soltero', rol='USER',
            estado='inactivo',
        )
        diego.is_active = False
        diego.save()

        self.stdout.write('Creando facultades...')
        fiec  = Facultad.objects.create(codigo='FIEC',  nombre='Facultad de Ingenieria en Electricidad y Computacion', admin=maria)
        fcnm  = Facultad.objects.create(codigo='FCNM',  nombre='Facultad de Ciencias Naturales y Matematicas')
        fimcp = Facultad.objects.create(codigo='FIMCP', nombre='Facultad de Ingenieria Mecanica y Ciencias de la Produccion')

        self.stdout.write('Creando cursos...')
        dawm = Curso.objects.create(
            nombre='Desarrollo de Aplicaciones Web y Moviles', codigo='DAWM-2026A',
            descripcion='Curso de desarrollo frontend, backend, APIs y aplicaciones moviles.',
            facultad=fiec, profesor=roberto,
            fecha_inicio='2026-03-01', fecha_fin='2026-07-31', estado='activo',
        )
        for i, (comp, pct) in enumerate([('Tareas', 40), ('Quizzes', 30), ('Proyecto Final', 30)]):
            FormulaComponente.objects.create(curso=dawm, componente=comp, porcentaje=pct, orden=i)

        ed = Curso.objects.create(
            nombre='Estructuras de Datos', codigo='ED-2026A',
            descripcion='Algoritmos, listas, arboles, grafos y complejidad computacional.',
            facultad=fiec, profesor=roberto,
            fecha_inicio='2026-03-01', fecha_fin='2026-07-31', estado='activo',
        )
        for i, (comp, pct) in enumerate([('Tareas', 50), ('Examenes', 50)]):
            FormulaComponente.objects.create(curso=ed, componente=comp, porcentaje=pct, orden=i)

        cd = Curso.objects.create(
            nombre='Calculo Diferencial', codigo='CD-2025B',
            descripcion='Limites, derivadas y aplicaciones del calculo.',
            facultad=fcnm, profesor=roberto,
            fecha_inicio='2025-08-01', fecha_fin='2025-12-15', estado='archivado',
        )
        for i, (comp, pct) in enumerate([('Quizzes', 30), ('Examenes', 70)]):
            FormulaComponente.objects.create(curso=cd, componente=comp, porcentaje=pct, orden=i)

        self.stdout.write('Creando inscripciones...')
        Inscripcion.objects.create(usuario=ana,     curso=dawm, rol_en_curso='ESTUDIANTE')
        Inscripcion.objects.create(usuario=diego,   curso=dawm, rol_en_curso='ESTUDIANTE')
        Inscripcion.objects.create(usuario=roberto, curso=dawm, rol_en_curso='PROFESOR')
        Inscripcion.objects.create(usuario=ana,     curso=ed,   rol_en_curso='ESTUDIANTE')
        Inscripcion.objects.create(usuario=roberto, curso=ed,   rol_en_curso='PROFESOR')

        self.stdout.write('Creando modulos y materiales...')
        m1 = Modulo.objects.create(curso=dawm, orden=1, titulo='Introduccion al Desarrollo Web',
                                   descripcion='Conceptos basicos de HTML, CSS y el ecosistema web.')
        m2 = Modulo.objects.create(curso=dawm, orden=2, titulo='CSS Moderno y Responsive Design',
                                   descripcion='Flexbox, Grid, Bootstrap y diseno adaptativo.')
        m3 = Modulo.objects.create(curso=dawm, orden=3, titulo='JavaScript Fundamentos',
                                   descripcion='Variables, funciones, DOM y eventos.')
        m4 = Modulo.objects.create(curso=ed,   orden=1, titulo='Complejidad Algoritmica',
                                   descripcion='Notacion Big O, analisis de algoritmos.')

        Material.objects.create(modulo=m1, tipo='video', titulo='Que es la web y como funciona',  url='https://www.youtube.com/watch?v=example1')
        Material.objects.create(modulo=m1, tipo='pdf',   titulo='Guia de referencia HTML5',       url='https://drive.google.com/file/example1')
        Material.objects.create(modulo=m2, tipo='video', titulo='Flexbox en 20 minutos',          url='https://www.youtube.com/watch?v=example2')
        Material.objects.create(modulo=m2, tipo='pdf',   titulo='Cheatsheet Bootstrap 5',         url='https://drive.google.com/file/example2')
        Material.objects.create(modulo=m3, tipo='video', titulo='JavaScript desde cero',          url='https://www.youtube.com/watch?v=example3')

        self.stdout.write('Creando progreso...')
        ProgresoModulo.objects.create(usuario=ana, modulo=m1, completado=True)
        ProgresoModulo.objects.create(usuario=ana, modulo=m2, completado=True)
        ProgresoModulo.objects.create(usuario=ana, modulo=m3, completado=False)

        self.stdout.write('Creando tareas y entregas...')
        t1 = Tarea.objects.create(
            curso=dawm, titulo='Pagina HTML estatica',
            descripcion='Crear una pagina web con estructura semantica correcta usando HTML5.',
            criterios='Uso correcto de etiquetas semanticas, estructura valida, al menos 3 secciones.',
            fecha_limite=parse_datetime('2026-04-10T23:59:00'), puntaje_maximo=10,
        )
        t2 = Tarea.objects.create(
            curso=dawm, titulo='Diseno responsive con Bootstrap',
            descripcion='Adaptar la pagina del ejercicio anterior usando el grid de Bootstrap 5.',
            criterios='Uso del sistema de grid, responsive en movil y escritorio.',
            fecha_limite=parse_datetime('2026-04-25T23:59:00'), puntaje_maximo=10,
        )
        Entrega.objects.create(
            tarea=t1, usuario=ana, estado='entregado',
            fecha=parse_datetime('2026-04-09T18:30:00'),
            texto='Adjunto mi pagina HTML con las secciones solicitadas.',
            archivo='tarea1_ana.html', nota=9.0,
            comentario='Buen trabajo, falta atributo alt en las imagenes.',
        )
        Entrega.objects.create(tarea=t1, usuario=diego, estado='pendiente')
        Entrega.objects.create(
            tarea=t2, usuario=ana, estado='entregado',
            fecha=parse_datetime('2026-04-24T20:10:00'),
            archivo='tarea2_ana.zip',
        )

        self.stdout.write('Creando quizzes...')
        quiz = Quiz.objects.create(
            curso=dawm, titulo='Quiz — HTML y CSS',
            descripcion='Evaluacion de conocimientos basicos del modulo 1 y 2.',
            tiempo_limite_min=20,
            fecha_limite=parse_datetime('2026-04-15T23:59:00'),
        )
        Pregunta.objects.create(quiz=quiz, orden=0, tipo='opcion_multiple_una',
            enunciado='Cual etiqueta define el titulo principal de una pagina?',
            puntaje=2, opciones=['<h1>', '<title>', '<header>', '<main>'], respuesta_correcta=0)
        Pregunta.objects.create(quiz=quiz, orden=1, tipo='verdadero_falso',
            enunciado='CSS Grid es una tecnica de diseno bidimensional.',
            puntaje=2, respuesta_correcta=True)
        Pregunta.objects.create(quiz=quiz, orden=2, tipo='completar_espacios',
            enunciado='La propiedad ___ de flexbox alinea elementos en el eje principal.',
            puntaje=3, respuesta_correcta='justify-content')
        Pregunta.objects.create(quiz=quiz, orden=3, tipo='respuesta_corta',
            enunciado='Explica la diferencia entre margin y padding.',
            puntaje=3, respuesta_correcta=None)

        RespuestaQuiz.objects.create(
            quiz=quiz, usuario=ana,
            respuestas={'0': 0, '1': 'Verdadero', '2': 'justify-content',
                        '3': 'Margin es el espacio exterior y padding el interior.'},
            nota_automatica=7,
        )

        self.stdout.write(self.style.SUCCESS('Seed completado exitosamente.'))
        self.stdout.write('Credenciales de prueba:')
        self.stdout.write('  SuperAdmin: carlos.mendoza@espol.edu.ec / admin123')
        self.stdout.write('  Admin:      maria.torres@espol.edu.ec  / admin123')
        self.stdout.write('  Profesor:   roberto.llerena@espol.edu.ec / user123')
        self.stdout.write('  Estudiante: ana.paredes@espol.edu.ec   / user123')
