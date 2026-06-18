from django.urls import path
from . import views

urlpatterns = [
    path('cursos/<int:curso_pk>/tareas/',        views.TareaListCreate.as_view(),  name='tarea-list'),
    path('tareas/<int:pk>/',                     views.TareaDetail.as_view(),      name='tarea-detail'),
    path('tareas/<int:tarea_pk>/entregas/',       views.entregas_tarea,             name='entregas-tarea'),
    path('tareas/<int:tarea_pk>/mi-entrega/',     views.mi_entrega,                 name='mi-entrega'),
    path('entregas/<int:entrega_pk>/calificar/',  views.calificar_entrega,          name='calificar-entrega'),

    path('cursos/<int:curso_pk>/quizzes/',        views.QuizListCreate.as_view(),   name='quiz-list'),
    path('quizzes/<int:pk>/',                     views.QuizDetail.as_view(),       name='quiz-detail'),
    path('quizzes/<int:quiz_pk>/respuestas/',     views.respuestas_quiz,            name='respuestas-quiz'),
    path('respuestas/<int:respuesta_pk>/nota-manual/', views.nota_manual_quiz,      name='nota-manual-quiz'),
]
