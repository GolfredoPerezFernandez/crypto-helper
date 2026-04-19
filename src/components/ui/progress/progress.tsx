import { component$, type PropsOf } from '@builder.io/qwik';
import { cn } from '../utils';

export type ProgressProps = PropsOf<'div'> & {
  /**
   * The value of the progress bar
   * @default 0
   */
  value?: number;
  /**
   * The maximum value of the progress bar
   * @default 100
   */
  max?: number;
};

export const Progress = component$<ProgressProps>(({ value = 0, max = 100, ...props }) => {
  const percentage = Math.min(Math.max(0, value), max) / max * 100;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${percentage.toFixed(0)}%`}
      {...props}
      class={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', props.class)}
    >
      <div
        class="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
});