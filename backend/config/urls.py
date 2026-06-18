from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings

FRONTEND = settings.FRONTEND_DIR

urlpatterns = [
    path('admin/', admin.site.urls),

    # API REST
    path('api/', include('accounts.urls')),
    path('api/', include('cursos.urls')),
    path('api/', include('evaluaciones.urls')),

    # Raiz -> index.html (login)
    re_path(r'^$', serve, {'document_root': FRONTEND, 'path': 'index.html'}),

    # Sirve TODOS los archivos del frontend directamente desde la raiz del proyecto
    # (CSS, JS, HTML, imagenes) — funciona con rutas relativas en el HTML
    re_path(r'^(?P<path>.*)$', serve, {'document_root': FRONTEND}),
]
