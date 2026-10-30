import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCompare } from "../lib/compare";
import { CloseIcon, MenuIcon } from "./Icons";
import { Logo } from "./Logo";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/explore", label: "Explore Colleges" },
  { to: "/predictor", label: "Admission Predictor" },
  { to: "/compare", label: "Compare" },
  { to: "/chat", label: "AI Chat" },
  { to: "/dashboard", label: "Dashboard" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-[0.9375rem] font-medium transition-colors ${
    isActive ? "bg-peacock-50 text-peacock-700" : "text-ink-700 hover:bg-ink-100 hover:text-ink-900"
  }`;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { slugs } = useCompare();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Admission PS home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className={linkClass}>
                {link.label}
                {link.to === "/compare" && slugs.length > 0 && (
                  <span className="tabular ml-1.5 rounded-full bg-marigold-400 px-1.5 py-0.5 text-xs font-bold text-ink-900">
                    {slugs.length}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          <li className="ml-2">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
          </li>
        </ul>

        <button
          type="button"
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon width={22} height={22} /> : <MenuIcon width={22} height={22} />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-ink-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={(s) => `block ${linkClass(s)}`}>
                  {link.label}
                  {link.to === "/compare" && slugs.length > 0 && (
                    <span className="tabular ml-2 rounded-full bg-marigold-400 px-1.5 py-0.5 text-xs font-bold">
                      {slugs.length}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
            <li className="pt-2">
              <Link to="/login" className="btn btn-primary w-full">
                Login
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
