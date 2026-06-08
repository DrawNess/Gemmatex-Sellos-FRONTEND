import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { Cliente } from '../../shared/models/cliente.model';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { formatBs } from '../../shared/utils/format.util';
import { ClienteRegistroModal } from './cliente-registro-modal';
import { ClientesService } from './clientes.service';

@Component({
  selector: 'app-clientes-list',
  imports: [ReactiveFormsModule, RouterLink, ClienteRegistroModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto w-full max-w-none">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="m-0 text-[clamp(1.6rem,3vw,2.1rem)] font-[850] tracking-[-0.04em] text-[#004ab1]">
            Clientes
          </h1>
          <p class="m-0 mt-2 text-[0.95rem] text-[#57606a]">
            Busca clientes por CI o nombre y registra nuevos.
          </p>
        </div>
        <button
          type="button"
          class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-5 py-2.5 text-[0.88rem] font-extrabold text-white transition hover:bg-[#003f98]"
          (click)="openModal()"
        >
          + Registrar cliente
        </button>
      </header>

      <input
        class="mb-4 w-full rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none transition-colors placeholder:text-[#8da0bf] hover:border-[#c8d4e6] focus:border-[#004ab1]/40 sm:max-w-md"
        [formControl]="searchControl"
        type="search"
        placeholder="Buscar por CI o nombre…"
      />

      @if (error()) {
        <p class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {{ error() }}
        </p>
      }

      <article class="overflow-hidden rounded-[1.05rem] border border-[#e1e7f0] bg-white">
        @if (loading()) {
          <p class="m-0 px-5 py-8 text-center text-sm text-[#57606a]">Cargando clientes…</p>
        } @else if (clientes().length === 0) {
          <p class="m-0 px-5 py-8 text-center text-sm text-[#8a99ad]">No se encontraron clientes.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[48rem] border-collapse text-left text-[0.86rem]">
              <thead class="bg-[#f8fafc] text-[0.7rem] uppercase tracking-[0.08em] text-[#8a99ad]">
                <tr>
                  <th class="px-4 py-2.5 font-bold">Cliente</th>
                  <th class="px-4 py-2.5 font-bold">CI</th>
                  <th class="px-4 py-2.5 font-bold">Teléfono</th>
                  <th class="px-4 py-2.5 font-bold">Sellos</th>
                  <th class="px-4 py-2.5 font-bold">Acumulado</th>
                  <th class="px-4 py-2.5 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#d8dee4]">
                @for (cliente of clientes(); track cliente.id) {
                  <tr
                    class="cursor-pointer align-middle transition hover:bg-[#f6f9fd]"
                    [routerLink]="['/clientes', cliente.id]"
                  >
                    <td class="px-4 py-2.5 font-bold text-[#24292f]">{{ cliente.nombre }}</td>
                    <td class="px-4 py-2.5 text-[#57606a]">{{ cliente.ci }}</td>
                    <td class="px-4 py-2.5 text-[#57606a]">{{ cliente.telefono || '—' }}</td>
                    <td class="px-4 py-2.5">
                      <div class="flex items-center gap-1">
                        @for (i of sellosSlots; track i) {
                          @if (i < cliente.sellos) {
                            <span class="grid size-5 place-items-center rounded-full border border-[#004ab1] bg-[#004ab1] text-[0.6rem] text-amber-300">★</span>
                          } @else {
                            <span class="grid size-5 place-items-center rounded-full border border-[#d9e2ef] text-[0.6rem] text-transparent">★</span>
                          }
                        }
                        <span class="ml-1 text-xs font-bold text-[#57606a]">{{ cliente.sellos }}/6</span>
                      </div>
                    </td>
                    <td class="px-4 py-2.5 font-semibold text-[#24292f]">{{ money(cliente.monto_acumulado) }}</td>
                    <td class="px-4 py-2.5">
                      @if (cliente.descuento_canjeado) {
                        <span class="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[0.72rem] font-bold text-[#71717a]">Canjeado</span>
                      } @else if (cliente.descuento_ganado) {
                        <span class="rounded-full bg-green-100 px-2.5 py-1 text-[0.72rem] font-bold text-green-700">Tarjeta completa</span>
                      } @else {
                        <span class="rounded-full bg-[#004ab1]/5 px-2.5 py-1 text-[0.72rem] font-bold text-[#004ab1]">En progreso</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </article>
    </section>

    @if (modalOpen()) {
      <app-cliente-registro-modal
        (created)="onCreated()"
        (closed)="modalOpen.set(false)"
      />
    }
  `,
})
export class ClientesListPage {
  private readonly clientesService = inject(ClientesService);

  protected readonly sellosSlots = [0, 1, 2, 3, 4, 5];

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly clientes = signal<Cliente[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly modalOpen = signal(false);

  private readonly refresh$ = new Subject<void>();

  constructor() {
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(300),
      distinctUntilChanged()
    );

    merge(search$, this.refresh$.pipe(map(() => this.searchControl.value)))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((term) =>
          this.clientesService.buscar((term ?? '').trim()).pipe(
            catchError((e: HttpErrorResponse) => {
              this.error.set(
                httpErrorMessage(e, 'No se pudieron cargar los clientes.')
              );
              return of<Cliente[]>([]);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        this.clientes.set(list);
        this.loading.set(false);
      });
  }

  protected money(value: string | number): string {
    return formatBs(value);
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  onCreated(): void {
    this.modalOpen.set(false);
    this.refresh$.next();
  }
}
