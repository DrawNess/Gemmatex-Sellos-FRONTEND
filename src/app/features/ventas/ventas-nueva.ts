import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
import { Producto } from '../../shared/models/producto.model';
import { ComprobanteService } from '../../shared/services/comprobante.service';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { formatBs } from '../../shared/utils/format.util';
import { ClienteRegistroModal } from '../clientes/cliente-registro-modal';
import { ClientesService } from '../clientes/clientes.service';
import { ComprasService } from './compras.service';
import { ProductosService } from './productos.service';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

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
            {{ compra.cliente?.nombre }} · Total {{ money(compra.monto_total) }}
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
              ¡Tarjeta completa! El cliente ya puede canjear su descuento.
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
      <!-- ===== Punto de venta ===== -->
      <section class="mx-auto w-full max-w-none">
        <header class="mb-6">
          <h1 class="m-0 text-[clamp(1.6rem,3vw,2.1rem)] font-[850] tracking-[-0.04em] text-[#004ab1]">Nueva venta</h1>
          <p class="m-0 mt-2 text-[0.95rem] text-[#57606a]">Selecciona el cliente, agrega productos y registra la compra.</p>
        </header>

        <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <!-- Columna izquierda -->
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
                    Este cliente tiene un descuento disponible para canjear. Puedes seguir registrando ventas con normalidad.
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

            <!-- Productos -->
            <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.5rem)]">
              <h2 class="m-0 mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Productos</h2>
              <input
                class="w-full rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none placeholder:text-[#8da0bf] focus:border-[#004ab1]/40"
                [formControl]="productoSearch"
                type="search"
                placeholder="Buscar producto por nombre o SKU…"
              />
              @if (productoLoading()) {
                <p class="mt-3 text-sm text-[#57606a]">Buscando…</p>
              } @else if (productoResults().length > 0) {
                <ul class="mt-2 grid divide-y divide-[#eef1f4] overflow-hidden rounded-xl border border-[#e1e7f0]">
                  @for (p of productoResults(); track p.id) {
                    <li>
                      <button type="button" class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-[#f6f9fd]" (click)="addProducto(p)">
                        <span>
                          <span class="block text-[0.86rem] font-bold text-[#004ab1]">{{ p.nombre }}</span>
                          <span class="block text-xs text-[#57606a]">{{ p.sku }}</span>
                        </span>
                        <span class="text-[0.82rem] font-bold text-[#24292f]">{{ money(p.precio) }}</span>
                      </button>
                    </li>
                  }
                </ul>
              }
            </article>
          </div>

          <!-- Columna derecha: carrito -->
          <aside class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.5rem)] lg:sticky lg:top-20 lg:self-start">
            <h2 class="m-0 mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Detalle</h2>

            @if (cart().length === 0) {
              <p class="py-6 text-center text-sm text-[#8a99ad]">Aún no agregas productos.</p>
            } @else {
              <ul class="grid gap-3">
                @for (item of cart(); track item.producto.id; let i = $index) {
                  <li class="grid gap-1.5 border-b border-[#eef1f4] pb-3">
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-[0.84rem] font-bold text-[#004ab1]">{{ item.producto.nombre }}</span>
                      <button type="button" class="text-[0.72rem] font-extrabold text-red-600 hover:underline" (click)="removeItem(i)">quitar</button>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <input
                        class="w-24 rounded-lg border border-[#d9e2ef] px-2.5 py-1.5 text-[0.82rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40"
                        type="number"
                        min="0.01"
                        step="0.01"
                        [value]="item.cantidad"
                        (input)="updateCantidad(i, $event)"
                      />
                      <span class="text-[0.84rem] font-bold text-[#24292f]">{{ money(subtotal(item)) }}</span>
                    </div>
                    <span class="text-xs text-[#8a99ad]">{{ money(item.producto.precio) }} c/u</span>
                  </li>
                }
              </ul>

              <div class="mt-4 flex items-center justify-between border-t border-[#d8dee4] pt-3">
                <span class="text-[0.82rem] font-bold uppercase tracking-wide text-[#8a99ad]">Total</span>
                <span class="text-[1.2rem] font-[850] text-[#004ab1]">{{ money(total()) }}</span>
              </div>
            }

            @if (error()) {
              <p class="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.82rem] font-semibold text-red-700">{{ error() }}</p>
            }

            <button
              type="button"
              class="mt-4 w-full rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-5 py-3 text-[0.88rem] font-extrabold text-white transition hover:bg-[#003f98] disabled:cursor-not-allowed disabled:opacity-55"
              [disabled]="!canSubmit()"
              (click)="submit()"
            >
              {{ saving() ? 'Registrando…' : 'Registrar venta' }}
            </button>
          </aside>
        </div>
      </section>

      @if (registroOpen()) {
        <app-cliente-registro-modal
          [ci]="clienteSearch.value"
          (created)="onClienteCreated($event)"
          (closed)="registroOpen.set(false)"
        />
      }
    }
  `,
})
export class VentasNuevaPage {
  private readonly clientesService = inject(ClientesService);
  private readonly productosService = inject(ProductosService);
  private readonly comprasService = inject(ComprasService);
  private readonly comprobante = inject(ComprobanteService);
  private readonly route = inject(ActivatedRoute);

  readonly clienteSearch = new FormControl('', { nonNullable: true });
  readonly productoSearch = new FormControl('', { nonNullable: true });

  readonly clienteResults = signal<Cliente[]>([]);
  readonly productoResults = signal<Producto[]>([]);
  readonly productoLoading = signal(false);

  readonly clienteTerm = signal('');
  readonly clienteSearching = signal(false);
  readonly registroOpen = signal(false);

  readonly selectedCliente = signal<Cliente | null>(null);
  readonly cart = signal<CartItem[]>([]);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly completed = signal<Compra | null>(null);

  // El cliente completó su tarjeta y aún no canjea (informativo, ya no bloquea).
  readonly descuentoDisponible = computed(() => {
    const c = this.selectedCliente();
    return !!c && c.descuento_ganado && !c.descuento_canjeado;
  });

  readonly total = computed(() =>
    this.cart().reduce((acc, item) => acc + this.subtotal(item), 0)
  );

  readonly canSubmit = computed(
    () =>
      !!this.selectedCliente() &&
      this.cart().length > 0 &&
      !this.saving()
  );

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

    this.productoSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.productoLoading.set(true);
          return this.productosService
            .listar({ q: term.trim() })
            .pipe(catchError(() => of<Producto[]>([])));
        }),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        this.productoResults.set(list);
        this.productoLoading.set(false);
      });

    // Si llega ?cliente=ID (ej. desde el detalle del cliente), lo preselecciona.
    const clienteId = this.route.snapshot.queryParamMap.get('cliente');
    if (clienteId) {
      this.clientesService.obtener(clienteId).subscribe({
        next: (c) => this.selectCliente(c),
        error: () => {
          /* si no existe, se ignora y queda la búsqueda manual */
        },
      });
    }
  }

  protected money(value: string | number): string {
    return formatBs(value);
  }

  protected subtotal(item: CartItem): number {
    return Number(item.producto.precio) * item.cantidad;
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

  addProducto(p: Producto): void {
    this.cart.update((items) => {
      const existing = items.find((i) => i.producto.id === p.id);
      if (existing) {
        return items.map((i) =>
          i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...items, { producto: p, cantidad: 1 }];
    });
  }

  updateCantidad(index: number, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    const cantidad = Number.isFinite(value) && value > 0 ? value : 0.01;
    this.cart.update((items) =>
      items.map((item, i) => (i === index ? { ...item, cantidad } : item))
    );
  }

  removeItem(index: number): void {
    this.cart.update((items) => items.filter((_, i) => i !== index));
  }

  submit(): void {
    if (!this.canSubmit()) return;
    const cliente = this.selectedCliente();
    if (!cliente) return;

    this.saving.set(true);
    this.error.set(null);

    this.comprasService
      .registrar({
        cliente_id: cliente.id,
        items: this.cart().map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
        })),
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
    this.cart.set([]);
    this.error.set(null);
    this.productoResults.set([]);
    this.clienteResults.set([]);
    this.productoSearch.setValue('', { emitEvent: false });
    this.clienteSearch.setValue('', { emitEvent: false });
  }
}
