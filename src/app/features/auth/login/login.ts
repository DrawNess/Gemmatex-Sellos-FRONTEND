import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative z-10 w-[min(100%,23.5rem)] max-w-[23.5rem] translate-x-[100px] rounded-[1.05rem] border border-white bg-white p-[clamp(1.35rem,3.7vw,1.85rem)] text-[#004ab1] max-[860px]:mx-auto max-[860px]:translate-x-0"
      aria-labelledby="login-title"
    >
      <header class="mb-6">
        <h2
          id="login-title"
          class="m-0 text-[clamp(1.42rem,2.5vw,1.68rem)] font-[850] leading-none tracking-[-0.045em] text-[#004ab1]"
        >
          Iniciar sesión
        </h2>
        <p class="m-0 mt-2 text-[0.84rem] leading-relaxed text-[#233451]">
          Ingresa tu correo y contraseña.
        </p>
      </header>

      <form class="grid gap-3.5" [formGroup]="form" (ngSubmit)="submit()">
        <label class="grid gap-1.5 text-[0.82rem] font-semibold text-[#233451]">
          <span>Correo</span>
          <input
            class="w-full rounded-[0.74rem] border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none transition-colors placeholder:text-[#8da0bf] hover:border-[#c8d4e6] focus:border-[#004ab1]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004ab1] {{ form.controls.email.touched && form.controls.email.invalid ? 'border-red-700' : '' }}"
            type="email"
            formControlName="email"
            autocomplete="username"
            placeholder="correo@empresa.com"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="text-[0.72rem] font-semibold leading-relaxed text-red-700">
              Ingresa un correo válido.
            </span>
          }
        </label>

        <label class="grid gap-1.5 text-[0.82rem] font-semibold text-[#233451]">
          <span>Contraseña</span>
          <span class="relative block">
            <input
              class="w-full rounded-[0.74rem] border border-[#d9e2ef] bg-white py-2.5 pl-3.5 pr-14 text-[0.86rem] font-medium text-[#004ab1] outline-none transition-colors placeholder:text-[#8da0bf] hover:border-[#c8d4e6] focus:border-[#004ab1]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004ab1] {{ form.controls.password.touched && form.controls.password.invalid ? 'border-red-700' : '' }}"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent px-1.5 py-1 text-[0.66rem] font-extrabold lowercase text-[#8da0bf] hover:text-[#004ab1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004ab1]"
              type="button"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              (click)="togglePasswordVisibility()"
            >
              {{ showPassword() ? 'ocultar' : 'ver' }}
            </button>
          </span>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <span class="text-[0.72rem] font-semibold leading-relaxed text-red-700">
              Ingresa tu contraseña.
            </span>
          }
        </label>

        @if (error()) {
          <p
            class="m-0 rounded-[0.7rem] border border-red-700/15 bg-red-700/5 px-3.5 py-3 text-[0.82rem] leading-relaxed text-red-700"
          >
            {{ error() }}
          </p>
        }

        <button
          class="mt-px w-full cursor-pointer rounded-[0.6rem] border border-[#004ab1] bg-[#004ab1] px-4 py-2.5 text-[0.84rem] font-extrabold text-white transition-colors hover:bg-[#003f98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004ab1] disabled:cursor-not-allowed disabled:opacity-55"
          type="submit"
          [disabled]="loading()"
        >
          {{ loading() ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const ret = this.route.snapshot.queryParamMap.get('return') || '/';
        void this.router.navigateByUrl(ret.startsWith('/') ? ret : '/');
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(e, 'No se pudo iniciar sesión.'));
        this.loading.set(false);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}
