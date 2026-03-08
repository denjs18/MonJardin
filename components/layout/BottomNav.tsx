"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flower2, TreeDeciduous, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    icon: <Home className="h-6 w-6" />,
    label: "Accueil",
  },
  {
    href: "/garden",
    icon: <TreeDeciduous className="h-6 w-6" />,
    label: "Jardin",
  },
  {
    href: "/plants",
    icon: <Flower2 className="h-6 w-6" />,
    label: "Plantes",
  },
  {
    href: "/planting",
    icon: <Calendar className="h-6 w-6" />,
    label: "Calendrier",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.slice(0, 2).map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href} />
        ))}

        {/* FAB Button */}
        <Link
          href="/plants/add"
          className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-95 touch-target"
        >
          <Plus className="h-7 w-7" />
        </Link>

        {navItems.slice(2).map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-lg transition-colors touch-target",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {item.icon}
      <span className="text-xs mt-1 font-medium">{item.label}</span>
    </Link>
  );
}
