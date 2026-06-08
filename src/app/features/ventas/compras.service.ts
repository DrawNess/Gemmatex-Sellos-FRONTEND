import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';
import { Compra, CrearCompraPayload } from '../../shared/models/compra.model';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly api = inject(ApiService);

  registrar(payload: CrearCompraPayload) {
    return this.api.post<Compra>(endpoints.compras.base, payload);
  }

  obtener(id: number | string) {
    return this.api.get<Compra>(endpoints.compras.byId(id));
  }

  anular(id: number | string, motivo: string) {
    return this.api.post<Compra>(endpoints.compras.anular(id), { motivo });
  }
}
