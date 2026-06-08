import { inject, Injectable } from '@angular/core';

import { ApiService } from '../../core/api/api.service';
import { endpoints } from '../../core/api/endpoints';

@Injectable({ providedIn: 'root' })
export class ComprobanteService {
  private readonly api = inject(ApiService);

  // Devuelve el HTML standalone del comprobante (texto plano).
  obtenerHtml(clienteId: number | string) {
    return this.api.getText(endpoints.comprobante(clienteId));
  }

  // Abre el comprobante en una ventana nueva para verlo e imprimirlo.
  // Se trae con fetch (token Bearer) y se inyecta — no se puede abrir la URL
  // directa porque requiere autenticación.
  abrir(clienteId: number | string): void {
    this.obtenerHtml(clienteId).subscribe((html) => {
      const win = window.open('', '_blank', 'width=480,height=760');
      if (!win) return;
      win.document.open();
      win.document.write(html);
      win.document.close();
    });
  }
}
