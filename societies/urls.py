from django.urls import path
from . import views

urlpatterns = [

    # ==========================
    # Society URLs
    # ==========================

    path('societies/', views.society_list, name='society_list'),
    path('society/add/', views.society_add, name='society_add'),
    path('society/edit/<int:pk>/', views.society_edit, name='society_edit'),
    path('society/delete/<int:pk>/', views.society_delete, name='society_delete'),

    # ==========================
    # Block URLs
    # ==========================

    path('blocks/', views.block_list, name='block_list'),
    path('block/add/', views.block_add, name='block_add'),
    path('block/edit/<int:pk>/', views.block_edit, name='block_edit'),
    path('block/delete/<int:pk>/', views.block_delete, name='block_delete'),

    # ==========================
    # Flat URLs
    # ==========================

    path('flats/', views.flat_list, name='flat_list'),
    path('flat/add/', views.flat_add, name='flat_add'),
    path('flat/edit/<int:pk>/', views.flat_edit, name='flat_edit'),
    path('flat/delete/<int:pk>/', views.flat_delete, name='flat_delete'),

    # API Route for Dynamic Dropdowns
    path('api/society-blocks/<int:society_id>/', views.get_society_blocks_api, name='api_society_blocks'),
]