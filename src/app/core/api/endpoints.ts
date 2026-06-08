import { environment } from '../../../environments/environment';

const apiRoot = `${environment.apiBaseUrl}/api/${environment.apiVersion}`;

export const endpoints = {
  auth: {
    login: `${apiRoot}/auth/login`,
  },
  sucursales: `${apiRoot}/sucursales`,
  categorias: `${apiRoot}/categorias`,
  clientes: {
    base: `${apiRoot}/clientes`,
    byId: (id: number | string) => `${apiRoot}/clientes/${id}`,
    canjear: (id: number | string) => `${apiRoot}/clientes/${id}/canjear`,
    compras: (id: number | string) => `${apiRoot}/clientes/${id}/compras`,
  },
  compras: {
    base: `${apiRoot}/compras`,
    byId: (id: number | string) => `${apiRoot}/compras/${id}`,
    anular: (id: number | string) => `${apiRoot}/compras/${id}/anular`,
  },
  productos: {
    base: `${apiRoot}/productos`,
    importar: `${apiRoot}/productos/importar`,
    plantilla: `${apiRoot}/productos/plantilla`,
  },
  usuarios: {
    base: `${apiRoot}/usuarios`,
    estado: (id: number | string) => `${apiRoot}/usuarios/${id}/estado`,
  },
  config: {
    descuento: `${apiRoot}/config/descuento`,
  },
  comprobante: (clienteId: number | string) =>
    `${apiRoot}/comprobante/${clienteId}`,
  reportes: {
    resumen: `${apiRoot}/reportes/resumen`,
    descuentos: `${apiRoot}/reportes/descuentos`,
    compras: `${apiRoot}/reportes/compras`,
  },
} as const;

export function isApiUrl(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl);
}
