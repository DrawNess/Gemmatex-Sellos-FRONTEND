import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { Cliente } from '../../shared/models/cliente.model';
import { ResumenReporte } from '../../shared/models/reporte.model';
import { ReportesService } from '../../shared/services/reportes.service';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { formatBs } from '../../shared/utils/format.util';

interface Stat {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.isAdmin()) {
      @if (error()) {
        <p class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ error() }}</p>
      } @else if (loading()) {
        <p class="text-[#57606a]">Cargando…</p>
      } @else if (resumen()) {
        <!-- Franja de estadísticas -->
        <article class="overflow-hidden rounded-[1.05rem] border border-[#e1e7f0] bg-white">
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            @for (s of stats(); track s.label; let first = $first) {
              <div class="border-b border-r border-[#eef1f4] p-5">
                <p class="m-0 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">{{ s.label }}</p>
                <p
                  class="m-0 mt-2 font-[850] leading-none text-[#004ab1]"
                  [class]="first ? 'text-[1.45rem]' : 'text-[1.7rem]'"
                >
                  {{ s.value }}
                </p>
              </div>
            }
          </div>
        </article>

        <!-- Descuentos por canjear -->
        <div class="mt-8 flex items-center justify-between">
          <h2 class="m-0 text-[1.02rem] font-[850] text-[#004ab1]">Descuentos por canjear</h2>
          @if (pendientes().length > 0) {
            <span class="rounded-full border border-[#d9e2ef] px-3 py-1 text-[0.74rem] font-bold text-[#57606a]">{{ pendientes().length }}</span>
          }
        </div>

        <article class="mt-3 overflow-hidden rounded-[1.05rem] border border-[#e1e7f0] bg-white">
          @if (pendientes().length === 0) {
            <p class="m-0 px-5 py-8 text-center text-sm text-[#8a99ad]">No hay descuentos pendientes de canje.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full min-w-[40rem] border-collapse text-left text-[0.86rem]">
                <thead class="bg-[#f8fafc] text-[0.7rem] uppercase tracking-[0.08em] text-[#8a99ad]">
                  <tr>
                    <th class="px-4 py-2.5 font-bold">Nombre</th>
                    <th class="px-4 py-2.5 font-bold">CI</th>
                    <th class="px-4 py-2.5 font-bold">Ciudad</th>
                    <th class="px-4 py-2.5 font-bold">Sellos</th>
                    <th class="px-4 py-2.5 font-bold"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#d8dee4]">
                  @for (c of pendientes(); track c.id) {
                    <tr class="align-middle">
                      <td class="px-4 py-2.5 font-bold text-[#24292f]">{{ c.nombre }}</td>
                      <td class="px-4 py-2.5 text-[#57606a]">{{ c.ci }}</td>
                      <td class="px-4 py-2.5 text-[#57606a]">{{ c.sucursal?.nombre || '—' }}</td>
                      <td class="px-4 py-2.5 font-bold text-[#004ab1]">{{ c.sellos }}/6</td>
                      <td class="whitespace-nowrap px-4 py-2.5 text-right">
                        <a
                          class="rounded-[0.55rem] border border-[#004ab1] px-3.5 py-1.5 text-[0.78rem] font-extrabold text-[#004ab1] no-underline transition hover:bg-[#004ab1] hover:text-white"
                          [routerLink]="['/clientes', c.id]"
                        >
                          Canjear
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </article>
      }
    } @else {
      <p class="rounded-[1.05rem] border border-[#e1e7f0] bg-white px-5 py-6 text-[0.92rem] text-[#57606a]">
        Usa <strong class="text-[#004ab1]">+ Nueva venta</strong> en la barra superior para registrar compras,
        o el menú lateral para gestionar clientes y catálogo.
      </p>
    }
  `,
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly reportes = inject(ReportesService);

  readonly resumen = signal<ResumenReporte | null>(null);
  readonly pendientes = signal<Cliente[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly stats = computed<Stat[]>(() => {
    const r = this.resumen();
    if (!r) return [];
    return [
      { label: 'Total vendido', value: formatBs(r.monto_total_vendido) },
      { label: 'Ventas', value: String(r.total_compras) },
      { label: 'Clientes', value: String(r.total_clientes) },
      { label: 'Sellos otorgados', value: String(r.sellos_otorgados) },
      { label: 'Tarjetas completas', value: String(r.descuentos_ganados) },
      { label: 'Por canjear', value: String(r.descuentos_pendientes) },
    ];
  });

  ngOnInit(): void {
    if (!this.auth.isAdmin()) return;

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      resumen: this.reportes.resumen(),
      descuentos: this.reportes
        .descuentos()
        .pipe(catchError(() => of<Cliente[]>([]))),
    }).subscribe({
      next: ({ resumen, descuentos }) => {
        this.resumen.set(resumen);
        this.pendientes.set(descuentos.filter((c) => !c.descuento_canjeado));
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(e, 'No se pudieron cargar los reportes.'));
        this.loading.set(false);
      },
    });
  }
}
