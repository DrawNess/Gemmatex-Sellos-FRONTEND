import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';
import {
  CrearUsuarioPayload,
  UsuarioCuenta,
} from '../../shared/models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar() {
    return this.api.get<UsuarioCuenta[]>(endpoints.usuarios.base);
  }

  crear(payload: CrearUsuarioPayload) {
    return this.api.post<UsuarioCuenta>(endpoints.usuarios.base, payload);
  }

  cambiarEstado(id: number, activo: boolean) {
    return this.api.patch<UsuarioCuenta>(endpoints.usuarios.estado(id), {
      activo,
    });
  }
}
