import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
  ready?: boolean;
}

@Component({
  selector: 'app-app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-dvh bg-surface">
      <!-- Topbar -->
      <header
        class="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-white px-4 sm:px-6 relative"
      >
        <button
          type="button"
          class="grid size-10 place-items-center rounded-lg border border-line text-brand transition hover:bg-surface"
          aria-label="Menú"
          (click)="toggleMenu()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <a
          routerLink="/"
          class="absolute left-1/2 flex -translate-x-1/2 items-center no-underline"
          aria-label="Gemmatex"
        >
          <img
            src="https://peru-crane-813567.hostingersite.com/Logos/Logo%20gemmatex%20azul.png"
            alt="Gemmatex"
            class="h-8 w-auto"
          />
        </a>

        <div class="ml-auto flex items-center gap-3">
          <span class="hidden truncate text-[0.84rem] font-semibold text-brand sm:block">{{ auth.user()?.nombre }}</span>
          <a
            routerLink="/ventas"
            class="rounded-[0.62rem] border border-brand bg-brand px-4 py-2 text-[0.82rem] font-extrabold text-white no-underline transition hover:bg-brand-dark"
          >
            + Nueva venta
          </a>
        </div>
      </header>

      <div class="flex w-full">
        <!-- Sidebar fijo que empuja el contenido -->
        <aside
          class="sticky top-16 h-[calc(100dvh-4rem)] shrink-0 overflow-hidden border-line-soft bg-white transition-[width] duration-200"
          [class.w-64]="menuOpen()"
          [class.w-0]="!menuOpen()"
          [class.border-r]="menuOpen()"
        >
          <nav class="flex h-full w-64 flex-col overflow-y-auto p-3">
            @for (item of visibleNav(); track item.path) {
              @if (item.ready) {
                <a
                  class="rounded-lg px-4 py-3 text-[0.92rem] font-semibold text-ink no-underline transition hover:bg-brand-soft hover:text-brand"
                  [routerLink]="item.path"
                  routerLinkActive="bg-brand-soft text-brand"
                  [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                >
                  {{ item.label }}
                </a>
              } @else {
                <span
                  class="flex items-center justify-between rounded-lg px-4 py-3 text-[0.92rem] font-semibold text-faint"
                  title="Próximamente"
                >
                  {{ item.label }}
                  <span class="rounded-full bg-surface px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-faint">pronto</span>
                </span>
              }
            }

            <button
              type="button"
              class="mt-auto cursor-pointer rounded-lg border-0 bg-red-50 px-4 py-3 text-left text-[0.9rem] font-bold text-red-700 transition hover:bg-red-100"
              (click)="logout()"
            >
              Cerrar sesión
            </button>
          </nav>
        </aside>

        <!-- Contenido -->
        <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(true);

  private readonly nav: NavItem[] = [
    { label: 'Inicio', path: '/dashboard', ready: true },
    { label: 'Clientes', path: '/clientes', ready: true },
    { label: 'Ventas', path: '/ventas', ready: true },
    { label: 'Catálogo', path: '/productos', ready: true },
    { label: 'Usuarios', path: '/usuarios', adminOnly: true, ready: true },
  ];

  readonly visibleNav = computed(() =>
    this.nav.filter((item) => !item.adminOnly || this.auth.isAdmin())
  );

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
