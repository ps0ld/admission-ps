import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CompareTray } from "./CompareTray";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <CompareTray />
    </>
  );
}
