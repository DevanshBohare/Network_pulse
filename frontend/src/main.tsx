import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/auth";
import { App } from "@/App";
import { Preloader } from "@/components/Preloader";
import "./index.css";

function Root() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShowSplash(false), 1350);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <div className="relative min-h-[100dvh] w-full">
            <Preloader show={showSplash} onExitComplete={() => setAppReady(true)} />
            {appReady ? <App /> : null}
          </div>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
