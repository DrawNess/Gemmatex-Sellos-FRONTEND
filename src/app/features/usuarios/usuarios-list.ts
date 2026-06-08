import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { Sucursal } from '../../shared/models/sucursal.model';
import { UsuarioCuenta } from '../../shared/models/usuario.model';
import { CatalogService } from '../../shared/services/catalog.service';
import { Modal } from '../../shared/ui/modal/modal';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { UsuariosService } from './usuarios.service';

@Component({
  selector: 'app-usuarios-list',
  imports: [ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto w-full max-w-none">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="m-0 text-[clamp(1.6rem,3vw,2.1rem)] font-[850] tracking-[-0.04em] text-[#004ab1]">Usuarios</h1>
          <p class="m-0 mt-2 text-[0.95rem] text-[#57606a]">Vendedores y administradores del sistema.</p>
        </div>
        <button
          type="button"
          class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-5 py-2.5 text-[0.88rem] font-extrabold text-white transition hover:bg-[#003f98]"
          (click)="openModal()"
        >
          + Nuevo usuario
        </button>
      </header>

      <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.25rem,3vw,1.7rem)]">
        @if (error()) {
          <p class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ error() }}</p>
        }

        @if (loading()) {
          <p class="m-0 text-center text-[#57606a]">Cargando usuarios…</p>
        } @else {
          <div class="overflow-x-auto rounded-[0.9rem]">
            <table class="w-full min-w-[48rem] border-collapse text-left text-[0.86rem]">
              <thead class="bg-[#f8fafc] text-[0.7rem] uppercase tracking-[0.08em] text-[#8a99ad]">
                <tr>
                  <th class="px-3.5 py-2.5 font-bold">Nombre</th>
                  <th class="px-3.5 py-2.5 font-bold">Correo</th>
                  <th class="px-3.5 py-2.5 font-bold">Rol</th>
                  <th class="px-3.5 py-2.5 font-bold">Sucursal</th>
                  <th class="px-3.5 py-2.5 font-bold">Estado</th>
                  <th class="px-3.5 py-2.5 font-bold"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#d8dee4]">
                @for (u of usuarios(); track u.id) {
                  <tr class="align-middle">
                    <td class="px-3.5 py-2.5 font-bold text-[#004ab1]">{{ u.nombre }}</td>
                    <td class="break-all px-3.5 py-2.5 text-[#24292f]">{{ u.email }}</td>
                    <td class="px-3.5 py-2.5">
                      <span class="rounded-full bg-[#004ab1]/5 px-2.5 py-1 text-[0.72rem] font-bold text-[#004ab1]">
                        {{ u.rol === 'admin' ? 'Administrador' : 'Vendedor' }}
                      </span>
                    </td>
                    <td class="px-3.5 py-2.5 text-[#57606a]">{{ u.sucursal?.nombre || '—' }}</td>
                    <td class="px-3.5 py-2.5">
                      @if (u.activo) {
                        <span class="rounded-full bg-green-100 px-2.5 py-1 text-[0.72rem] font-bold text-green-700">Activo</span>
                      } @else {
                        <span class="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[0.72rem] font-bold text-[#71717a]">Inactivo</span>
                      }
                    </td>
                    <td class="whitespace-nowrap px-3.5 py-2.5 text-right">
                      @if (u.id === auth.user()?.id) {
                        <span class="text-[0.72rem] text-[#8a99ad]">tú</span>
                      } @else if (u.activo) {
                        <button
                          type="button"
                          class="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[0.78rem] font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-55"
                          [disabled]="updatingId() === u.id"
                          (click)="toggle(u)"
                        >
                          {{ updatingId() === u.id ? '…' : 'Desactivar' }}
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[0.78rem] font-extrabold text-green-700 transition hover:bg-green-100 disabled:opacity-55"
                          [disabled]="updatingId() === u.id"
                          (click)="toggle(u)"
                        >
                          {{ updatingId() === u.id ? '…' : 'Activar' }}
                        </button>
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
      <app-modal title="Nuevo usuario" subtitle="Crea un vendedor o administrador" (closed)="closeModal()">
        <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
          @if (formError()) {
            <p class="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ formError() }}</p>
          }

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-1.5">
              <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Nombre *</span>
              <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" [class.border-red-400]="invalid('nombre')" formControlName="nombre" placeholder="Nombre completo" />
            </label>
            <label class="grid gap-1.5">
              <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Correo *</span>
              <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" [class.border-red-400]="invalid('email')" formControlName="email" type="email" placeholder="correo@gemmatex.com" />
            </label>
            <label class="grid gap-1.5">
              <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Contraseña *</span>
              <input class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none focus:border-[#004ab1]/40" [class.border-red-400]="invalid('password')" formControlName="password" type="password" placeholder="Mín. 8 caracteres" />
              @if (invalid('password')) {
                <span class="text-[0.72rem] text-red-600">Mínimo 8 caracteres.</span>
              }
            </label>
            <label class="grid gap-1.5">
              <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Rol *</span>
              <select class="rounded-[0.74rem] border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[0.86rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40" formControlName="rol">
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
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
            <button type="button" class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#004ab1] transition hover:bg-[#f6f9fd]" [disabled]="saving()" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-4 py-2.5 text-[0.82rem] font-extrabold text-white transition hover:bg-[#003f98] disabled:opacity-55" [disabled]="saving()">
              {{ saving() ? 'Guardando…' : 'Crear usuario' }}
            </button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class UsuariosListPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly usuarios = signal<UsuarioCuenta[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly updatingId = signal<number | null>(null);

  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly sucursales = signal<Sucursal[]>([]);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['vendedor', [Validators.required]],
    sucursal_id: [this.auth.user()?.sucursal_id ?? null, [Validators.required]],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usuariosService.listar().subscribe({
      next: (list) => {
        this.usuarios.set(list);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(e, 'No se pudieron cargar los usuarios.'));
        this.loading.set(false);
      },
    });
  }

  protected invalid(control: 'nombre' | 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  openModal(): void {
    this.formError.set(null);
    this.form.reset({
      nombre: '',
      email: '',
      password: '',
      rol: 'vendedor',
      sucursal_id: this.auth.user()?.sucursal_id ?? null,
    });
    if (this.sucursales().length === 0) {
      this.catalog.getSucursales().subscribe({
        next: (list) => this.sucursales.set(list),
        error: () => {},
      });
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
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
    this.usuariosService
      .crear({
        nombre: raw.nombre.trim(),
        email: raw.email.trim(),
        password: raw.password,
        rol: raw.rol as 'admin' | 'vendedor',
        sucursal_id: raw.sucursal_id as number,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.load();
        },
        error: (e: HttpErrorResponse) => {
          this.formError.set(httpErrorMessage(e, 'No se pudo crear el usuario.'));
          this.saving.set(false);
        },
      });
  }

  toggle(u: UsuarioCuenta): void {
    if (this.updatingId() !== null) return;
    this.updatingId.set(u.id);
    this.usuariosService.cambiarEstado(u.id, !u.activo).subscribe({
      next: (actualizado) => {
        this.usuarios.update((list) =>
          list.map((x) => (x.id === u.id ? actualizado : x))
        );
        this.updatingId.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(e, 'No se pudo cambiar el estado.'));
        this.updatingId.set(null);
      },
    });
  }
}
