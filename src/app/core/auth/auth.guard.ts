import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

// Requiere sesión iniciada.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.initialized()) auth.bootstrap();

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { return: state.url },
  });
};

// Solo para invitados (login): si ya hay sesión, manda al inicio.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.initialized()) auth.bootstrap();

  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

// Requiere rol admin.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.initialized()) auth.bootstrap();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return auth.isAdmin() ? true : router.createUrlTree(['/']);
};
