import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, MonoTypeOperatorFunction, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

// Wrapper liviano de HttpClient. El token Bearer lo inyecta el authInterceptor.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(url: string, params?: QueryParams) {
    return this.http
      .get<T>(url, { params: this.toParams(params) })
      .pipe(this.logError('GET', url));
  }

  // Devuelve texto plano (ej. el comprobante HTML).
  getText(url: string, params?: QueryParams) {
    return this.http
      .get(url, { params: this.toParams(params), responseType: 'text' })
      .pipe(this.logError('GET', url));
  }

  // Descarga binaria (ej. plantilla Excel).
  getBlob(url: string, params?: QueryParams) {
    return this.http
      .get(url, { params: this.toParams(params), responseType: 'blob' })
      .pipe(this.logError('GET', url));
  }

  post<T>(url: string, body: unknown) {
    return this.http.post<T>(url, body).pipe(this.logError('POST', url));
  }

  patch<T>(url: string, body: unknown) {
    return this.http.patch<T>(url, body).pipe(this.logError('PATCH', url));
  }

  put<T>(url: string, body: unknown) {
    return this.http.put<T>(url, body).pipe(this.logError('PUT', url));
  }

  delete<T>(url: string, params?: QueryParams) {
    return this.http
      .delete<T>(url, { params: this.toParams(params) })
      .pipe(this.logError('DELETE', url));
  }

  // Subida multipart (ej. importación de catálogo Excel).
  upload<T>(url: string, formData: FormData) {
    return this.http.post<T>(url, formData).pipe(this.logError('UPLOAD', url));
  }

  private toParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === null || value === undefined || value === '') continue;
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }

  private logError<T>(method: string, url: string): MonoTypeOperatorFunction<T> {
    return catchError((error: unknown) => {
      if (!environment.production && error instanceof HttpErrorResponse) {
        console.error('[API]', {
          method,
          url,
          status: error.status,
          response: error.error,
        });
      }
      return throwError(() => error);
    });
  }
}
