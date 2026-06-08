export interface Categoria {
  id: number;
  nombre: string;
  subcategorias?: Subcategoria[];
}

export interface Subcategoria {
  id: number;
  nombre: string;
  categoria_id: number;
  categoria?: Categoria;
}

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  precio: string | number;
  activo: boolean;
  subcategoria_id: number;
  subcategoria?: Subcategoria;
}
