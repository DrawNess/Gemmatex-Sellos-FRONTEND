import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { isApiUrl } from '../api/endpoints';
import { AuthService } from './auth.service';

// Inyecta el Bearer token en las llamadas a la API. Si el backend responde
// 401 (token inválido/expirado), limpia la sesión y manda al login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApi = isApiUrl(req.url);
  const token = auth.getAccessToken();

  const authReq =
    isApi && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLogin = req.url.includes('/auth/login');
      if (isApi && error.status === 401 && !isLogin) {
        auth.clearSession();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
