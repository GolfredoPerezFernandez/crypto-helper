import { ClassList } from '@builder.io/qwik';

export type VariantProps<T extends (...args: any) => any> = Parameters<T>[0];

/**
 * Simplified class name utility
 * Combines class names and filters out falsy values
 */
export function cn(...classes: (string | undefined | null | false | ClassList)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Simple class variants utility
 */
export function cva(config: {
  base?: string | string[];
  variants?: Record<string, Record<string, string | string[]>>;
  defaultVariants?: Record<string, string>;
}) {
  const { base = [], variants = {}, defaultVariants = {} } = config;
  
  return (props: Record<string, any> = {}) => {
    const { class: className, ...variantProps } = props;
    const baseClasses = Array.isArray(base) ? base : [base];
    
    const variantClasses: string[] = [];
    
    // Apply variants
    Object.entries(variants).forEach(([variantName, variantOptions]) => {
      const variantProp = variantProps[variantName] || defaultVariants[variantName];
      
      if (variantProp && variantOptions[variantProp]) {
        const variantValue = variantOptions[variantProp];
        if (Array.isArray(variantValue)) {
          variantClasses.push(...variantValue);
        } else {
          variantClasses.push(variantValue);
        }
      }
    });

    // Combine all classes
    const allClasses = [
      ...baseClasses,
      ...variantClasses,
      ...(className ? (Array.isArray(className) ? className : [className]) : [])
    ].filter(Boolean);

    return allClasses.join(' ');
  };
}