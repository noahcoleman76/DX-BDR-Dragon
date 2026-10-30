import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export type SelectOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
  className?: string;
};

export function AppSelect<T extends string>({ label, value, options, onChange, compact = false, className }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);

  useLayoutEffect(() => {
    if (!open) return;

    function placeMenu() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
      const height = Math.min(options.length * 36 + 8, 240);
      const below = rect.bottom + 6 + height <= window.innerHeight - 8;
      setMenuStyle({
        top: below ? rect.bottom + 6 : Math.max(8, rect.top - height - 6),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width
      });
    }

    placeMenu();
    optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, options.length, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const focusedIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    let nextIndex = focusedIndex;
    if (event.key === "ArrowDown") nextIndex = (focusedIndex + 1) % options.length;
    else if (event.key === "ArrowUp") nextIndex = (focusedIndex - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;
    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={clsx("app-select-trigger focus-ring flex w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition", compact ? "app-select-compact h-8 px-2" : "h-10", className)}
        type="button"
        aria-label={`${label}: ${options[selectedIndex]?.label ?? value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="min-w-0 truncate">{options[selectedIndex]?.label ?? value}</span>
        <ChevronDown size={15} className={clsx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && options.length > 0
        ? createPortal(
            <div ref={menuRef} id={menuId} className="app-menu fixed z-[70] max-h-60 overflow-y-auto rounded-lg border p-1 shadow-xl" style={menuStyle} role="listbox" aria-label={label} onKeyDown={handleMenuKeyDown}>
              {options.map((option, index) => (
                <button
                  key={option.value}
                  ref={(element) => { optionRefs.current[index] = element; }}
                  className="app-menu-option focus-ring flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm"
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  tabIndex={-1}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value ? <Check size={15} className="shrink-0 text-sky-700" /> : null}
                </button>
              ))}
            </div>,
            triggerRef.current?.closest('dialog') ?? document.body
          )
        : null}
    </>
  );
}
