"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/public/ChoiceChip";
import type { OrderFormValues } from "@/lib/schemas";

interface ItemRowProps {
  index: number;
  control: Control<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>["items"];
  rasaOptions: string[];
  toppingOptions: string[];
  maksTopping: number;
  /** Total cup semua baris saat ini. */
  totalCup: number;
  maksTotalCup: number;
  canRemove: boolean;
  onRemove: () => void;
}

export function ItemRow({
  index,
  control,
  errors,
  rasaOptions,
  toppingOptions,
  maksTopping,
  totalCup,
  maksTotalCup,
  canRemove,
  onRemove,
}: ItemRowProps) {
  const rowErrors = Array.isArray(errors) ? errors[index] : undefined;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold">Pesanan #{index + 1}</h3>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3 text-destructive"
            onClick={onRemove}
            aria-label={`Hapus pesanan #${index + 1}`}
          >
            <Trash2 aria-hidden /> Hapus
          </Button>
        )}
      </div>

      <Controller
        control={control}
        name={`items.${index}.rasa`}
        render={({ field }) => (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Rasa</legend>
            <div className="flex flex-wrap gap-2">
              {rasaOptions.map((rasa) => (
                <ChoiceChip
                  key={rasa}
                  type="radio"
                  name={`rasa-${index}`}
                  value={rasa}
                  checked={field.value === rasa}
                  onChange={() => field.onChange(rasa)}
                >
                  {rasa}
                </ChoiceChip>
              ))}
            </div>
            {rowErrors?.rasa?.message && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {rowErrors.rasa.message}
              </p>
            )}
          </fieldset>
        )}
      />

      {toppingOptions.length > 0 && (
        <Controller
          control={control}
          name={`items.${index}.topping`}
          render={({ field }) => {
            const penuh = field.value.length >= maksTopping;
            return (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Topping{" "}
                  <span className="font-normal text-muted-foreground">
                    ({field.value.length}/{maksTopping})
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {toppingOptions.map((t) => {
                    const terpilih = field.value.includes(t);
                    return (
                      <ChoiceChip
                        key={t}
                        type="checkbox"
                        name={`topping-${index}`}
                        value={t}
                        checked={terpilih}
                        disabled={!terpilih && penuh}
                        onChange={(checked) =>
                          field.onChange(checked ? [...field.value, t] : field.value.filter((x) => x !== t))
                        }
                      >
                        {t}
                      </ChoiceChip>
                    );
                  })}
                </div>
                {penuh && (
                  <p className="text-xs text-muted-foreground">
                    Batas topping tercapai. Lepas satu untuk memilih yang lain.
                  </p>
                )}
                {rowErrors?.topping?.message && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {rowErrors.topping.message}
                  </p>
                )}
              </fieldset>
            );
          }}
        />
      )}

      <Controller
        control={control}
        name={`items.${index}.qty`}
        render={({ field }) => (
          <div className="flex items-center justify-between">
            <span id={`qty-label-${index}`} className="text-sm font-medium">
              Jumlah cup
            </span>
            <div role="group" aria-labelledby={`qty-label-${index}`} className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="size-11 rounded-full"
                disabled={field.value <= 1}
                onClick={() => field.onChange(field.value - 1)}
                aria-label="Kurangi satu cup"
              >
                <Minus aria-hidden />
              </Button>
              <output className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                {field.value}
              </output>
              <Button
                type="button"
                variant="outline"
                className="size-11 rounded-full"
                disabled={totalCup >= maksTotalCup}
                onClick={() => field.onChange(field.value + 1)}
                aria-label="Tambah satu cup"
              >
                <Plus aria-hidden />
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
