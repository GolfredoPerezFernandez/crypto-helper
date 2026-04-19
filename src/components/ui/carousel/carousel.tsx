import { component$, Slot, useStyles$, useSignal, useTask$, $, useVisibleTask$, useStore } from '@builder.io/qwik';
import { Carousel as HeadlessCarousel } from '@qwik-ui/headless';
import { cn } from '../utils';

// Optional: Add carousel-specific CSS
const carouselStyles = `
  :root { --qui-ease: cubic-bezier(.65,.05,.36,1); }
  .carousel-root { position: relative; width: 100%; margin: 0 auto; --shadow: 0 4px 24px -6px rgba(0,0,0,.35); }
  .carousel-root[data-orientation="vertical"] { height: 100%; }
  .carousel-scroller { overflow: hidden; mask-image: linear-gradient(to right, rgba(0,0,0,.1) 0%, #000 8%, #000 92%, rgba(0,0,0,.1) 100%); }
  .carousel-scroller[data-orientation="vertical"] { mask-image: linear-gradient(to bottom, rgba(0,0,0,.05) 0%, #000 10%, #000 90%, rgba(0,0,0,.05) 100%); }
  .carousel-slide { display:flex; align-items:center; justify-content:center; background:linear-gradient(145deg,hsl(var(--muted)) 0%, hsl(var(--muted) / .7) 100%); border-radius: var(--radius, 0.75rem); color:hsl(var(--muted-foreground)); height:160px; font-weight:500; position:relative; isolation:isolate; box-shadow:var(--shadow); transform-origin:center center; transition:transform .7s var(--qui-ease), opacity .6s var(--qui-ease), filter .7s var(--qui-ease); }
  .carousel-slide::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.15), transparent 70%); opacity:0; transition:opacity .6s var(--qui-ease); pointer-events:none; }
  .carousel-slide[data-active] { transform:scale(1) translateZ(0); filter:saturate(1.1); }
  .carousel-slide[data-active]::after { opacity:1; }
  .carousel-slide:not([data-active]) { transform:scale(.9); opacity:.55; filter:saturate(.65) contrast(.9); }
  .carousel-animation { transition: .55s transform var(--qui-ease); will-change: transform; }
  .carousel-pagination { display:flex; gap:.5rem; justify-content:center; margin-top:1rem; }
  .carousel-pagination button { width: .85rem; height: .85rem; border-radius:9999px; background:linear-gradient(145deg,hsl(var(--muted)),hsl(var(--muted) / .7)); border:none; padding:0; cursor:pointer; position:relative; overflow:hidden; transition:background .4s var(--qui-ease), transform .4s var(--qui-ease); }
  .carousel-pagination button::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,hsl(var(--primary)) 0%, hsl(var(--primary) / .7) 100%); opacity:0; transition:opacity .4s var(--qui-ease); }
  .carousel-pagination button[data-active] { transform:scale(1.15); }
  .carousel-pagination button[data-active]::after { opacity:1; }
  .carousel-progress-wrapper { position:absolute; left:0; bottom:-6px; width:100%; height:4px; background:linear-gradient(to right, hsl(var(--muted) / .15), hsl(var(--muted) / .25)); border-radius:9999px; overflow:hidden; }
  @keyframes carousel-progress-fill { from { width:0% } to { width:100% } }
  .carousel-progress-bar { height:100%; width:0%; background:linear-gradient(90deg,hsl(var(--primary)) 0%, hsl(var(--primary) / .85) 60%, hsl(var(--primary) / .65) 100%); animation: carousel-progress-fill linear forwards; }
  .carousel-nav-btn { display:inline-flex; align-items:center; justify-content:center; width:2.35rem; height:2.35rem; border-radius:9999px; backdrop-filter:blur(6px); background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.04)); border:1px solid rgba(255,255,255,.1); color: hsl(var(--foreground)); position:absolute; top:50%; transform:translateY(-50%); z-index:10; box-shadow:0 4px 16px -4px rgba(0,0,0,.35); cursor:pointer; transition: background .35s var(--qui-ease), transform .35s var(--qui-ease); }
  .carousel-nav-btn:hover { background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.08)); transform:translateY(-50%) scale(1.07); }
  .carousel-nav-btn[data-disabled] { opacity:.4; pointer-events:none; }
  .carousel-nav-prev { left:.35rem; }
  .carousel-nav-next { right:.35rem; }
`;

