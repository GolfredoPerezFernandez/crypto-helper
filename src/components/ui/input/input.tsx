import { component$, QwikIntrinsicElements, ClassList } from '@builder.io/qwik';
import { cn } from '../utils';

export type InputProps = QwikIntrinsicElements['input'] & {
  /**
   * Custom class names to add to the input
   */
  class?: ClassList;
};

/**
 * Input component with styling based on Qwik UI Styled
 */
export const Input = component$<InputProps>((props) => {
  return (
    <input
      {...props}
      class={cn(
        'flex h-10 w-full rounded border border-input bg-background px-3 py-2 text-sm',
        'ring-offset-background placeholder:text-muted-foreground', 
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.class
      )}
    />
  );
});