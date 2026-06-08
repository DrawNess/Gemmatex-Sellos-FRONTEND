import { Sucursal } from './sucursal.model';

export type Rol = 'admin' | 'vendedor';

export interface UsuarioCuenta {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  sucursal_id: number;
  activo: boolean;
  created_at: string;
  sucursal?: Sucursal;
}

export interface CrearUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  sucursal_id: number;
}
