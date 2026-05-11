"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState(pathname);

  if (pathname !== currentPath) {
    setCurrentPath(pathname);
    setVisible(false);
  }

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div
      id="main-scroll"
      className="flex-1 overflow-y-auto flex flex-col relative w-full h-full scroll-smooth"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
    >
      {children}
    </div>
  );
}
