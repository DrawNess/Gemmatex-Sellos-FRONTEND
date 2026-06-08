import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

type ModalSize = 'sm' | 'md' | 'lg';

// Modal reutilizable: overlay con click-para-cerrar y cuadro de diálogo
// accesible. El contenido se proyecta con <ng-content>. La visibilidad la
// controla el padre con @if.
//
// Uso:
//   @if (open()) {
//     <app-modal title="Título" (closed)="open.set(false)">
//       ...contenido...
//     </app-modal>
//   }
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-[#00123c]/25 p-4"
      role="presentation"
      (click)="onBackdrop()"
    >
      <div
        class="w-full overflow-auto rounded-[1.05rem] bg-white p-[clamp(1.25rem,3vw,1.7rem)] text-brand max-h-[92dvh]"
        [class]="sizeClass()"
        style="animation: modal-in 0.15s ease-out"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="$event.stopPropagation()"
      >
        <div class="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              class="m-0 text-[clamp(1.2rem,2.2vw,1.5rem)] font-[850] leading-tight tracking-[-0.035em] text-brand"
            >
              {{ title() }}
            </h2>
            @if (subtitle()) {
              <p class="m-0 mt-1.5 text-[0.86rem] leading-relaxed text-muted">
                {{ subtitle() }}
              </p>
            }
          </div>
          <button
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0 text-[0.78rem] font-extrabold text-faint transition-colors hover:text-brand"
            (click)="closed.emit()"
          >
            cerrar
          </button>
        </div>

        <ng-content />
      </div>
    </div>
  `,
})
export class Modal {
  readonly title = input('');
  readonly subtitle = input<string | null>(null);
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  protected readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'max-w-[28rem]';
      case 'lg':
        return 'max-w-[50rem]';
      default:
        return 'max-w-[34rem]';
    }
  });

  protected onBackdrop(): void {
    if (this.closeOnBackdrop()) this.closed.emit();
  }
}
