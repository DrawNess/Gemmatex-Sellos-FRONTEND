export interface CompraItemPayload {
  producto_id: number;
  cantidad: number;
}

export interface CrearCompraPayload {
  cliente_id: number;
  items: CompraItemPayload[];
}

export interface CompraDetalle {
  id: number;
  producto_id: number;
  nombre_snapshot: string;
  precio_snapshot: string | number;
  cantidad: string | number;
  subtotal: string | number;
}

export interface Compra {
  id: number;
  cliente_id: number;
  vendedor_id: number;
  monto_total: string | number;
  sellos_otorgados: number;
  fecha: string;
  cliente?: {
    id: number;
    ci: string;
    nombre: string;
    sellos: number;
    monto_acumulado: string | number;
  };
  vendedor?: { id: number; nombre: string };
  detalles?: CompraDetalle[];
  anulacion?: unknown | null;
}
