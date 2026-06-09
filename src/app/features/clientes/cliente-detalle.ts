import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Cliente } from '../../shared/models/cliente.model';
import { Compra } from '../../shared/models/compra.model';
import { Sucursal } from '../../shared/models/sucursal.model';
import { CatalogService } from '../../shared/services/catalog.service';
import { ComprobanteService } from '../../shared/services/comprobante.service';
import { Modal } from '../../shared/ui/modal/modal';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { formatBs } from '../../shared/utils/format.util';
import { ComprasService } from '../ventas/compras.service';
import { ClientesService } from './clientes.service';

@Component({
  selector: 'app-cliente-detalle',
  imports: [RouterLink, DatePipe, ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto w-full max-w-[60rem]">
      <a routerLink="/clientes" class="text-[0.82rem] font-semibold text-[#57606a] no-underline hover:text-[#004ab1]">
        ← Volver a clientes
      </a>

      @if (loading()) {
        <p class="mt-6 text-center text-[#57606a]">Cargando…</p>
      } @else if (error()) {
        <p class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {{ error() }}
        </p>
      } @else if (cliente(); as c) {
        <!-- Cabecera -->
        <header class="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="m-0 text-[clamp(1.6rem,3vw,2.1rem)] font-[850] tracking-[-0.04em] text-[#004ab1]">
              {{ c.nombre }}
            </h1>
            <p class="m-0 mt-1 text-[0.9rem] text-[#57606a]">CI {{ c.ci }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-4 py-2.5 text-[0.84rem] font-extrabold text-white no-underline transition hover:bg-[#003f98]"
              [routerLink]="['/ventas']"
              [queryParams]="{ cliente: c.id }"
            >
              + Nueva venta
            </a>
            <button
              type="button"
              class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.84rem] font-extrabold text-[#004ab1] transition hover:bg-[#f6f9fd]"
              (click)="imprimir(c.id)"
            >
              Imprimir comprobante
            </button>
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <!-- Columna principal -->
          <div class="grid gap-6">
            <!-- Tarjeta de sellos -->
            <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.6rem)]">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="m-0 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Tarjeta de sellos</h2>
                <span class="text-[0.82rem] font-bold text-[#57606a]">Acumulado: {{ money(c.monto_acumulado) }}</span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                @for (i of sellosSlots; track i) {
                  @if (i < c.sellos) {
                    <span class="grid size-11 place-items-center rounded-full border-2 border-[#004ab1] bg-[#004ab1] text-xl text-amber-300">★</span>
                  } @else {
                    <span class="grid size-11 place-items-center rounded-full border-2 border-dashed border-[#c4d3ea] text-xl text-transparent">★</span>
                  }
                }
              </div>

              <div class="mt-5">
                @if (c.descuento_canjeado) {
                  <p class="m-0 rounded-xl border border-[#e1e7f0] bg-[#f4f4f5] px-4 py-3 text-[0.86rem] font-semibold text-[#71717a]">
                    Premio ya canjeado
                    @if (c.fecha_canje) { · {{ c.fecha_canje | date: 'dd/MM/yyyy' }} }
                    @if (c.canjeador) { · por {{ c.canjeador.nombre }} }
                  </p>
                } @else if (c.descuento_ganado) {
                  <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <span class="text-[0.88rem] font-bold text-green-700">¡Tarjeta completa! El cliente puede girar la ruleta por su premio.</span>
                    <button
                      type="button"
                      class="rounded-[0.62rem] border border-green-700 bg-green-700 px-4 py-2 text-[0.82rem] font-extrabold text-white transition hover:bg-green-800"
                      (click)="canjeOpen.set(true)"
                    >
                      Canjear premio
                    </button>
                  </div>
                } @else {
                  <p class="m-0 text-[0.86rem] text-[#57606a]">
                    Lleva <strong class="text-[#004ab1]">{{ c.sellos }}/6</strong> sellos.
                    Faltan {{ 6 - c.sellos }} para completar la tarjeta.
                  </p>
                }
              </div>
            </article>

            <!-- Historial de compras -->
            <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.6rem)]">
              <h2 class="m-0 mb-3 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Historial de compras</h2>
              @if (compras().length === 0) {
                <p class="m-0 text-center text-sm text-[#8a99ad]">Sin compras registradas.</p>
              } @else {
                <div class="overflow-x-auto rounded-[0.9rem]">
                  <table class="w-full min-w-[40rem] border-collapse text-left text-[0.84rem]">
                    <thead class="bg-[#f8fafc] text-[0.7rem] uppercase tracking-[0.08em] text-[#8a99ad]">
                      <tr>
                        <th class="px-3.5 py-2.5 font-bold">Fecha</th>
                        <th class="px-3.5 py-2.5 font-bold">Nota</th>
                        <th class="px-3.5 py-2.5 font-bold">Total</th>
                        <th class="px-3.5 py-2.5 font-bold">Sellos</th>
                        <th class="px-3.5 py-2.5 font-bold">Vendedor</th>
                        <th class="px-3.5 py-2.5 font-bold">Estado</th>
                        @if (auth.isAdmin()) {
                          <th class="px-3.5 py-2.5 font-bold"></th>
                        }
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#d8dee4]">
                      @for (compra of compras(); track compra.id) {
                        <tr class="align-top">
                          <td class="whitespace-nowrap px-3.5 py-2.5 text-[#57606a]">{{ compra.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                          <td class="px-3.5 py-2.5 text-[#24292f]">{{ compra.nota_venta || '—' }}</td>
                          <td class="px-3.5 py-2.5 font-bold text-[#004ab1]">{{ money(compra.monto_total) }}</td>
                          <td class="px-3.5 py-2.5 text-[#57606a]">+{{ compra.sellos_otorgados }}</td>
                          <td class="px-3.5 py-2.5 text-[#57606a]">{{ compra.vendedor?.nombre || '—' }}</td>
                          <td class="px-3.5 py-2.5">
                            @if (compra.anulacion) {
                              <span class="rounded-full bg-red-50 px-2.5 py-1 text-[0.72rem] font-bold text-red-700" [title]="anulacionMotivo(compra)">Anulada</span>
                            } @else {
                              <span class="rounded-full bg-green-100 px-2.5 py-1 text-[0.72rem] font-bold text-green-700">Válida</span>
                            }
                          </td>
                          @if (auth.isAdmin()) {
                            <td class="whitespace-nowrap px-3.5 py-2.5 text-right">
                              @if (!compra.anulacion) {
                                <button
                                  type="button"
                                  class="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[0.74rem] font-extrabold text-red-700 transition hover:bg-red-100"
                                  (click)="openAnular(compra)"
                                >
                                  Anular
                                </button>
                              }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </article>
          </div>

          <!-- Columna lateral: datos -->
          <aside class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.1rem,2.5vw,1.4rem)] lg:self-start">
            <div class="mb-3 flex items-center justify-between gap-2">
              <h2 class="m-0 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#8a99ad]">Datos</h2>
              <button type="button" class="text-[0.74rem] font-extrabold text-[#004ab1] hover:underline" (click)="openEdit()">Editar</button>
            </div>
            <dl class="grid divide-y divide-[#eef1f4]">
              <div class="grid gap-0.5 py-2.5">
                <dt class="text-[0.7rem] font-bold uppercase tracking-wide text-[#8a99ad]">Teléfono</dt>
                <dd class="m-0 text-[0.86rem] font-semibold text-[#24292f]">{{ c.telefono || '—' }}</dd>
              </div>
              <div class="grid gap-0.5 py-2.5">
                <dt class="text-[0.7rem] font-bold uppercase tracking-wide text-[#8a99ad]">Correo</dt>
                <dd class="m-0 break-all text-[0.86rem] font-semibold text-[#24292f]">{{ c.correo || '—' }}</dd>
              </div>
              <div class="grid gap-0.5 py-2.5">
                <dt class="text-[0.7rem] font-bold uppercase tracking-wide text-[#8a99ad]">Sucursal</dt>
                <dd class="m-0 text-[0.86rem] font-semibold text-[#24292f]">{{ c.sucursal?.nombre || '—' }}</dd>
              </div>
              <div class="grid gap-0.5 py-2.5">
                <dt class="text-[0.7rem] font-bold uppercase tracking-wide text-[#8a99ad]">Registrado por</dt>
                <dd class="m-0 text-[0.86rem] font-semibold text-[#24292f]">{{ c.registrador?.nombre || '—' }}</dd>
              </div>
              <div class="grid gap-0.5 py-2.5">
                <dt class="text-[0.7rem] font-bold uppercase tracking-wide text-[#8a99ad]">Alta</dt>
                <dd class="m-0 text-[0.86rem] font-semibold text-[#24292f]">{{ c.created_at | date: 'dd/MM/yyyy' }}</dd>
              </div>
            </dl>
          </aside>
        </div>

        @if (canjeOpen()) {
          <app-modal
            title="Canjear premio"
            subtitle="Esta acción es única por cliente y no se puede deshacer"
            size="sm"
            (closed)="canjeOpen.set(false)"
          >
            @if (canjeError()) {
              <p class="m-0 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ canjeError() }}</p>
            }
            <p class="m-0 text-[0.9rem] leading-relaxed text-[#57606a]">
              Confirma que <strong class="text-[#004ab1]">{{ c.nombre }}</strong> girará la ruleta y recibirá su premio.
              La tarjeta quedará marcada como canjeada de forma permanente.
            </p>
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#004ab1]"
                [disabled]="canjeando()"
                (click)="canjeOpen.set(false)"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-[0.62rem] border border-green-700 bg-green-700 px-4 py-2.5 text-[0.82rem] font-extrabold text-white disabled:opacity-55"
                [disabled]="canjeando()"
                (click)="confirmarCanje(c.id)"
              >
                {{ canjeando() ? 'Canjeando…' : 'Confirmar canje' }}
              </button>
            </div>
          </app-modal>
        }

        @if (anularTarget(); as compra) {
          <app-modal
            title="Anular compra"
            subtitle="Revierte los sellos otorgados por esta compra"
            size="sm"
            (closed)="closeAnular()"
          >
            @if (anularError()) {
              <p class="m-0 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ anularError() }}</p>
            }
            <p class="m-0 text-[0.9rem] leading-relaxed text-[#57606a]">
              Compra del {{ compra.fecha | date: 'dd/MM/yyyy HH:mm' }} por
              <strong class="text-[#004ab1]">{{ money(compra.monto_total) }}</strong>.
              Se descontarán <strong>{{ compra.sellos_otorgados }}</strong> sello(s) al cliente.
            </p>
            <label class="mt-4 grid gap-1.5">
              <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Motivo *</span>
              <input
                class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] text-[#004ab1] outline-none focus:border-[#004ab1]/40"
                [class.border-red-400]="motivoControl.invalid && motivoControl.touched"
                [formControl]="motivoControl"
                placeholder="Ej. Devolución del cliente"
              />
            </label>
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#004ab1]"
                [disabled]="anulando()"
                (click)="closeAnular()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-[0.62rem] border border-red-700 bg-red-700 px-4 py-2.5 text-[0.82rem] font-extrabold text-white disabled:opacity-55"
                [disabled]="anulando()"
                (click)="confirmarAnular(compra.id)"
              >
                {{ anulando() ? 'Anulando…' : 'Confirmar anulación' }}
              </button>
            </div>
          </app-modal>
        }

        @if (editOpen()) {
          <app-modal
            title="Editar cliente"
            subtitle="Corrige los datos del cliente (no afecta sus sellos)"
            (closed)="closeEdit()"
          >
            <form class="grid gap-4" [formGroup]="editForm" (ngSubmit)="submitEdit()">
              @if (editError()) {
                <p class="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ editError() }}</p>
              }
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-1.5">
                  <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">CI *</span>
                  <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" [class.border-red-400]="editInvalid('ci')" formControlName="ci" />
                </label>
                <label class="grid gap-1.5">
                  <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Nombre *</span>
                  <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" [class.border-red-400]="editInvalid('nombre')" formControlName="nombre" />
                </label>
                <label class="grid gap-1.5">
                  <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Teléfono</span>
                  <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" formControlName="telefono" placeholder="Opcional" />
                </label>
                <label class="grid gap-1.5">
                  <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Correo</span>
                  <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" [class.border-red-400]="editInvalid('correo')" formControlName="correo" type="email" placeholder="Opcional" />
                </label>
              </div>
              <label class="grid gap-1.5">
                <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Sucursal *</span>
                <select class="rounded-[0.74rem] border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[0.86rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40" formControlName="sucursal_id">
                  @for (s of sucursales(); track s.id) {
                    <option [ngValue]="s.id">{{ s.nombre }}</option>
                  }
                </select>
              </label>
              <div class="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#004ab1]" [disabled]="editSaving()" (click)="closeEdit()">Cancelar</button>
                <button type="submit" class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-4 py-2.5 text-[0.82rem] font-extrabold text-white disabled:opacity-55" [disabled]="editSaving()">
                  {{ editSaving() ? 'Guardando…' : 'Guardar cambios' }}
                </button>
              </div>
            </form>
          </app-modal>
        }
      }
    </section>
  `,
})
export class ClienteDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientesService = inject(ClientesService);
  private readonly comprasService = inject(ComprasService);
  private readonly comprobante = inject(ComprobanteService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly auth = inject(AuthService);

  protected readonly sellosSlots = [0, 1, 2, 3, 4, 5];

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cliente = signal<Cliente | null>(null);
  readonly compras = signal<Compra[]>([]);

  readonly canjeOpen = signal(false);
  readonly canjeando = signal(false);
  readonly canjeError = signal<string | null>(null);

  readonly anularTarget = signal<Compra | null>(null);
  readonly anulando = signal(false);
  readonly anularError = signal<string | null>(null);
  readonly motivoControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  readonly editOpen = signal(false);
  readonly editSaving = signal(false);
  readonly editError = signal<string | null>(null);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly editForm = this.fb.group({
    ci: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    telefono: [''],
    correo: ['', [Validators.email]],
    sucursal_id: [null as number | null, [Validators.required]],
  });

  private clienteId: string | null = null;

  ngOnInit(): void {
    this.clienteId = this.route.snapshot.paramMap.get('id');
    if (!this.clienteId) {
      this.error.set('Cliente no especificado.');
      this.loading.set(false);
      return;
    }

    this.fetch().subscribe({
      next: ({ cliente, compras }) => {
        this.cliente.set(cliente);
        this.compras.set(compras);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(e, 'No se pudo cargar el cliente.'));
        this.loading.set(false);
      },
    });
  }

  private fetch() {
    return forkJoin({
      cliente: this.clientesService.obtener(this.clienteId as string),
      compras: this.clientesService
        .obtenerCompras(this.clienteId as string)
        .pipe(catchError(() => of<Compra[]>([]))),
    });
  }

  protected money(value: string | number): string {
    return formatBs(value);
  }

  protected anulacionMotivo(compra: Compra): string {
    const a = compra.anulacion as { motivo?: string } | null | undefined;
    return a?.motivo ? `Motivo: ${a.motivo}` : 'Compra anulada';
  }

  imprimir(id: number): void {
    this.comprobante.abrir(id);
  }

  confirmarCanje(id: number): void {
    if (this.canjeando()) return;
    this.canjeando.set(true);
    this.canjeError.set(null);

    this.clientesService.canjear(id).subscribe({
      next: (actualizado) => {
        this.cliente.set(actualizado);
        this.canjeando.set(false);
        this.canjeOpen.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.canjeError.set(httpErrorMessage(e, 'No se pudo canjear el premio.'));
        this.canjeando.set(false);
      },
    });
  }

  openAnular(compra: Compra): void {
    this.anularError.set(null);
    this.motivoControl.reset('');
    this.anularTarget.set(compra);
  }

  closeAnular(): void {
    if (this.anulando()) return;
    this.anularTarget.set(null);
  }

  confirmarAnular(compraId: number): void {
    if (this.anulando()) return;
    if (this.motivoControl.invalid) {
      this.motivoControl.markAsTouched();
      return;
    }

    this.anulando.set(true);
    this.anularError.set(null);

    this.comprasService
      .anular(compraId, this.motivoControl.value.trim())
      .subscribe({
        next: () => {
          this.anulando.set(false);
          this.anularTarget.set(null);
          this.fetch().subscribe(({ cliente, compras }) => {
            this.cliente.set(cliente);
            this.compras.set(compras);
          });
        },
        error: (e: HttpErrorResponse) => {
          this.anularError.set(httpErrorMessage(e, 'No se pudo anular la compra.'));
          this.anulando.set(false);
        },
      });
  }

  protected editInvalid(control: 'ci' | 'nombre' | 'correo'): boolean {
    const c = this.editForm.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  openEdit(): void {
    const c = this.cliente();
    if (!c) return;
    this.editError.set(null);
    this.editForm.reset({
      ci: c.ci,
      nombre: c.nombre,
      telefono: c.telefono ?? '',
      correo: c.correo ?? '',
      sucursal_id: c.sucursal_id,
    });
    if (this.sucursales().length === 0) {
      this.catalog.getSucursales().subscribe({
        next: (list) => this.sucursales.set(list),
        error: () => {
          /* el select queda vacío */
        },
      });
    }
    this.editOpen.set(true);
  }

  closeEdit(): void {
    if (this.editSaving()) return;
    this.editOpen.set(false);
  }

  submitEdit(): void {
    if (this.editSaving()) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editSaving.set(true);
    this.editError.set(null);

    const raw = this.editForm.getRawValue();
    this.clientesService
      .actualizar(this.clienteId as string, {
        ci: raw.ci.trim(),
        nombre: raw.nombre.trim(),
        correo: raw.correo?.trim() || null,
        telefono: raw.telefono?.trim() || null,
        sucursal_id: raw.sucursal_id ?? undefined,
      })
      .subscribe({
        next: (cliente) => {
          this.cliente.set(cliente);
          this.editSaving.set(false);
          this.editOpen.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.editError.set(httpErrorMessage(e, 'No se pudo actualizar el cliente.'));
          this.editSaving.set(false);
        },
      });
  }
}
