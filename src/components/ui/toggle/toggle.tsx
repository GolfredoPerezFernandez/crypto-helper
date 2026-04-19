import { component$, Slot } from '@builder.io/qwik';
import { Toggle as HeadlessToggle } from '@qwik-ui/headless';
import { cn } from '../utils';

export const Toggle = component$<{
  class?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  pressed?: boolean;
  disabled?: boolean;
}>(({ 
  class: className, 
  variant = 'default', 
  size = 'default',
  pressed,
  disabled
}) => {
  return (
    <HeadlessToggle
      class={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:hover:bg-accent/80',
        variant === 'default' && 'bg-muted hover:bg-muted/80',
        variant === 'outline' && 'border border-input hover:bg-accent hover:text-accent-foreground',
        size === 'default' && 'h-10 px-4',
        size === 'sm' && 'h-8 px-2.5',
        size === 'lg' && 'h-12 px-6',
        className
      )}
      pressed={pressed}
      disabled={disabled}
    >
      <Slot />
    </HeadlessToggle>
  );
});