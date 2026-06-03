import { useState, useRef, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface MenuDef {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: (MenuItem | "separator")[];
  onClick?: () => void;
}

interface MenubarProps {
  menus: MenuDef[];
  updateInfo?: {
    current: string;
    latest: string;
    title: string;
    downloadUrl: string;
  } | null;
}

export function Menubar({ menus, updateInfo }: MenubarProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    if (openMenu === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu, closeMenu]);

  const handleMenuClick = (menu: MenuDef, i: number) => {
    if (menu.onClick) {
      menu.onClick();
      closeMenu();
    } else if (menu.items) {
      setOpenMenu(openMenu === i ? null : i);
    }
  };

  return (
    <nav
      ref={menuRef}
      className="h-8 flex items-center bg-background border-b border-border select-none"
    >
      {menus.map((menu, i) => {
        const Icon = menu.icon;
        const isOpen = openMenu === i;
        const hasDropdown = !!menu.items;

        return (
          <div key={menu.label} className="relative">
            <button
              onClick={() => handleMenuClick(menu, i)}
              onMouseEnter={() => {
                if (openMenu !== null && hasDropdown) setOpenMenu(i);
              }}
              className={cn(
                "h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors outline-none",
                isOpen && "bg-accent text-foreground",
              )}
            >
              <Icon className="w-3 h-3" />
              {menu.label}
            </button>

            {isOpen && menu.items && (
              <div className="absolute top-full left-0 z-50 min-w-[180px] rounded-md border border-border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                {menu.items.map((item, j) =>
                  item === "separator" ? (
                    <div
                      key={`sep-${j}`}
                      className="-mx-1 my-1 h-px bg-border"
                    />
                  ) : (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick();
                        closeMenu();
                      }}
                      disabled={item.disabled}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground outline-none transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      {item.icon && <item.icon className="w-3.5 h-3.5" />}
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-xs text-muted-foreground tracking-widest">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Right side — update button */}
      {updateInfo && (
        <div className="ml-auto flex items-center pr-2">
          <button
            onClick={() =>
              window.electronAPI?.openExternal(updateInfo.downloadUrl)
            }
            className="h-6 inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 text-[11px] font-medium text-primary hover:bg-primary/25 transition-colors"
            title={`v${updateInfo.latest} available: click to download`}
          >
            <Download className="w-3 h-3" />
            Update to v{updateInfo.latest}
          </button>
        </div>
      )}
    </nav>
  );
}
