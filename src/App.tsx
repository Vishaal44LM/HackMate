import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Navigation from "./components/Navigation";
import ProgressBar from "./components/ProgressBar";
import ProtectedRoute from "./components/ProtectedRoute";
import AnnouncementStrip from "./components/AnnouncementStrip";
import Home from "./pages/Home";
import IdeaGenerator from "./pages/IdeaGenerator";
import ExpandIdea from "./pages/ExpandIdea";
import PitchGenerator from "./pages/PitchGenerator";
import JudgeQA from "./pages/JudgeQA";
import MyIdeas from "./pages/MyIdeas";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import JoinRoom from "./pages/JoinRoom";
import Announcements from "./pages/Announcements";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <div className="app-root transition-all duration-300">
      <Navigation />
      <ProgressBar />
      <AnnouncementStrip />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ideas" element={<IdeaGenerator />} />
        <Route path="/expand" element={<ExpandIdea />} />
        <Route path="/pitch" element={<PitchGenerator />} />
        <Route path="/judge-qa" element={<JudgeQA />} />
        <Route path="/my-ideas" element={<MyIdeas />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rooms/:roomId" 
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          } 
        />
        <Route path="/join/:roomId" element={<JoinRoom />} />
        <Route 
          path="/announcements" 
          element={
            <ProtectedRoute>
              <Announcements />
            </ProtectedRoute>
          } 
        />
        {/* Legacy routes redirect */}
        <Route path="/ideation-rooms" element={<Navigate to="/dashboard" replace />} />
        <Route path="/ideation-rooms/:roomId" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="app-footer border-t border-border py-6 text-center text-sm text-muted-foreground">
        © 2025 HackMate | Built for Innovators, by Innovators 💡
      </footer>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
