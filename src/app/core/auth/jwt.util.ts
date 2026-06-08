import { JwtPayload } from './auth.types';

// Decodifica el payload del JWT (sin verificar la firma; eso lo hace el
// backend en cada request). Solo se usa para restaurar la sesión y leer la
// expiración en el navegador.
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    if (!part || typeof atob === 'undefined') return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload): boolean {
  return !!payload.exp && payload.exp * 1000 <= Date.now();
}
