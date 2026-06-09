import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { Cliente } from '../../shared/models/cliente.model';
import { Compra } from '../../shared/models/compra.model';
import { ComprobanteService } from '../../shared/services/comprobante.service';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { formatBs } from '../../shared/utils/format.util';
import { ClienteRegistroModal } from '../clientes/cliente-registro-modal';
import { ClientesService } from '../clientes/clientes.service';
import { ComprasService } from './compras.service';

@Component({
  selector: 'app-ventas-nueva',
  imports: [ReactiveFormsModule, ClienteRegistroModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (completed(); as compra) {
      <!-- ===== Resultado de la venta ===== -->
      <section class="mx-auto w-full max-w-[40rem]">
        <article class="rounded-[1.05rem] border border-green-200 bg-white p-[clamp(1.4rem,4vw,2rem)] text-center">
          <span class="mx-auto grid size-14 place-items-center rounded-full bg-green-100 text-2xl text-green-700">✓</span>
          <h1 class="mt-4 text-[1.5rem] font-[850] tracking-[-0.03em] text-[#004ab1]">Venta registrada</h1>
          <p class="mt-1 text-[0.9rem] text-[#57606a]">
            {{ compra.cliente?.nombre }} · Nota {{ compra.nota_venta }} · Total {{ money(compra.monto_total) }}
          </p>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-[#e1e7f0] bg-[#f8fafc] p-4">
              <p class="m-0 text-[0.72rem] font-bold uppercase tracking-wide text-[#8a99ad]">Sellos otorgados</p>
              <p class="m-0 mt-1 text-2xl font-[850] text-[#004ab1]">+{{ compra.sellos_otorgados }}</p>
            </div>
            <div class="rounded-xl border border-[#e1e7f0] bg-[#f8fafc] p-4">
              <p class="m-0 text-[0.72rem] font-bold uppercase tracking-wide text-[#8a99ad]">Tarjeta</p>
              <p class="m-0 mt-1 text-2xl font-[850] text-[#004ab1]">{{ compra.cliente?.sellos }}/6</p>
            </div>
          </div>

          @if ((compra.cliente?.sellos ?? 0) >= 6) {
            <p class="mt-4 rounded-xl border border-green-600 bg-green-500 px-4 py-3 text-[0.86rem] font-bold text-[#004ab1]">
              ¡Tarjeta completa! El cliente ya puede girar la ruleta por su premio.
            </p>
          }

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-5 py-2.5 text-[0.86rem] font-extrabold text-[#004ab1] transition hover:bg-[#f6f9fd]"
              (click)="nuevaVenta()"
            >
              Nueva venta
            </button>
            <button
              type="button"
              class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-5 py-2.5 text-[0.86rem] font-extrabold text-white transition hover:bg-[#003f98]"
              (click)="imprimir(compra)"
            >
              Imprimir comprobante
            </button>
          </div>
        </article>
      </section>
    } @else {
      <!-- ===== Registrar venta ===== -->
      <section class="mx-auto w-full max-w-[44rem]">
        <header class="mb-6">
          <h1 class="m-0 text-[clamp(1.6rem,3vw,2.1rem)] font-[850] tracking-[-0.04em] text-[#004ab1]">Nueva venta</h1>
          <p class="m-0 mt-2 text-[0.95rem] text-[#57606a]">Selecciona el cliente y registra la nota de venta del ERP con su monto.</p>
        </header>

        <div class="grid gap-6">
          <!-- Cliente -->
          <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.5rem)]">
            <h2 class="m-0 mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Cliente</h2>

            @if (selectedCliente(); as c) {
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1e7f0] bg-[#f8fafc] px-4 py-3">
                <div>
                  <p class="m-0 font-bold text-[#004ab1]">{{ c.nombre }}</p>
                  <p class="m-0 text-xs text-[#57606a]">CI {{ c.ci }} · {{ c.sellos }}/6 sellos · {{ money(c.monto_acumulado) }}</p>
                </div>
                <button type="button" class="text-[0.78rem] font-extrabold text-[#004ab1] hover:underline" (click)="clearCliente()">cambiar</button>
              </div>
              @if (descuentoDisponible()) {
                <p class="mt-3 rounded-xl border border-[#004ab1]/20 bg-[#004ab1]/5 px-4 py-3 text-[0.84rem] font-semibold text-[#004ab1]">
                  Este cliente tiene la tarjeta completa (premio por canjear). Puedes seguir registrando ventas con normalidad.
                </p>
              }
            } @else {
              <input
                class="w-full rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none placeholder:text-[#8da0bf] focus:border-[#004ab1]/40"
                [formControl]="clienteSearch"
                type="search"
                placeholder="Buscar cliente por CI o nombre…"
              />
              @if (clienteResults().length > 0) {
                <ul class="mt-2 grid divide-y divide-[#eef1f4] overflow-hidden rounded-xl border border-[#e1e7f0]">
                  @for (c of clienteResults(); track c.id) {
                    <li>
                      <button type="button" class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#f6f9fd]" (click)="selectCliente(c)">
                        <span>
                          <span class="block text-[0.86rem] font-bold text-[#004ab1]">{{ c.nombre }}</span>
                          <span class="block text-xs text-[#57606a]">CI {{ c.ci }}</span>
                        </span>
                        <span class="text-xs font-bold text-[#8a99ad]">{{ c.sellos }}/6</span>
                      </button>
                    </li>
                  }
                </ul>
              }
              @if (clienteTerm() && !clienteSearching() && clienteResults().length === 0) {
                <button
                  type="button"
                  class="mt-3 w-full rounded-xl border border-dashed border-[#004ab1]/40 bg-[#004ab1]/5 px-4 py-3 text-left text-[0.84rem] font-semibold text-[#004ab1] transition hover:bg-[#004ab1]/10"
                  (click)="openRegistro()"
                >
                  No se encontró «{{ clienteTerm() }}».
                  <span class="font-extrabold underline">Registrar nuevo cliente</span>
                </button>
              }
            }
          </article>

          <!-- Venta -->
          <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.5rem)]">
            <h2 class="m-0 mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Datos de la venta</h2>
            <form class="grid gap-4 sm:grid-cols-2" [formGroup]="ventaForm" (ngSubmit)="submit()">
              <label class="grid gap-1.5">
                <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">N.º de nota de venta *</span>
                <input
                  class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.9rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40"
                  [class.border-red-400]="invalid('nota_venta')"
                  formControlName="nota_venta"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej. 5001"
                />
                @if (invalid('nota_venta')) {
                  <span class="text-[0.72rem] text-red-600">Ingresa el número de nota.</span>
                }
              </label>
              <label class="grid gap-1.5">
                <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Monto total (Bs) *</span>
                <input
                  class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.9rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40"
                  [class.border-red-400]="invalid('monto_total')"
                  formControlName="monto_total"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ej. 1500.00"
                />
                @if (invalid('monto_total')) {
                  <span class="text-[0.72rem] text-red-600">Ingresa el monto total.</span>
                }
              </label>

              @if (error()) {
                <p class="sm:col-span-2 m-0 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-semibold text-red-700">{{ error() }}</p>
              }

              <button
                type="submit"
                class="sm:col-span-2 rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-5 py-3 text-[0.88rem] font-extrabold text-white transition hover:bg-[#003f98] disabled:cursor-not-allowed disabled:opacity-55"
                [disabled]="!selectedCliente() || saving()"
              >
                {{ saving() ? 'Registrando…' : 'Registrar venta' }}
              </button>
              @if (!selectedCliente()) {
                <p class="sm:col-span-2 m-0 text-center text-xs text-[#8a99ad]">Primero selecciona un cliente.</p>
              }
            </form>
          </article>
        </div>

        @if (registroOpen()) {
          <app-cliente-registro-modal
            [ci]="clienteSearch.value"
            (created)="onClienteCreated($event)"
            (closed)="registroOpen.set(false)"
          />
        }
      </section>
    }
  `,
})
export class VentasNuevaPage {
  private readonly clientesService = inject(ClientesService);
  private readonly comprasService = inject(ComprasService);
  private readonly comprobante = inject(ComprobanteService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly clienteSearch = new FormControl('', { nonNullable: true });

  readonly clienteResults = signal<Cliente[]>([]);
  readonly clienteTerm = signal('');
  readonly clienteSearching = signal(false);
  readonly registroOpen = signal(false);
  readonly selectedCliente = signal<Cliente | null>(null);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly completed = signal<Compra | null>(null);

  readonly ventaForm = this.fb.group({
    nota_venta: [null as number | null, [Validators.required, Validators.min(1)]],
    monto_total: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  readonly descuentoDisponible = computed(() => {
    const c = this.selectedCliente();
    return !!c && c.descuento_ganado && !c.descuento_canjeado;
  });

  constructor() {
    this.clienteSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((term) => {
          this.clienteTerm.set(term.trim());
          this.clienteSearching.set(!!term.trim());
        }),
        switchMap((term) =>
          term.trim()
            ? this.clientesService
                .buscar(term.trim())
                .pipe(catchError(() => of<Cliente[]>([])))
            : of<Cliente[]>([])
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        this.clienteResults.set(list);
        this.clienteSearching.set(false);
      });

    // Precarga el cliente si llega ?cliente=ID (ej. desde el detalle).
    const clienteId = this.route.snapshot.queryParamMap.get('cliente');
    if (clienteId) {
      this.clientesService.obtener(clienteId).subscribe({
        next: (c) => this.selectCliente(c),
        error: () => {
          /* se ignora y queda la búsqueda manual */
        },
      });
    }
  }

  protected money(value: string | number): string {
    return formatBs(value);
  }

  protected invalid(control: 'nota_venta' | 'monto_total'): boolean {
    const c = this.ventaForm.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  selectCliente(c: Cliente): void {
    this.selectedCliente.set(c);
    this.clienteResults.set([]);
    this.clienteSearch.setValue('', { emitEvent: false });
    this.error.set(null);
  }

  clearCliente(): void {
    this.selectedCliente.set(null);
  }

  openRegistro(): void {
    this.registroOpen.set(true);
  }

  onClienteCreated(cliente: Cliente): void {
    this.registroOpen.set(false);
    this.selectCliente(cliente);
  }

  submit(): void {
    const cliente = this.selectedCliente();
    if (!cliente || this.saving()) return;
    if (this.ventaForm.invalid) {
      this.ventaForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const v = this.ventaForm.getRawValue();
    this.comprasService
      .registrar({
        cliente_id: cliente.id,
        nota_venta: Number(v.nota_venta),
        monto_total: Number(v.monto_total),
      })
      .subscribe({
        next: (compra) => {
          this.saving.set(false);
          this.completed.set(compra);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(httpErrorMessage(e, 'No se pudo registrar la venta.'));
          this.saving.set(false);
        },
      });
  }

  imprimir(compra: Compra): void {
    this.comprobante.abrir(compra.cliente_id);
  }

  nuevaVenta(): void {
    this.completed.set(null);
    this.selectedCliente.set(null);
    this.error.set(null);
    this.clienteResults.set([]);
    this.clienteTerm.set('');
    this.clienteSearch.setValue('', { emitEvent: false });
    this.ventaForm.reset({ nota_venta: null, monto_total: null });
  }
}
