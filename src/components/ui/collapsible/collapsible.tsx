import { component$, Slot, useSignal } from '@builder.io/qwik';
import { Collapsible as HeadlessCollapsible } from '@qwik-ui/headless';
import { cn } from '../utils';

export const Collapsible = {
  Root: component$<{
    class?: string;
  }>(({
    class: className,
  }) => {
    const isOpen = useSignal(false);
    
    return (
      <HeadlessCollapsible.Root
        class={cn('w-full', className)}
      >
        <Slot />
      </HeadlessCollapsible.Root>
    );
  }),

  Trigger: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessCollapsible.Trigger
        class={cn(
          'flex items-center justify-between px-4 py-2 text-sm font-medium bg-background border rounded-t',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'hover:bg-muted/50',
          '[&[data-state=open]>svg]:rotate-180',
          className
        )}
      >
        <Slot />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 shrink-0 transition-transform duration-200"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </HeadlessCollapsible.Trigger>
    );
  }),

  Content: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessCollapsible.Content
        class={cn(
          'overflow-hidden rounded-b border border-t-0 px-4 py-2 text-sm',
          'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
          className
        )}
      >
        <Slot />
      </HeadlessCollapsible.Content>
    );
  })
};