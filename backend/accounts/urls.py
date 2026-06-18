from django.urls import path
from . import views

urlpatterns = [
    path('auth/login/',   views.login_view,      name='login'),
    path('auth/logout/',  views.logout_view,     name='logout'),
    path('auth/me/',      views.me_view,          name='me'),
    path('usuarios/',     views.UsuarioListCreate.as_view(), name='usuario-list'),
    path('usuarios/<int:pk>/',            views.UsuarioDetail.as_view(),  name='usuario-detail'),
    path('usuarios/<int:pk>/toggle/',     views.toggle_estado,            name='usuario-toggle'),
]
