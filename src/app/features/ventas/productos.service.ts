import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';
import { Producto } from '../../shared/models/producto.model';

export interface ProductoFiltros {
  q?: string;
  categoria?: number | null;
  subcategoria?: number | null;
}

export interface ImportResult {
  mensaje: string;
  total_filas: number;
  creados: number;
  actualizados: number;
  desactivados: number;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly api = inject(ApiService);

  listar(filtros: ProductoFiltros = {}) {
    return this.api.get<Producto[]>(endpoints.productos.base, {
      q: filtros.q ?? '',
      categoria: filtros.categoria ?? undefined,
      subcategoria: filtros.subcategoria ?? undefined,
    });
  }

  // Importa el catálogo desde un Excel (campo multipart "archivo").
  importar(file: File) {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.api.upload<ImportResult>(endpoints.productos.importar, formData);
  }

  descargarPlantilla() {
    return this.api.getBlob(endpoints.productos.plantilla);
  }
}
