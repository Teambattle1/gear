import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Intro from "./components/Intro";
import Landing from "./pages/Landing";
import ActivityGear from "./pages/ActivityGear";
import Maintenance from "./pages/Maintenance";
import FindEquipment from "./pages/FindEquipment";

const INTRO_KEY = "gear_intro_seen";

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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/aktivitet/:slug" element={<ActivityGear />} />
          <Route path="/vedligeholdelse" element={<Maintenance />} />
          <Route path="/find" element={<FindEquipment />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </div>
    </>
  );
}
