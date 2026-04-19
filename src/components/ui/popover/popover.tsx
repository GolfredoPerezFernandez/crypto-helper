import { component$, Slot, type PropsOf, useSignal, $, useOnWindow, useOnDocument } from '@builder.io/qwik';
import { cn } from '../utils';

const Root = component$<PropsOf<'div'>>((props) => {
  return (
    <div {...props} class={cn('relative', props.class)}>
      <Slot />
    </div>
  );
});

const Trigger = component$<PropsOf<'button'> & { 
  openPopover$: () => void;
}>((props) => {
  const { openPopover$, ...rest } = props;
  
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      {...rest}
      onClick$={openPopover$}
      class={cn(props.class)}
    >
      <Slot />
    </button>
  );
});

const Content = component$<PropsOf<'div'> & {
  open?: boolean;
  onClose?: () => void;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}>((props) => {
  const { open = false, onClose, align = 'center', sideOffset = 4, ...rest } = props;
  const contentRef = useSignal<HTMLDivElement>();
  const isOpen = useSignal(open);

  // Handle click outside
  useOnDocument(
    'click',
    $((event: MouseEvent) => {
      if (!contentRef.value || !isOpen.value) return;
      
      const target = event.target as Node;
      if (contentRef.value.contains(target)) return;
      
      isOpen.value = false;
      onClose?.();
    })
  );

  // Close on escape key
  useOnWindow(
    'keydown',
    $((event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen.value) {
        isOpen.value = false;
        onClose?.();
      }
    })
  );

  return (
    <div
      ref={contentRef}
      {...rest}
      aria-hidden={!isOpen.value}
      class={cn(
        'absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
        !isOpen.value && 'hidden',
        props.class
      )}
      style={{
        marginTop: `${sideOffset}px`
      }}
    >
      <Slot />
    </div>
  );
});

export const Popover = {
  Root,
  Trigger,
  Content
};