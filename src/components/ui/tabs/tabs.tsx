import { component$, Slot } from '@builder.io/qwik';
import { Tabs as HeadlessTabs } from '@qwik-ui/headless';
import { cn } from '../utils';

export const Tabs = {
  Root: component$<{
    class?: string;
  }>(({
  class: className
  }) => {
    return (
      <HeadlessTabs.Root
    class={cn('w-full', className)}
      >
        <Slot />
      </HeadlessTabs.Root>
    );
  }),

  List: component$<{ class?: string }>(({ class: className }) => {
    return (
      <HeadlessTabs.List
        class={cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
          className
        )}
      >
        <Slot />
      </HeadlessTabs.List>
    );
  }),

  Tab: component$<{
    class?: string;
    value: string;
  }>(({
    class: className,
    value
  }) => {
    return (
      <HeadlessTabs.Tab
        class={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          'data-[state=selected]:bg-background data-[state=selected]:text-foreground data-[state=selected]:shadow-sm',
          className
        )}
        value={value}
      >
        <Slot />
      </HeadlessTabs.Tab>
    );
  }),

  Panel: component$<{
    class?: string;
  }>(({
    class: className
  }) => {
    return (
      <HeadlessTabs.Panel
        class={cn(
          'mt-2 p-4 rounded-md border bg-card text-card-foreground shadow',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'data-[state=inactive]:hidden',
          className
        )}
      >
        <Slot />
      </HeadlessTabs.Panel>
    );
  })
};