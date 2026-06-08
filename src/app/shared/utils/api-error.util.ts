import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody, ApiErrorDetail } from '../../core/auth/auth.types';

// Extrae mensajes legibles del cuerpo de error del backend:
// { error: { message, details: [{ campo, mensaje }] } }
export function readApiErrorMessages(
  body: ApiErrorBody | null | undefined
): string[] {
  const messages: string[] = [];
  const err = body?.error;

  if (err?.message) messages.push(err.message);

  if (Array.isArray(err?.details)) {
    for (const detail of err.details as ApiErrorDetail[]) {
      if (detail?.mensaje) {
        messages.push(
          detail.campo ? `${detail.campo}: ${detail.mensaje}` : detail.mensaje
        );
      }
    }
  }

  if (body?.message) messages.push(body.message);

  return [...new Set(messages.map((m) => m.trim()).filter(Boolean))];
}

export function firstApiError(
  body: ApiErrorBody | null | undefined,
  fallback: string
): string {
  return readApiErrorMessages(body)[0] || fallback;
}

// Convierte un HttpErrorResponse en un mensaje amigable.
export function httpErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado.'
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    }
    return firstApiError(error.error as ApiErrorBody, fallback);
  }
  return fallback;
}
