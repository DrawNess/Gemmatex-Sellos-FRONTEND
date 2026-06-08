import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { tap } from 'rxjs';

import { ApiService } from '../api/api.service';
import { endpoints } from '../api/endpoints';
import { LoginCredentials, LoginResponse, Usuario } from './auth.types';
import { decodeJwt, isExpired } from './jwt.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly tokenKey = 'gemmatex_sellos_token';

  private readonly api = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly accessToken = signal<string | null>(null);
  readonly user = signal<Usuario | null>(null);
  readonly initialized = signal(false);

  readonly isAuthenticated = computed(
    () => !!this.accessToken() && !!this.user()
  );
  readonly isAdmin = computed(() => this.user()?.rol === 'admin');

  login(credentials: LoginCredentials) {
    return this.api
      .post<LoginResponse>(endpoints.auth.login, credentials)
      .pipe(tap((res) => this.setSession(res)));
  }

  // Restaura la sesión desde localStorage decodificando el JWT. Síncrono:
  // no hay endpoint /me ni refresh, todo viaja en el propio token.
  bootstrap(): boolean {
    if (this.initialized()) return this.isAuthenticated();

    const token = this.readStorage()?.getItem(AuthService.tokenKey) ?? null;
    if (token) {
      const payload = decodeJwt(token);
      if (payload && !isExpired(payload)) {
        this.accessToken.set(token);
        this.user.set({
          id: payload.id,
          nombre: payload.nombre,
          rol: payload.rol,
          sucursal_id: payload.sucursal_id,
          sucursal_nombre: payload.sucursal_nombre,
        });
      } else {
        this.clearSession();
      }
    }

    this.initialized.set(true);
    return this.isAuthenticated();
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  setSession(res: LoginResponse): void {
    this.accessToken.set(res.token);
    this.user.set(res.usuario);
    this.writeStorage(res.token);
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
    this.removeStorage();
  }

  logout(): void {
    this.clearSession();
  }

  private readStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return localStorage;
    } catch {
      return null;
    }
  }

  private writeStorage(token: string): void {
    this.readStorage()?.setItem(AuthService.tokenKey, token);
  }

  private removeStorage(): void {
    this.readStorage()?.removeItem(AuthService.tokenKey);
  }
}
