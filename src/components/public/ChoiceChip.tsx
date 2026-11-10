import { cn } from "@/lib/utils";

interface ChoiceChipProps {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}

/** Pilihan berbentuk chip (radio/checkbox native, 44px, fokus terlihat). */
export function ChoiceChip({ type, name, value, checked, disabled, onChange, children }: ChoiceChipProps) {
  return (
    <label
      className={cn(
        "relative inline-flex min-h-11 cursor-pointer select-none items-center justify-center rounded-full border bg-card px-4 text-sm font-medium transition-colors",
        "has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground",
        "has-focus-visible:ring-3 has-focus-visible:ring-ring/60",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      {children}
    </label>
  );
}
