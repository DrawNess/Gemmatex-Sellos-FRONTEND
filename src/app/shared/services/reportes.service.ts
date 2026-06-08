import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';
import { Cliente } from '../models/cliente.model';
import { Compra } from '../models/compra.model';
import { ReporteFiltros, ResumenReporte } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  resumen(filtros: ReporteFiltros = {}) {
    return this.api.get<ResumenReporte>(endpoints.reportes.resumen, {
      desde: filtros.desde,
      hasta: filtros.hasta,
      sucursal_id: filtros.sucursal_id,
    });
  }

  descuentos(filtros: ReporteFiltros = {}) {
    return this.api.get<Cliente[]>(endpoints.reportes.descuentos, {
      sucursal_id: filtros.sucursal_id,
    });
  }

  compras(filtros: ReporteFiltros = {}) {
    return this.api.get<Compra[]>(endpoints.reportes.compras, {
      desde: filtros.desde,
      hasta: filtros.hasta,
      sucursal_id: filtros.sucursal_id,
    });
  }
}
