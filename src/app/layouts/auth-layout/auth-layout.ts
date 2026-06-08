import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';

type TiltState = {
  active: boolean;
  x: number;
  y: number;
};

const CENTERED_TILT: TiltState = {
  active: false,
  x: 0,
  y: 0,
};

let AUTH_LAYOUT_INTRO_PLAYED = false;

@Component({
  selector: 'app-auth-layout',
  imports: [NgOptimizedImage, RouterLink, RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  protected readonly entered = signal(AUTH_LAYOUT_INTRO_PLAYED);
  protected readonly introSettling = signal(false);
  private readonly logoTilt = signal<TiltState>(CENTERED_TILT);
  private readonly glowTilt = signal<TiltState>(CENTERED_TILT);
  private readonly glowVisible = signal(false);
  private readonly reduceMotion = signal(false);
  private pointerFrameId: number | null = null;
  private glowFrameId: number | null = null;
  private introFrameId: number | null = null;
  private introTimeoutId: number | null = null;
  private glowIdleTimeoutId: number | null = null;
  private pendingTilt: TiltState | null = null;
  private glowTarget: TiltState = CENTERED_TILT;

  constructor() {
    afterNextRender(() => {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduceMotion.set(motionQuery.matches);
      this.setupGlobalPointerTracking();
      this.runIntroOnce();
    });
  }

  protected readonly logoTransform = computed(() => {
    const tilt = this.logoTilt();
    const moveX = tilt.x * 24;
    const moveY = tilt.y * 16;

    return `translate(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px)`;
  });

  protected readonly pointerGlow = computed(() => {
    const tilt = this.glowTilt();
    const visible = this.glowVisible();
    const x = visible ? (tilt.x + 1) * 50 : 22;
    const y = visible ? (tilt.y + 1) * 50 : 38;
    const dragX = this.glowTarget.x - tilt.x;
    const dragY = this.glowTarget.y - tilt.y;
    const force = Math.min(1, Math.hypot(dragX, dragY));
    const tailX = this.clampPercent(x - dragX * 10);
    const tailY = this.clampPercent(y - dragY * 10);
    const visibility = visible ? 1 : 0;
    const coreAlpha = (0.13 + force * 0.04) * visibility;
    const tailAlpha = (0.06 + force * 0.03) * visibility;
    const coreSize = 5.5 + force * 2;
    const tailSize = 7 + force * 3;

    return [
      `radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(0, 18, 60, ${coreAlpha.toFixed(3)}), transparent ${coreSize.toFixed(1)}rem)`,
      `radial-gradient(ellipse at ${tailX.toFixed(1)}% ${tailY.toFixed(1)}%, rgba(0, 18, 60, ${tailAlpha.toFixed(3)}), transparent ${tailSize.toFixed(1)}rem)`,
    ].join(', ');
  });

  protected handlePointerMove(event: PointerEvent): void {
    if (this.reduceMotion()) {
      return;
    }

    this.schedulePointerTilt(event);
  }

  protected handlePointerLeave(): void {
    this.cancelGlowIdleTimeout();
    this.logoTilt.set(CENTERED_TILT);
    this.glowVisible.set(false);
    this.glowTarget = {
      ...this.glowTilt(),
      active: false,
    };
  }

  private readViewportTilt(event: PointerEvent): TiltState {
    const width = event.view?.innerWidth || 1;
    const height = event.view?.innerHeight || 1;
    const x = (event.clientX / width - 0.5) * 2;
    const y = (event.clientY / height - 0.5) * 2;

    return {
      active: true,
      x: this.clamp(x),
      y: this.clamp(y),
    };
  }

  private clamp(value: number): number {
    return Math.max(-1, Math.min(1, value));
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private setupGlobalPointerTracking(): void {
    if (this.reduceMotion()) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      const onPointerMove = (event: PointerEvent): void => {
        this.schedulePointerTilt(event);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('pointermove', onPointerMove);
        this.cancelPointerFrame();
        this.cancelGlowFrame();
        this.cancelIntroFrame();
        this.cancelIntroTimeout();
        this.cancelGlowIdleTimeout();
      });
    });
  }

  private schedulePointerTilt(event: PointerEvent): void {
    const nextTilt = this.readViewportTilt(event);
    this.pendingTilt = nextTilt;
    this.glowTarget = nextTilt;
    this.glowVisible.set(true);
    this.scheduleGlowIdle();
    this.startGlowFollow();

    if (this.pointerFrameId !== null) {
      return;
    }

    this.pointerFrameId = requestAnimationFrame(() => {
      const nextTilt = this.pendingTilt;
      this.pendingTilt = null;
      this.pointerFrameId = null;

      if (nextTilt) {
        this.zone.run(() => this.logoTilt.set(nextTilt));
      }
    });
  }

  private startGlowFollow(): void {
    if (this.glowFrameId !== null) {
      return;
    }

    const animate = (): void => {
      const currentTilt = this.glowTilt();
      const nextTilt: TiltState = {
        active: this.glowTarget.active,
        x: this.lerp(currentTilt.x, this.glowTarget.x, 0.075),
        y: this.lerp(currentTilt.y, this.glowTarget.y, 0.075),
      };
      const isSettled =
        Math.abs(nextTilt.x - this.glowTarget.x) < 0.002 &&
        Math.abs(nextTilt.y - this.glowTarget.y) < 0.002;

      this.zone.run(() => {
        this.glowTilt.set(isSettled ? this.glowTarget : nextTilt);
      });

      if (isSettled) {
        this.glowFrameId = null;
        return;
      }

      this.glowFrameId = requestAnimationFrame(animate);
    };

    this.glowFrameId = requestAnimationFrame(animate);
  }

  private runIntroOnce(): void {
    if (AUTH_LAYOUT_INTRO_PLAYED || this.reduceMotion()) {
      this.entered.set(true);
      AUTH_LAYOUT_INTRO_PLAYED = true;
      return;
    }

    this.introFrameId = requestAnimationFrame(() => {
      this.introFrameId = requestAnimationFrame(() => {
        this.introFrameId = null;
        AUTH_LAYOUT_INTRO_PLAYED = true;
        this.introSettling.set(true);
        this.entered.set(true);
        this.introTimeoutId = window.setTimeout(() => {
          this.introTimeoutId = null;
          this.introSettling.set(false);
        }, 4300);
      });
    });
  }

  private cancelPointerFrame(): void {
    if (this.pointerFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.pointerFrameId);
    this.pointerFrameId = null;
  }

  private cancelGlowFrame(): void {
    if (this.glowFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.glowFrameId);
    this.glowFrameId = null;
  }

  private cancelIntroFrame(): void {
    if (this.introFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.introFrameId);
    this.introFrameId = null;
  }

  private cancelIntroTimeout(): void {
    if (this.introTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.introTimeoutId);
    this.introTimeoutId = null;
  }

  private scheduleGlowIdle(): void {
    this.cancelGlowIdleTimeout();

    this.glowIdleTimeoutId = window.setTimeout(() => {
      this.glowIdleTimeoutId = null;
      this.zone.run(() => {
        this.glowVisible.set(false);
        this.glowTarget = {
          ...this.glowTilt(),
          active: false,
        };
      });
    }, 700);
  }

  private cancelGlowIdleTimeout(): void {
    if (this.glowIdleTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.glowIdleTimeoutId);
    this.glowIdleTimeoutId = null;
  }

  private lerp(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  }
}
