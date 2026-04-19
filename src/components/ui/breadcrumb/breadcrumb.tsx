import { component$, Slot, type PropsOf } from '@builder.io/qwik';
import { cn } from '../utils';
import { LuChevronRight } from '@qwikest/icons/lucide';

const Root = component$<PropsOf<'nav'>>(({ ...props }) => {
  return (
    <nav
      {...props}
      aria-label="breadcrumb"
      class={cn('flex', props.class)}
    >
      <Slot />
    </nav>
  );
});

const List = component$<PropsOf<'ol'>>(({ ...props }) => {
  return (
    <ol
      {...props}
      class={cn('flex flex-wrap items-center gap-1.5', props.class)}
    >
      <Slot />
    </ol>
  );
});

const Item = component$<PropsOf<'li'>>(({ ...props }) => {
  return (
    <li
      {...props}
      class={cn('inline-flex items-center gap-1.5', props.class)}
    >
      <Slot />
    </li>
  );
});

const Link = component$<PropsOf<'a'>>(({ ...props }) => {
  return (
    <a
      {...props}
      class={cn(
        'text-sm font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline',
        !props.href && 'cursor-not-allowed opacity-60',
        props.class
      )}
    >
      <Slot />
    </a>
  );
});

const Separator = component$<PropsOf<'span'>>(({ ...props }) => {
  return (
    <span
      {...props}
      aria-hidden="true"
      class={cn('text-muted-foreground', props.class)}
    >
      <LuChevronRight class="h-4 w-4" />
    </span>
  );
});

const Page = component$<PropsOf<'span'>>(({ ...props }) => {
  return (
    <span
      {...props}
      aria-current="page"
      class={cn('font-normal text-foreground', props.class)}
    >
      <Slot />
    </span>
  );
});

export const Breadcrumb = {
  Root,
  List,
  Item,
  Link,
  Page,
  Separator,
};