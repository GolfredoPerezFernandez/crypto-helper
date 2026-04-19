import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import { cn, cva, type VariantProps } from '../utils';

export const badgeVariants = cva({
  base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'text-foreground',
      alert: 'border-transparent bg-alert text-alert-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BadgeProps = PropsOf<'div'> & VariantProps<typeof badgeVariants>;

export const Badge = component$<BadgeProps>(({ variant, ...props }) => {
  return (
    <div {...props} class={cn(badgeVariants({ variant, class: props.class }))}>
      <Slot />
    </div>
  );
});