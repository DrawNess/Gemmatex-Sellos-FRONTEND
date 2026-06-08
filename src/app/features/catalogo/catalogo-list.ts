import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Categoria, Producto } from '../../shared/models/producto.model';
import { CatalogService } from '../../shared/services/catalog.service';
import { Modal } from '../../shared/ui/modal/modal';
import { httpErrorMessage } from '../../shared/utils/api-error.util';
import { formatBs } from '../../shared/utils/format.util';
import { ImportResult, ProductosService } from '../ventas/productos.service';

@Component({
  selector: 'app-catalogo-list',
  imports: [ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto w-full max-w-none">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="m-0 text-[clamp(1.6rem,3vw,2.1rem)] font-[850] tracking-[-0.04em] text-[#004ab1]">Catálogo</h1>
          <p class="m-0 mt-2 text-[0.95rem] text-[#57606a]">Productos activos. Filtra por categoría o busca por nombre/SKU.</p>
        </div>
        @if (auth.isAdmin()) {
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.86rem] font-extrabold text-[#004ab1] transition hover:bg-[#f6f9fd]"
              (click)="descargarPlantilla()"
            >
              Descargar plantilla
            </button>
            <button
              type="button"
              class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-5 py-2.5 text-[0.88rem] font-extrabold text-white transition hover:bg-[#003f98]"
              (click)="openImport()"
            >
              Importar Excel
            </button>
          </div>
        }
      </header>

      <article class="rounded-[1.05rem] border border-[#e1e7f0] bg-white p-[clamp(1.25rem,3vw,1.7rem)]">
        <form class="grid gap-3 sm:grid-cols-[1fr_12rem_12rem]" [formGroup]="form">
          <input
            class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.86rem] font-medium text-[#004ab1] outline-none placeholder:text-[#8da0bf] focus:border-[#004ab1]/40"
            formControlName="q"
            type="search"
            placeholder="Buscar por nombre o SKU…"
          />
          <select class="rounded-[0.74rem] border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[0.86rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40" formControlName="categoria">
            <option [ngValue]="null">Todas las categorías</option>
            @for (cat of categorias(); track cat.id) {
              <option [ngValue]="cat.id">{{ cat.nombre }}</option>
            }
          </select>
          <select class="rounded-[0.74rem] border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[0.86rem] font-semibold text-[#004ab1] outline-none focus:border-[#004ab1]/40 disabled:opacity-55" formControlName="subcategoria" [disabled]="subcategoriasOpts().length === 0">
            <option [ngValue]="null">Todas las subcategorías</option>
            @for (sub of subcategoriasOpts(); track sub.id) {
              <option [ngValue]="sub.id">{{ sub.nombre }}</option>
            }
          </select>
        </form>

        @if (error()) {
          <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ error() }}</p>
        }

        <div class="mt-5">
          @if (loading()) {
            <p class="m-0 text-center text-[#57606a]">Cargando productos…</p>
          } @else if (productos().length === 0) {
            <p class="m-0 text-center text-[#57606a]">No hay productos para estos filtros.</p>
          } @else {
            <p class="m-0 mb-3 text-sm text-[#57606a]">{{ productos().length }} producto(s)</p>
            <div class="overflow-x-auto rounded-[0.9rem]">
              <table class="w-full min-w-[48rem] border-collapse text-left text-[0.86rem]">
                <thead class="bg-[#f8fafc] text-[0.7rem] uppercase tracking-[0.08em] text-[#8a99ad]">
                  <tr>
                    <th class="px-3.5 py-2.5 font-bold">SKU</th>
                    <th class="px-3.5 py-2.5 font-bold">Producto</th>
                    <th class="px-3.5 py-2.5 font-bold">Categoría</th>
                    <th class="px-3.5 py-2.5 font-bold">Precio</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#d8dee4]">
                  @for (p of productos(); track p.id) {
                    <tr class="align-middle">
                      <td class="px-3.5 py-2.5 font-mono text-xs text-[#57606a]">{{ p.sku }}</td>
                      <td class="px-3.5 py-2.5 font-bold text-[#004ab1]">{{ p.nombre }}</td>
                      <td class="px-3.5 py-2.5 text-[#57606a]">
                        {{ p.subcategoria?.categoria?.nombre || '—' }}
                        <span class="text-[#8a99ad]"> · {{ p.subcategoria?.nombre || '—' }}</span>
                      </td>
                      <td class="px-3.5 py-2.5 font-bold text-[#24292f]">{{ money(p.precio) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </article>
    </section>

    @if (importOpen()) {
      <app-modal
        title="Importar catálogo"
        subtitle="Actualiza productos desde un archivo Excel"
        (closed)="closeImport()"
      >
        <p class="m-0 text-[0.86rem] leading-relaxed text-[#57606a]">
          El Excel debe tener las columnas:
          <strong class="text-[#004ab1]">SKU, nombre, precio, categoria, subcategoria</strong>.
          Los SKU existentes se actualizan, los nuevos se crean y los que no aparezcan quedan inactivos.
        </p>

        <label class="mt-4 grid gap-1.5">
          <span class="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#8a99ad]">Archivo (.xlsx)</span>
          <input
            class="rounded-[0.74rem] border border-[#d9e2ef] px-3.5 py-2.5 text-[0.84rem] text-[#24292f] file:mr-3 file:rounded-md file:border-0 file:bg-[#004ab1] file:px-3 file:py-1.5 file:font-bold file:text-white"
            type="file"
            accept=".xlsx,.xls"
            (change)="onFileSelected($event)"
          />
        </label>

        @if (importError()) {
          <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{{ importError() }}</p>
        }

        @if (importResult(); as r) {
          <div class="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p class="m-0 font-bold">{{ r.mensaje }}</p>
            <p class="m-0 mt-1">Filas: {{ r.total_filas }} · Creados: {{ r.creados }} · Actualizados: {{ r.actualizados }} · Desactivados: {{ r.desactivados }}</p>
          </div>
        }

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-[0.62rem] border border-[#d9e2ef] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#004ab1]"
            [disabled]="importing()"
            (click)="closeImport()"
          >
            Cerrar
          </button>
          <button
            type="button"
            class="rounded-[0.62rem] border border-[#004ab1] bg-[#004ab1] px-4 py-2.5 text-[0.82rem] font-extrabold text-white disabled:opacity-55"
            [disabled]="!selectedFile() || importing()"
            (click)="importar()"
          >
            {{ importing() ? 'Importando…' : 'Importar' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class CatalogoListPage {
  readonly auth = inject(AuthService);
  private readonly productosService = inject(ProductosService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    q: [''],
    categoria: [null as number | null],
    subcategoria: [null as number | null],
  });

  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly selectedCategoriaId = signal<number | null>(null);
  readonly subcategoriasOpts = computed(
    () =>
      this.categorias().find((c) => c.id === this.selectedCategoriaId())
        ?.subcategorias ?? []
  );

  // Import
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly importResult = signal<ImportResult | null>(null);
  readonly selectedFile = signal<File | null>(null);

  constructor() {
    this.catalog.getCategorias().subscribe({
      next: (list) => this.categorias.set(list),
      error: () => {
        /* sin filtros de categoría */
      },
    });

    // Al cambiar la categoría, reinicia la subcategoría.
    this.form.controls.categoria.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        this.selectedCategoriaId.set(id ?? null);
        this.form.controls.subcategoria.setValue(null);
      });

    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        debounceTime(300),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((v) =>
          this.productosService
            .listar({
              q: v.q ?? '',
              categoria: v.categoria ?? null,
              subcategoria: v.subcategoria ?? null,
            })
            .pipe(
              catchError((e: HttpErrorResponse) => {
                this.error.set(
                  httpErrorMessage(e, 'No se pudieron cargar los productos.')
                );
                return of<Producto[]>([]);
              })
            )
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => {
        this.productos.set(list);
        this.loading.set(false);
      });
  }

  protected money(value: string | number): string {
    return formatBs(value);
  }

  descargarPlantilla(): void {
    this.productosService.descargarPlantilla().subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-catalogo.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  openImport(): void {
    this.importError.set(null);
    this.importResult.set(null);
    this.selectedFile.set(null);
    this.importOpen.set(true);
  }

  closeImport(): void {
    if (this.importing()) return;
    this.importOpen.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.importResult.set(null);
    this.importError.set(null);
  }

  importar(): void {
    const file = this.selectedFile();
    if (!file || this.importing()) return;

    this.importing.set(true);
    this.importError.set(null);
    this.importResult.set(null);

    this.productosService.importar(file).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        this.reload();
      },
      error: (e: HttpErrorResponse) => {
        this.importError.set(httpErrorMessage(e, 'No se pudo importar el archivo.'));
        this.importing.set(false);
      },
    });
  }

  // Recarga lista y categorías (la importación puede crear categorías nuevas).
  private reload(): void {
    this.catalog.getCategorias().subscribe((list) => this.categorias.set(list));
    this.form.controls.q.setValue(this.form.controls.q.value ?? '');
    // Forzar refresco aunque el valor no cambie:
    this.productosService
      .listar({
        q: this.form.controls.q.value ?? '',
        categoria: this.form.controls.categoria.value ?? null,
        subcategoria: this.form.controls.subcategoria.value ?? null,
      })
      .subscribe((list) => this.productos.set(list));
  }
}
