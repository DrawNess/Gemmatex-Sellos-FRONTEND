import { Sucursal } from './sucursal.model';

export interface UsuarioRef {
  id: number;
  nombre: string;
}

export interface SellosInfo {
  actuales: number;
  maximo: number;
  progreso_siguiente: number;
}

export interface Cliente {
  id: number;
  ci: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  sucursal_id: number;
  registrado_por: number;
  monto_acumulado: string | number;
  sellos: number;
  descuento_ganado: boolean;
  descuento_canjeado: boolean;
  fecha_canje: string | null;
  canjeado_por: number | null;
  created_at: string;
  sucursal?: Sucursal;
  registrador?: UsuarioRef;
  canjeador?: UsuarioRef | null;
  sellos_info?: SellosInfo;
}

export interface CrearClientePayload {
  ci: string;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  sucursal_id?: number;
}

export interface EditarClientePayload {
  ci?: string;
  nombre?: string;
  correo?: string | null;
  telefono?: string | null;
  sucursal_id?: number;
}
