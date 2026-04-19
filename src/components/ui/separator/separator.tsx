import { component$, type PropsOf } from '@builder.io/qwik';
import { cn } from '../utils';

export type SeparatorProps = PropsOf<'div'> & {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Whether the separator has a decorative purpose only.
   * @default true
   */
  decorative?: boolean;
};

export const Separator = component$<SeparatorProps>(({ 
  orientation = 'horizontal', 
  decorative = true, 
  ...props
}) => {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      {...props}
      class={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        props.class
      )}
    />
  );
});