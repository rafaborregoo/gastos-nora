"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { IconPicker } from "@/components/forms/icon-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { upsertCategoryAction } from "@/lib/actions/catalog-actions";
import { getCategoryIcon } from "@/lib/category-icons";
import { categorySchema } from "@/lib/validators/categories";
import type { Category } from "@/types/database";
import type { CategoryFormValues } from "@/types/forms";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      kind: "expense",
      color: "#129474",
      icon: "tag"
    }
  });

  const selectedIcon = form.watch("icon") ?? "tag";
  const SelectedIcon = getCategoryIcon(selectedIcon);

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Nueva categoria</h2>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await upsertCategoryAction(values);

              if (!result.ok) {
                toast.error(result.message);
                return;
              }

              toast.success(result.message);
              form.reset({
                name: "",
                kind: "expense",
                color: "#129474",
                icon: "tag"
              });
              router.refresh();
            });
          })}
        >
          <FormField label="Nombre" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </FormField>
          <FormField label="Tipo" error={form.formState.errors.kind?.message}>
            <Select {...form.register("kind")}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
              <option value="both">Ambos</option>
            </Select>
          </FormField>
          <FormField label="Color">
            <div className="flex items-center gap-3">
              <Input type="color" className="h-12 w-20 p-2" {...form.register("color")} />
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: form.watch("color") ?? "#129474" }}
              >
                <SelectedIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </FormField>
          <FormField label="Icono" error={form.formState.errors.icon?.message}>
            <IconPicker value={selectedIcon} onChange={(value) => form.setValue("icon", value, { shouldValidate: true })} />
          </FormField>
          <Button type="submit" disabled={isPending}>
            Guardar categoria
          </Button>
        </form>
      </Card>
      <div className="space-y-4">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.icon);

          return (
            <Card key={category.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundColor: category.color ?? "#94a3b8" }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">{category.kind}</p>
                </div>
              </div>
              {category.is_system ? (
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sistema</span>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

