import { useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const steps = [
  { path: "/", label: "Theme" },
  { path: "/", label: "Ideas" },
  { path: "/expand", label: "Expand" },
  { path: "/pitch", label: "Pitch" },
  { path: "/judge-qa", label: "Judge Q&A" },
  { path: "/my-ideas", label: "Saved" },
];

const ProgressBar = () => {
  const location = useLocation();
  
  // Hide progress bar on login, dashboard, room pages, and join pages
  if (location.pathname === '/login' || 
      location.pathname === '/dashboard' || 
      location.pathname.startsWith('/rooms/') ||
      location.pathname.startsWith('/join/')) {
    return null;
  }
  
  const getCurrentStep = () => {
    const path = location.pathname;
    if (path === "/" || path === "/ideas") return 2;
    if (path === "/expand") return 3;
    if (path === "/pitch") return 4;
    if (path === "/judge-qa") return 5;
    if (path === "/my-ideas" || path === "/free-apis") return 6;
    return 1;
  };

  const currentStep = getCurrentStep();
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="w-full bg-card/50 backdrop-blur-sm border-b border-border py-4">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between mb-2 text-xs text-muted-foreground">
            {steps.map((step, index) => (
              <span
                key={index}
                className={`${
                  index + 1 <= currentStep ? "text-primary font-semibold" : ""
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
