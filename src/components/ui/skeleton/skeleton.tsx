import { component$, type PropsOf } from '@builder.io/qwik';
import { cn } from '../utils';

export type SkeletonProps = PropsOf<'div'>;

export const Skeleton = component$<SkeletonProps>(({ ...props }) => {
  return (
    <div
      {...props}
      class={cn('animate-pulse rounded-md bg-muted', props.class)}
      aria-hidden="true" 
    />
  );
});