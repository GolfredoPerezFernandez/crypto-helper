import { component$, Slot, type PropsOf } from '@builder.io/qwik';
import { Checkbox as HeadlessCheckbox } from '@qwik-ui/headless';
import { cn } from '../utils';
import { LuCheck } from '@qwikest/icons/lucide';

export type CheckboxProps = PropsOf<typeof HeadlessCheckbox.Root>;

export const Checkbox = component$<CheckboxProps>((props) => {
  return (
    <HeadlessCheckbox.Root
      {...props}
      class={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        props.class
      )}
    >
      <HeadlessCheckbox.Indicator class="flex items-center justify-center text-primary-foreground">
        <LuCheck class="h-3 w-3" />
      </HeadlessCheckbox.Indicator>
    </HeadlessCheckbox.Root>
  );
});

export const CheckboxWithLabel = component$<
  CheckboxProps & { label: string; labelClass?: string }
>(({ label, labelClass, ...checkboxProps }) => {
  return (
    <div class="flex items-center space-x-2">
      <Checkbox {...checkboxProps} />
      <label
        for={checkboxProps.id}
        class={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', labelClass)}
      >
        {label}
      </label>
    </div>
  );
});