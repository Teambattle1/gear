import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import ErrorBoundary from "./components/ErrorBoundary";

// Route-level code-splitting: hver side hentes først når den bruges, så
// hoved-bundlen (og de tunge PDF-libs) ikke bremser første load.
const Landing = lazy(() => import("./pages/Landing"));
const ActivityGear = lazy(() => import("./pages/ActivityGear"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const FindEquipment = lazy(() => import("./pages/FindEquipment"));
const TeamBox = lazy(() => import("./pages/TeamBox"));

const INTRO_KEY = "gear_intro_seen";

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">
      Henter…
    </div>
  );
}

export default function App() {
  const [introDone, setIntroDone] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(INTRO_KEY) === "1";
  });

  useEffect(() => {
    if (introDone) sessionStorage.setItem(INTRO_KEY, "1");
  }, [introDone]);

  return (
    <>
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}
      <div className={introDone ? "" : "content-fade-in"}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/aktivitet/:slug" element={<ActivityGear />} />
              <Route path="/vedligeholdelse" element={<Maintenance />} />
              <Route path="/find" element={<FindEquipment />} />
              <Route path="/teambox" element={<TeamBox />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
