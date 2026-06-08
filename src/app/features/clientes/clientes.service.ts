import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';
import {
  Cliente,
  CrearClientePayload,
  EditarClientePayload,
} from '../../shared/models/cliente.model';
import { Compra } from '../../shared/models/compra.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly api = inject(ApiService);

  buscar(search: string) {
    return this.api.get<Cliente[]>(endpoints.clientes.base, { search });
  }

  obtener(id: number | string) {
    return this.api.get<Cliente>(endpoints.clientes.byId(id));
  }

  obtenerCompras(id: number | string) {
    return this.api.get<Compra[]>(endpoints.clientes.compras(id));
  }

  crear(payload: CrearClientePayload) {
    return this.api.post<Cliente>(endpoints.clientes.base, payload);
  }

  actualizar(id: number | string, payload: EditarClientePayload) {
    return this.api.patch<Cliente>(endpoints.clientes.byId(id), payload);
  }

  canjear(id: number | string) {
    return this.api.post<Cliente>(endpoints.clientes.canjear(id), {});
  }
}
