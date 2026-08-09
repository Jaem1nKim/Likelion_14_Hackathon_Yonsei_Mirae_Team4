import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type PrimaryButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }
>;

export function PrimaryButton({
  children,
  isLoading = false,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className="button button-primary"
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "처리 중..." : children}
    </button>
  );
}