export const Carousel = {
  Root: component$<{
    class?: string;
    gap?: number;
    slidesPerView?: number;
    draggable?: boolean;
    align?: 'start' | 'center' | 'end';
    rewind?: boolean;
    startIndex?: number;
    autoPlayIntervalMs?: number;
    move?: number;
    orientation?: 'horizontal' | 'vertical';
    maxSlideHeight?: number;
    mousewheel?: boolean;
    autoplay?: boolean;
    showProgress?: boolean;
    pauseOnHover?: boolean;
  }>(({
    class: className,
    gap = 30,
    slidesPerView = 1,
    draggable = true,
    align = 'start',
    rewind = false,
    startIndex = 0,
    autoPlayIntervalMs = 5000,
    move = 1,
    orientation = 'horizontal',
    maxSlideHeight,
    mousewheel = false,
    autoplay: autoplayDefault = true,
    showProgress = true,
    pauseOnHover = true,
  }) => {
    useStyles$(carouselStyles);
  const selectedIndex = useSignal(startIndex);
  const progressKey = useSignal(0);
  const internalAutoplay = useSignal(autoplayDefault);
  const runtime = useStore<{ interval: ReturnType<typeof setInterval> | undefined }>({ interval: undefined });
  const rootEl = useSignal<HTMLElement>();
  const slidesCount = useSignal<number>(0);

    // initialize autoplay only on client
    useTask$(({ track }) => {
      track(() => startIndex);
      internalAutoplay.value = autoplayDefault;
    });

    // Reinicia progreso cuando cambia el índice seleccionado
    useTask$(({ track }) => {
      track(() => selectedIndex.value);
      progressKey.value++;
    });

    // Clamp selectedIndex if slides count shrinks
    useVisibleTask$(({ track }) => {
      track(() => slidesCount.value);
      if (slidesCount.value > 0 && selectedIndex.value >= slidesCount.value) {
        selectedIndex.value = 0;
      }
    });

    // Detect slides count on client & set up autoplay avoiding overflow
    useVisibleTask$(({ track, cleanup }) => {
      track(() => internalAutoplay.value);
      // update slides count whenever root present
      if (rootEl.value) {
        slidesCount.value = rootEl.value.querySelectorAll('.carousel-slide').length;
      }
      if (!internalAutoplay.value || slidesCount.value === 0) return;
      if (runtime.interval) clearInterval(runtime.interval as any);
      runtime.interval = setInterval(() => {
        if (slidesCount.value === 0) return;
        selectedIndex.value = (selectedIndex.value + move) % slidesCount.value;
      }, autoPlayIntervalMs) as any;
      cleanup(() => {
        if (runtime.interval) clearInterval(runtime.interval as any);
        runtime.interval = undefined;
      });
    });

    // Render
    return (
      <HeadlessCarousel.Root
        ref={rootEl}
        class={cn('carousel-root group relative', className)}
        gap={gap}
        slidesPerView={slidesPerView}
        draggable={draggable}
        align={align}
        rewind={rewind}
  bind:selectedIndex={selectedIndex}
        move={move}
        orientation={orientation}
        maxSlideHeight={maxSlideHeight}
        mousewheel={mousewheel}
        data-orientation={orientation}
        onMouseEnter$={pauseOnHover ? $( () => { internalAutoplay.value = false; if (runtime.interval) { clearInterval(runtime.interval as any); runtime.interval = undefined; } } ) : undefined}
        onMouseLeave$={pauseOnHover ? $( () => { internalAutoplay.value = true; } ) : undefined}
      >
        {/* We still render Slot; headless carousel internally assigns indices in order of HeadlessCarousel.Slide instances */}
        <Slot />
        {showProgress && (
          <div class="carousel-progress-wrapper" aria-hidden="true">
            <div key={progressKey.value} class="carousel-progress-bar" style={{ animationDuration: `${autoPlayIntervalMs}ms` }} />
          </div>
        )}
      </HeadlessCarousel.Root>
    );
  }),

  Scroller: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessCarousel.Scroller class={cn('carousel-scroller carousel-animation', className)}>
        <Slot />
      </HeadlessCarousel.Scroller>
    );
  }),

  Slide: component$<{ class?: string; key?: string }>(({ class: className, key }) => {
    return (
      <HeadlessCarousel.Slide key={key} class={cn('carousel-slide', className)}>
        <Slot />
      </HeadlessCarousel.Slide>
    );
  }),

  Previous: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessCarousel.Previous class={cn('carousel-nav-btn carousel-nav-prev', className)}>
        <Slot />
      </HeadlessCarousel.Previous>
    );
  }),

  Next: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessCarousel.Next class={cn('carousel-nav-btn carousel-nav-next', className)}>
        <Slot />
      </HeadlessCarousel.Next>
    );
  }),

  Pagination: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessCarousel.Pagination class={cn('carousel-pagination', className)}>
        <Slot />
      </HeadlessCarousel.Pagination>
    );
  }),

  Bullet: component$<{ class?: string }>(({ class: className }) => {
    return <HeadlessCarousel.Bullet class={cn(className)} />;
  }),

  Title: component$<{ class?: string }>(({ class: className }) => {
    return (
      <h2 class={cn('text-xl font-bold mb-4', className)}>
        <HeadlessCarousel.Title>
          <Slot />
        </HeadlessCarousel.Title>
      </h2>
    );
  }),
};