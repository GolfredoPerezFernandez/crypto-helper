import { component$, Slot, type PropsOf, useSignal, $, useOnDocument, useOnWindow, createContextId, useContextProvider, useContext } from '@builder.io/qwik';
import { cn } from '../utils';
import { LuCheck, LuChevronRight, LuCircle } from '@qwikest/icons/lucide';

// Create context for dropdown state
export const DropdownContext = createContextId<{
  isOpen: { value: boolean }; // Pass the signal itself
  toggle$: () => void;
  close$: () => void;
}>('dropdown-context');

const Root = component$<PropsOf<'div'>>((props) => {
  const isOpen = useSignal(false);
  const dropdownRef = useSignal<HTMLDivElement>();

  const close$ = $(() => {
    isOpen.value = false;
  });

  const toggle$ = $(() => {
    isOpen.value = !isOpen.value;
  });

  useContextProvider(DropdownContext, {
    isOpen: isOpen, // Pass the signal
    toggle$,
    close$
  });

  // Handle click outside
  useOnDocument(
    'click',
    $((event: MouseEvent) => {
      if (!dropdownRef.value || !isOpen.value) return;
      const target = event.target as Node;
      if (dropdownRef.value.contains(target)) return;
      close$();
    })
  );

  // Close on escape key
  useOnWindow(
    'keydown',
    $((event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen.value) {
        close$();
      }
    })
  );

  return (
    <div ref={dropdownRef} {...props} class={cn('relative', props.class)}>
      <Slot /> {/* Remove isOpen prop from Slot */}
    </div>
  );
});

const Trigger = component$<PropsOf<'button'>>((props) => {
  const { isOpen, toggle$ } = useContext(DropdownContext); // Consume context
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen.value}
      {...props}
      onClick$={toggle$} // Use toggle function from context
      class={cn(props.class)}
    >
      <Slot />
    </button>
  );
});

const Content = component$<PropsOf<'div'> & { align?: 'start' | 'center' | 'end'; sideOffset?: number }>((props) => {
  const { align = 'end', sideOffset = 4, ...rest } = props;
  const { isOpen } = useContext(DropdownContext); // Consume context

  return (
    <div
      {...rest}
      role="menu"
      aria-hidden={!isOpen.value} // Use isOpen.value
      class={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
        !isOpen.value && 'hidden', // Use isOpen.value
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

const Item = component$<PropsOf<'div'> & { disabled?: boolean; onSelect$?: () => void }>((props) => {
  const { disabled, onSelect$, ...rest } = props;
  const { close$ } = useContext(DropdownContext);

  const handleSelect$ = $(() => {
    if (!disabled) {
      onSelect$?.();
      close$();
    }
  });

  return (
    <div
      {...rest}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        props.class
      )}
      onClick$={handleSelect$}
      onKeyDown$={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect$();
        }
      }}
    >
      <Slot />
    </div>
  );
});

const CheckboxItem = component$<PropsOf<'div'> & { checked?: boolean; disabled?: boolean; onCheckedChange$?: (checked: boolean) => void }>((props) => {
  const { checked = false, disabled, onCheckedChange$, ...rest } = props;
  // const { close$ } = useContext(DropdownContext); // Keep open on check

  const handleSelect$ = $(() => {
    if (!disabled) {
      onCheckedChange$?.(!checked);
      // Do not close$() here to keep the menu open
    }
  });

  return (
    <div
      {...rest}
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        props.class
      )}
      onClick$={handleSelect$}
      onKeyDown$={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect$();
        }
      }}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <LuCheck class="h-4 w-4" />}
      </span>
      <Slot />
    </div>
  );
});

const RadioItem = component$<PropsOf<'div'> & { value: string; selectedValue?: string; disabled?: boolean; onSelect$?: (value: string) => void }>((props) => {
  const { value, selectedValue, disabled, onSelect$, ...rest } = props;
  const { close$ } = useContext(DropdownContext);
  const isSelected = selectedValue === value;

  const handleSelect$ = $(() => {
    if (!disabled) {
      onSelect$?.(value);
      close$();
    }
  });

  return (
    <div
      {...rest}
      role="menuitemradio"
      aria-checked={isSelected}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      class={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        props.class
      )}
      onClick$={handleSelect$}
      onKeyDown$={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect$();
        }
      }}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <LuCircle class="h-2 w-2 fill-current" />}
      </span>
      <Slot />
    </div>
  );
});

const Label = component$<PropsOf<'div'>>((props) => {
  return (
    <div
      {...props}
      class={cn('px-2 py-1.5 text-sm font-semibold text-muted-foreground', props.class)}
    >
      <Slot />
    </div>
  );
});

const Separator = component$<PropsOf<'div'>>((props) => {
  return (
    <div
      {...props}
      role="separator"
      aria-orientation="horizontal"
      class={cn('-mx-1 my-1 h-px bg-muted', props.class)}
    />
  );
});

const Sub = component$<PropsOf<'div'>>((props) => {
  // Submenu logic requires more complex state management (nested context, positioning)
  // Keeping it simple for now
  return (
    <div {...props} class={cn('relative', props.class)}>
      <Slot />
    </div>
  );
});

const SubTrigger = component$<PropsOf<'div'>>((props) => {
  return (
    <div
      {...props}
      role="menuitem"
      aria-haspopup="menu"
      class={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'focus:bg-accent data-[state=open]:bg-accent',
        props.class
      )}
    >
      <Slot />
      <LuChevronRight class="ml-auto h-4 w-4" />
    </div>
  );
});

const SubContent = component$<PropsOf<'div'>>((props) => {
  // Submenu positioning needs calculation based on trigger position
  return (
    <div
      {...props}
      role="menu"
      class={cn(
        'absolute left-full top-0 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        // Add positioning logic here
        props.class
      )}
    >
      <Slot />
    </div>
  );
});


export const Dropdown = {
  Root,
  Trigger,
  Content,
  Item,
  CheckboxItem,
  RadioItem,
  Label,
  Separator,
  Sub,
  SubTrigger,
  SubContent
};