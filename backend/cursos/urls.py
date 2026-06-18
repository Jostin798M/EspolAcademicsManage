from django.urls import path
from . import views

urlpatterns = [
    path('facultades/',                                  views.FacultadList.as_view(),        name='facultad-list'),
    path('facultades/<int:pk>/',                         views.FacultadDetail.as_view(),      name='facultad-detail'),

    path('cursos/',                                      views.CursoList.as_view(),           name='curso-list'),
    path('cursos/crear/',                                views.CursoCreate.as_view(),         name='curso-create'),
    path('cursos/<int:pk>/',                             views.CursoDetail.as_view(),         name='curso-detail'),

    path('cursos/<int:curso_pk>/inscripciones/',         views.inscripciones_curso,           name='inscripciones'),
    path('cursos/<int:curso_pk>/inscripciones/<int:usuario_pk>/', views.desinscribir,         name='desinscribir'),

    path('cursos/<int:curso_pk>/modulos/',               views.ModuloListCreate.as_view(),    name='modulo-list'),
    path('modulos/<int:pk>/',                            views.ModuloDetail.as_view(),        name='modulo-detail'),
    path('modulos/<int:modulo_pk>/materiales/',          views.MaterialListCreate.as_view(),  name='material-list'),
    path('materiales/<int:pk>/',                         views.MaterialDetail.as_view(),      name='material-detail'),

    path('modulos/<int:modulo_pk>/completar/',           views.marcar_modulo_completado,      name='modulo-completar'),
    path('cursos/<int:curso_pk>/progreso/',              views.progreso_curso,                name='progreso-curso'),
]
