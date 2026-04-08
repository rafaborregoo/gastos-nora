import { PageHeader } from "@/components/ui/page-header";
import { CategoryManager } from "@/features/categories/category-manager";
import { getCategories } from "@/lib/queries/household-queries";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" description="Crea y mantiene categorias del hogar con iconos, color y tipo de uso." />
      <CategoryManager categories={categories} />
    </div>
  );
}

