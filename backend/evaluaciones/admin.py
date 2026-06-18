from django.contrib import admin
from .models import Tarea, Entrega, Quiz, Pregunta, RespuestaQuiz
admin.site.register(Tarea)
admin.site.register(Entrega)
admin.site.register(Quiz)
admin.site.register(Pregunta)
admin.site.register(RespuestaQuiz)
