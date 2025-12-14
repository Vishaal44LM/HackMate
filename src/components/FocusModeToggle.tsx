import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusMode } from "@/hooks/useFocusMode";

const FocusModeToggle = () => {
  const { isFocusMode, toggleFocusMode } = useFocusMode();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleFocusMode}
      className="gap-2 fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm shadow-lg"
    >
      {isFocusMode ? (
        <>
          <Minimize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Exit Focus</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Focus</span>
        </>
      )}
    </Button>
  );
};

export default FocusModeToggle;
