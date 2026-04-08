import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center">
      <Image
        src="/logo_nora_gastos.png"
        alt="NORA Gastos"
        width={220}
        height={60}
        priority
        className="h-auto w-[160px] md:w-[200px]"
      />
    </Link>
  );
}
