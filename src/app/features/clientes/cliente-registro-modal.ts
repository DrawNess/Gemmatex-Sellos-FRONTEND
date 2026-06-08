import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { Cliente } from '../../shared/models/cliente.model';
import { Sucursal } from '../../shared/models/sucursal.model';
import { CatalogService } from '../../shared/services/catalog.service';
import { Modal } from '../../shared/ui/modal/modal';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { ClientesService } from './clientes.service';

// Modal de registro de cliente reutilizable. Emite (created) con el cliente
// recién creado y (closed) al cerrar. Acepta una CI inicial para prellenar.
@Component({
  selector: 'app-cliente-registro-modal',
  imports: [ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      title="Registrar cliente"
      subtitle="Los sellos se otorgan al registrar compras"
      (closed)="onClose()"
    >
      <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
        @if (formError()) {
          <p class="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {{ formError() }}
          </p>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">CI *</span>
            <input
              class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40"
              [class.border-red-400]="invalid('ci')"
              formControlName="ci"
              placeholder="Ej. 9876543"
            />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Nombre *</span>
            <input
              class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40"
              [class.border-red-400]="invalid('nombre')"
              formControlName="nombre"
              placeholder="Nombre completo"
            />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Teléfono</span>
            <input
              class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40"
              formControlName="telefono"
              placeholder="Opcional"
            />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Correo</span>
            <input
              class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40"
              [class.border-red-400]="invalid('correo')"
              formControlName="correo"
              type="email"
              placeholder="Opcional"
            />
          </label>
        </div>

        <label class="grid gap-1.5">
          <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Sucursal *</span>
          <select
            class="rounded-[0.74rem] border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[0.86rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40"
            formControlName="sucursal_id"
          >
            @for (s of sucursales(); track s.id) {
              <option [ngValue]="s.id">{{ s.nombre }}</option>
            }
          </select>
        </label>

        <div class="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#004ab1] transition hover:bg-[#f6f9fd]"
            [disabled]="saving()"
            (click)="onClose()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-4 py-2.5 text-[0.82rem] font-extrabold text-white transition hover:bg-[#003f98] disabled:opacity-55"
            [disabled]="saving()"
          >
            {{ saving() ? 'Guardando…' : 'Registrar cliente' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class ClienteRegistroModal implements OnInit {
  private readonly clientesService = inject(ClientesService);
  private readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly ci = input<string>('');
  readonly created = output<Cliente>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly sucursales = signal<Sucursal[]>([]);

  readonly form = this.fb.group({
    ci: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    correo: ['', [Validators.email]],
    telefono: [''],
    sucursal_id: [this.auth.user()?.sucursal_id ?? null, [Validators.required]],
  });

  ngOnInit(): void {
    // Prellena la CI solo si el término buscado es numérico.
    const ci = this.ci().trim();
    if (ci && /^\d+$/.test(ci)) {
      this.form.controls.ci.setValue(ci);
    }
    this.catalog.getSucursales().subscribe({
      next: (list) => this.sucursales.set(list),
      error: () => {
        /* el select queda vacío */
      },
    });
  }

  protected invalid(control: 'ci' | 'nombre' | 'correo'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  onClose(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    const raw = this.form.getRawValue();
    this.clientesService
      .crear({
        ci: raw.ci.trim(),
        nombre: raw.nombre.trim(),
        correo: raw.correo?.trim() || null,
        telefono: raw.telefono?.trim() || null,
        sucursal_id: raw.sucursal_id ?? undefined,
      })
      .subscribe({
        next: (cliente) => {
          this.saving.set(false);
          this.created.emit(cliente);
        },
        error: (e: HttpErrorResponse) => {
          this.formError.set(
            httpErrorMessage(e, 'No se pudo registrar el cliente.')
          );
          this.saving.set(false);
        },
      });
  }
}
