import { Routes } from '@angular/router';

import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { AppLayout } from './layouts/app-layout/app-layout';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.LoginPage),
      },
    ],
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes-list').then(
            (m) => m.ClientesListPage
          ),
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import('./features/clientes/cliente-detalle').then(
            (m) => m.ClienteDetallePage
          ),
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas-nueva').then(
            (m) => m.VentasNuevaPage
          ),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/catalogo/catalogo-list').then(
            (m) => m.CatalogoListPage
          ),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list').then(
            (m) => m.UsuariosListPage
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
