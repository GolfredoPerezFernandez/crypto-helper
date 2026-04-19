import { component$, Slot, type PropsOf, useSignal, useTask$, $ } from '@builder.io/qwik';
import { cn } from '../utils';

export type RadioGroupProps = PropsOf<'div'> & {
  /**
   * The value of the radio group
   */
  value?: string;
  /**
   * The default value of the radio group
   */
  defaultValue?: string;
  /**
   * Function called when the value changes
   */
  onValueChange$?: (value: string) => void;
  /**
   * The name of the radio group
   */
  name?: string;
};

const Root = component$<RadioGroupProps>(({ 
  value, 
  defaultValue, 
  onValueChange$, 
  name,
  ...props 
}) => {
  const selectedValue = useSignal(value || defaultValue || '');

  useTask$(({ track }) => {
    track(() => value);
    if (value !== undefined) {
      selectedValue.value = value;
    }
  });

  const handleValueChange$ = $((val: string) => {
    selectedValue.value = val;
    onValueChange$?.(val);
  });

  return (
    <div
      {...props}
      role="radiogroup"
      class={cn('space-y-1', props.class)}
      data-state={selectedValue.value ? 'valid' : 'invalid'}
      data-value={selectedValue.value}
    >
      <Slot />
    </div>
  );
});

export type RadioItemProps = Omit<PropsOf<'input'>, 'type'> & {
  /**
   * Custom class for the item
   */
  itemClass?: string;
  /**
   * Custom class for the indicator
   */
  indicatorClass?: string;
  /**
   * The value of the radio item
   */
  value: string;
  /**
   * Radio group selected value
   */
  groupValue?: string;
  /**
   * Function called when the value changes
   */
  onValueChange$?: (value: string) => void;
  /**
   * The name of the radio group
   */
  groupName?: string;
};

const Item = component$<RadioItemProps>(({ 
  id,
  value = '',
  disabled,
  itemClass,
  indicatorClass,
  groupValue,
  onValueChange$,
  groupName,
  ...props 
}) => {
  const isSelected = groupValue === value;

  return (
    <div class="flex items-center space-x-2">
      <div class={cn('relative', itemClass)}>
        <input
          type="radio"
          id={id}
          value={value}
          name={groupName}
          checked={isSelected}
          disabled={disabled}
          aria-disabled={disabled}
          onChange$={() => {
            if (!disabled && onValueChange$) {
              onValueChange$(value);
            }
          }}
          class="sr-only"
          {...props}
        />
        <div
          class={cn(
            'flex h-4 w-4 items-center justify-center rounded-full border border-primary text-primary',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isSelected ? 'border-primary' : 'border-input',
            itemClass
          )}
        >
          {isSelected && (
            <div
              class={cn(
                'h-2 w-2 rounded-full bg-primary',
                indicatorClass
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export const RadioGroup = {
  Root,
  Item
};