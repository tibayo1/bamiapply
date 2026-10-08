import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button styles for the whole product. Exported as `buttonVariants` so
 * links can look like buttons (<Link className={buttonVariants(...)}>)
 * without a polymorphic wrapper.
 */
export const buttonVariants = cva(
  [
    "focus-ring transition-ui inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-md font-medium select-none",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-white hover:bg-brand-hover",
        secondary:
          "border border-line-strong bg-surface text-ink hover:bg-inset",
        ghost:
          "text-ink-secondary hover:bg-ink/[0.05] hover:text-ink",
      },
      size: {
        sm: "h-8 px-3 text-meta",
        md: "h-9 px-3.5 text-body",
        lg: "h-11 px-5 text-body",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
