import { component$, Slot, type PropsOf, useSignal, $, useOnWindow, useTask$ } from '@builder.io/qwik';
import { cn } from '../utils';
import { LuX } from '@qwikest/icons/lucide';

export type ModalProps = {
  /**
   * Whether the modal is open
   */
  open?: boolean;
  /**
   * Callback called when the modal is closed
   */
  onClose?: () => void;
} & PropsOf<'div'>;

const Root = component$<ModalProps>(({ open = false, onClose, ...props }) => {
  const isOpen = useSignal(open);

  useTask$(({ track }) => {
    const openState = track(() => open);
    isOpen.value = openState;
  });

  const handleClose = $(() => {
    isOpen.value = false;
    onClose?.();
  });

  // Close on escape key
  useOnWindow(
    'keydown',
    $((event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen.value) {
        handleClose();
      }
    })
  );

  return (
    <div
      {...props}
      aria-hidden={!isOpen.value}
      class={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        isOpen.value ? 'pointer-events-auto' : 'pointer-events-none opacity-0',
        'transition-opacity duration-300 ease-in-out',
        props.class
      )}
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick$={handleClose}
        data-test-id="modal-overlay"
      />
      <Slot />
    </div>
  );
});

const Content = component$<PropsOf<'div'>>(({ ...props }) => {
  return (
    <div
      {...props}
      class={cn(
        'relative z-50 max-h-[90vh] max-w-lg overflow-auto rounded-lg border bg-background p-6 shadow-lg',
        'animate-in fade-in-90 slide-in-from-bottom-10 sm:zoom-in-90',
        'duration-200',
        props.class
      )}
      onClick$={(e) => e.stopPropagation()}
    >
      <Slot />
    </div>
  );
});

const Header = component$<PropsOf<'div'>>(({ ...props }) => {
  return (
    <div
      {...props}
      class={cn('flex flex-col space-y-1.5 text-center sm:text-left', props.class)}
    >
      <Slot />
    </div>
  );
});

const Footer = component$<PropsOf<'div'>>(({ ...props }) => {
  return (
    <div
      {...props}
      class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', props.class)}
    >
      <Slot />
    </div>
  );
});

const Title = component$<PropsOf<'h2'>>(({ ...props }) => {
  return (
    <h2
      {...props}
      class={cn('text-lg font-semibold leading-none tracking-tight', props.class)}
    >
      <Slot />
    </h2>
  );
});

const Description = component$<PropsOf<'p'>>(({ ...props }) => {
  return (
    <p
      {...props}
      class={cn('text-sm text-muted-foreground', props.class)}
    >
      <Slot />
    </p>
  );
});

const Close = component$<PropsOf<'button'>>(({ ...props }) => {
  return (
    <button
      {...props}
      type="button"
      class={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity',
        'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:pointer-events-none',
        props.class
      )}
      aria-label="Close"
    >
      <LuX class="h-4 w-4" />
      <span class="sr-only">Close</span>
    </button>
  );
});

// Trigger component to open the modal
const Trigger = component$<PropsOf<'button'> & { openModal$: () => void }>(
  ({ openModal$, ...props }) => {
    return (
      <button 
        {...props}
        type="button"
        onClick$={openModal$}
        class={cn(props.class)}
      >
        <Slot />
      </button>
    );
  }
);

export const Modal = {
  Root,
  Content,
  Header,
  Footer,
  Title,
  Description,
  Close,
  Trigger
};