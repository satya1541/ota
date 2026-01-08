

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

// Layout is now a simple wrapper since Sidebar/Header are handled at App level
export function Layout({ children }: LayoutProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}
