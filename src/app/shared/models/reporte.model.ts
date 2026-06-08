export interface ResumenReporte {
  total_clientes: number;
  total_compras: number;
  monto_total_vendido: number;
  sellos_otorgados: number;
  descuentos_ganados: number;
  descuentos_canjeados: number;
  descuentos_pendientes: number;
}

export interface ReporteFiltros {
  desde?: string;
  hasta?: string;
  sucursal_id?: number;
}
