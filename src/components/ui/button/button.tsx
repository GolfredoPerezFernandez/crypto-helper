import { component$, Slot, QwikIntrinsicElements, ClassList } from '@builder.io/qwik';
import { cva } from '../utils';

/**
 * Button variant styles
 */
export const buttonVariants = cva({
  base: [
    'inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    'transition-colors press active:scale-[0.98]',
  ],
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-alert text-alert-foreground hover:bg-alert/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-12 px-8',
      icon: 'h-9 w-9',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export type ButtonProps = QwikIntrinsicElements['button'] & {
  /**
   * The visual style of the button
   * @default 'default'
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /**
   * The size of the button
   * @default 'default'
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /**
   * Custom class names to add to the button
   */
  class?: ClassList;
};

/**
 * Button component with various styles and sizes
 */
export const Button = component$<ButtonProps>(
  ({ variant, size, type = 'button', ...props }) => {
    return (
      <button
        type={type}
        {...props}
        class={buttonVariants({ variant, size, class: props.class })}
      >
        <Slot />
      </button>
    );
  }
);