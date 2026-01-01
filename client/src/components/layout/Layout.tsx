import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Loader } from "@/components/loader";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title = "Dashboard" }: LayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Close sidebar and show loader when location changes
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsPageLoading(true);
    // Use requestAnimationFrame to ensure the loader renders before any heavy logic
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 600); // Slightly longer delay to ensure heavy components like Devices can mount
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex bg-transparent">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[150] bg-background/20 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-[200] w-64 shadow-2xl lg:hidden"
          >
            <Sidebar onClear={() => setIsSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        <Header 
          title={title} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
          <AnimatePresence mode="wait">
            {isPageLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center"
              >
                <Loader />
              </motion.div>
            ) : (
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="p-4 md:p-6"
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
