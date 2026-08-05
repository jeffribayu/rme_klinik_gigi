import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 text-white shadow-md shadow-teal-600/25 hover:brightness-110 hover:shadow-lg hover:shadow-teal-500/30 dark:from-teal-500 dark:via-teal-400 dark:to-cyan-400 dark:shadow-teal-900/40',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm border border-teal-200/60 hover:bg-teal-100/90 hover:border-teal-300/80 dark:border-teal-800/50 dark:hover:bg-teal-950/80',
        outline:
          'border-2 border-teal-200/90 bg-white/90 text-teal-800 hover:bg-teal-50 hover:border-teal-400 hover:text-teal-900 dark:border-teal-700/60 dark:bg-card dark:text-teal-100 dark:hover:bg-teal-950/60 dark:hover:border-teal-500/70',
        ghost:
          'text-teal-800 hover:bg-teal-100/80 hover:text-teal-950 dark:text-teal-200 dark:hover:bg-teal-950/50',
        destructive:
          'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 hover:brightness-110',
        link: 'text-primary underline-offset-4 hover:underline font-semibold',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
