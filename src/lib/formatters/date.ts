import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDisplayDate(value: string, formatString = "d MMM yyyy") {
  const parsed = parseISO(value);

  if (!isValid(parsed)) {
    return value;
  }

  return format(parsed, formatString, { locale: es });
}

export function formatMonthLabel(value: string) {
  const parsed = parseISO(value);

  if (!isValid(parsed)) {
    return value;
  }

  return format(parsed, "MMM yyyy", { locale: es });
}

