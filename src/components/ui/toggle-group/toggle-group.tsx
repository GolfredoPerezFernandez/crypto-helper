import { component$, Slot } from '@builder.io/qwik';
import { ToggleGroup as HeadlessToggleGroup } from '@qwik-ui/headless';
import { cn } from '../utils';

export const ToggleGroup = {
  Root: component$<{
    class?: string;
  }>((props) => {
    const { class: className } = props;
    
    return (
      <HeadlessToggleGroup.Root
        class={cn('inline-flex items-center justify-center gap-1 rounded-md', className)}
      >
        <Slot />
      </HeadlessToggleGroup.Root>
    );
  }),

  Item: component$<{
    class?: string;
    value: string;
    disabled?: boolean;
  }>((props) => {
    const { class: className, value, disabled } = props;
    
    return (
      <HeadlessToggleGroup.Item
        class={cn(
          'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
          'hover:bg-muted/60',
          className
        )}
        value={value}
        disabled={disabled}
      >
        <Slot />
      </HeadlessToggleGroup.Item>
    );
  }),
};