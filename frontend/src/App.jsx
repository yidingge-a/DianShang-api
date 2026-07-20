import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { navItems } from "./nav-items";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const queryClient = new QueryClient();

const PUBLIC_PATHS = new Set(["/login", "/register"]);

const authRequired = import.meta.env.VITE_DISABLE_AUTH !== '1';

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <HashRouter>
            <Navigation />
            <Routes>
              {navItems.map(({ to, page }) => (
                <Route
                  key={to}
                  path={to}
                  element={
                    !authRequired || PUBLIC_PATHS.has(to)
                      ? page
                      : <ProtectedRoute>{page}</ProtectedRoute>
                  }
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Footer />
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
