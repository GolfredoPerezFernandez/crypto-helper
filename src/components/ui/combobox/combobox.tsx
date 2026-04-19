import { component$, Slot, type PropsOf, useSignal, $, useOnDocument, useOnWindow, createContextId, useContextProvider, useContext } from '@builder.io/qwik';
import { cn } from '../utils';
import { LuCheck, LuChevronDown, LuSearch } from '@qwikest/icons/lucide';

// Create context for combobox state
export const ComboboxContext = createContextId<{
  selectedValue: string;
  onSelect$: (value: string) => void;
  searchQuery: string;
  isOpen: boolean;
}>('combobox-context');

export type ComboboxProps = {
  /**
   * The value of the combobox
   */
  value?: string;
  /**
   * The default value of the combobox
   */
  defaultValue?: string;
  /**
   * Function called when the value changes
   */
  onValueChange$?: (value: string) => void;
  /**
   * Whether the combobox is disabled
   */
  disabled?: boolean;
  /**
   * The placeholder text to display when no option is selected
   */
  placeholder?: string;
};

const Root = component$<ComboboxProps & PropsOf<'div'>>(({ 
  value, 
  defaultValue, 
  onValueChange$, 
  disabled,
  placeholder = 'Search...',
  ...props 
}) => {
  const selectedValue = useSignal(value || defaultValue || '');
  const searchQuery = useSignal('');
  const isOpen = useSignal(false);
  const comboboxRef = useSignal<HTMLDivElement>();

  const handleValueChange$ = $((val: string) => {
    selectedValue.value = val;
    searchQuery.value = val;
    isOpen.value = false;
    onValueChange$?.(val);
  });

  // Provide context for combobox options
  useContextProvider(ComboboxContext, {
    selectedValue: selectedValue.value,
    onSelect$: handleValueChange$,
    searchQuery: searchQuery.value,
    isOpen: isOpen.value
  });

  // Handle click outside
  useOnDocument(
    'click',
    $((event: MouseEvent) => {
      if (!comboboxRef.value || !isOpen.value) return;
      
      const target = event.target as Node;
      if (comboboxRef.value.contains(target)) return;
      
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
      ref={comboboxRef}
      {...props}
      class={cn('relative', props.class)}
    >
      <div class="relative">
        <LuSearch class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          value={searchQuery.value}
          class={cn(
            'flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-10 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          onFocus$={() => {
            if (!disabled) {
              isOpen.value = true;
            }
          }}
          onInput$={(e, target) => {
            searchQuery.value = target.value;
            if (!isOpen.value) {
              isOpen.value = true;
            }
          }}
        />
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen.value}
          class="absolute right-1 top-1 rounded-md p-1 text-muted-foreground hover:bg-accent"
          onClick$={() => {
            if (!disabled) {
              isOpen.value = !isOpen.value;
            }
          }}
        >
          <LuChevronDown class="h-4 w-4" />
        </button>
      </div>
      
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
  /**
   * Filter function to determine if option should be shown
   */
  filter?: (query: string, value: string) => boolean;
};

const Option = component$<OptionProps & PropsOf<'div'>>(({ 
  value, 
  disabled,
  filter,
  ...props 
}) => {
  // Get combobox context
  const { selectedValue, onSelect$, searchQuery } = useContext(ComboboxContext);
  
  const isSelected = selectedValue === value;

  // Default filter if none provided
  const defaultFilter = (query: string, optionValue: string) => {
    return optionValue.toLowerCase().includes(query.toLowerCase());
  };

  const isVisible = (filter || defaultFilter)(searchQuery, value);
  
  if (!isVisible) {
    return null;
  }
  
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

export const Combobox = {
  Root,
  Option
};