import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';
import { Categoria } from '../models/producto.model';
import { Sucursal } from '../models/sucursal.model';

// Datos de catálogo/lookup reutilizables (sucursales, categorías, ...).
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);

  getSucursales() {
    return this.api.get<Sucursal[]>(endpoints.sucursales);
  }

  getCategorias() {
    return this.api.get<Categoria[]>(endpoints.categorias);
  }
}
