import { Link, useLocation } from "react-router-dom";
import { Sparkles, Lightbulb, Megaphone, Scale, BookmarkCheck, Users, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  const navItems = [
    { path: "/ideas", label: "Ideas", icon: Sparkles },
    { path: "/expand", label: "Expand", icon: Lightbulb },
    { path: "/pitch", label: "Pitch", icon: Megaphone },
    { path: "/judge-qa", label: "Judge Q&A", icon: Scale },
    { path: "/my-ideas", label: "My Ideas", icon: BookmarkCheck },
    { path: "/free-apis", label: "Free APIs", icon: Zap },
    { path: "/dashboard", label: "Rooms", icon: Users },
  ];

  // Don't show nav on login page
  if (location.pathname === '/login') return null;

  // Don't show nav on room pages (they have their own header)
  if (location.pathname.startsWith('/rooms/') || location.pathname.startsWith('/join/')) return null;

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            <Sparkles className="h-6 w-6 text-primary" />
            HackMate
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname.startsWith('/dashboard'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
