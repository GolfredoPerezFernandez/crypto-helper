import { component$, Slot, type PropsOf, useSignal, $, useOnDocument, useOnWindow, createContextId, useContextProvider, useContext } from '@builder.io/qwik';
import { cn } from '../utils';
import { LuCheck, LuChevronDown } from '@qwikest/icons/lucide';

// Create context for select state
export const SelectContext = createContextId<{
  selectedValue: string;
  onSelect$: (value: string) => void;
}>('select-context');

export type SelectProps = {
  /**
   * The value of the select
   */
  value?: string;
  /**
   * The default value of the select
   */
  defaultValue?: string;
  /**
   * Function called when the value changes
   */
  onValueChange$?: (value: string) => void;
  /**
   * Whether the select is disabled
   */
  disabled?: boolean;
  /**
   * The placeholder text to display when no option is selected
   */
  placeholder?: string;
  /**
   * Custom class for the trigger
   */
  triggerClass?: string;
};

const Root = component$<SelectProps & PropsOf<'div'>>(({ 
  value, 
  defaultValue, 
  onValueChange$, 
  disabled,
  placeholder = 'Select an option',
  triggerClass,
  ...props 
}) => {
  const selectedValue = useSignal(value || defaultValue || '');
  const isOpen = useSignal(false);
  const selectRef = useSignal<HTMLDivElement>();

  const handleValueChange$ = $((val: string) => {
    selectedValue.value = val;
    isOpen.value = false;
    onValueChange$?.(val);
  });

  // Provide context for select options
  useContextProvider(SelectContext, {
    selectedValue: selectedValue.value,
    onSelect$: handleValueChange$
  });

  // Handle click outside
  useOnDocument(
    'click',
    $((event: MouseEvent) => {
      if (!selectRef.value || !isOpen.value) return;
      
      const target = event.target as Node;
      if (selectRef.value.contains(target)) return;
      
      isOpen.value = false;
    })
  );

  // Close on escape key
  useOnWindow(
    'keydown',
    $((event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen.value) {
        isOpen.value = false;
      }
    })
  );

  return (
    <div
      ref={selectRef}
      {...props}
      class={cn('relative', props.class)}
    >
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen.value}
        aria-disabled={disabled}
        disabled={disabled}
        class={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          triggerClass
        )}
        onClick$={() => {
          if (!disabled) {
            isOpen.value = !isOpen.value;
          }
        }}
      >
        <span class="flex-1 truncate">
          {selectedValue.value || placeholder}
        </span>
        <LuChevronDown class="h-4 w-4 opacity-50" />
      </button>
      
      <div
        class={cn(
          'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'w-full top-full mt-1',
          !isOpen.value && 'hidden'
        )}
      >
        <div 
          role="listbox" 
          class="p-1 max-h-60 overflow-auto" 
          aria-label="Options"
        >
          <Slot />
        </div>
      </div>
    </div>
  );
});

export type OptionProps = {
  /**
   * The value of the option
   */
  value: string;
  /**
   * Whether the option is disabled
   */
  disabled?: boolean;
};

const Option = component$<OptionProps & PropsOf<'div'>>(({ 
  value, 
  disabled,
  ...props 
}) => {
  // Get select context
  const { selectedValue, onSelect$ } = useContext(SelectContext);
  
  const isSelected = selectedValue === value;
  
  return (
    <div
      {...props}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-value={value}
      tabIndex={disabled ? -1 : 0}
      class={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
        'outline-none focus:bg-accent focus:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        props.class
      )}
      onClick$={() => {
        if (!disabled) {
          onSelect$(value);
        }
      }}
      onKeyDown$={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect$(value);
        }
      }}
    >
      {isSelected && (
        <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <LuCheck class="h-4 w-4" />
        </span>
      )}
      <Slot />
    </div>
  );
});

export const Select = {
  Root,
  Option
};