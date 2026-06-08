export type Rol = 'admin' | 'vendedor';

export interface Usuario {
  id: number;
  nombre: string;
  rol: Rol;
  sucursal_id: number;
  sucursal_nombre: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// Payload del JWT emitido por el backend (RS256).
export interface JwtPayload {
  id: number;
  nombre: string;
  rol: Rol;
  sucursal_id: number;
  sucursal_nombre: string | null;
  iat?: number;
  exp?: number;
  iss?: string;
}

// Formato de error del backend: { error: { message, details } }
export interface ApiErrorDetail {
  campo?: string;
  mensaje?: string;
}

export interface ApiErrorBody {
  error?: {
    message?: string;
    details?: ApiErrorDetail[] | unknown;
  };
  message?: string;
}
