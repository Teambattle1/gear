import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import GearChecklist from "./components/checklist/GearChecklist";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <GearChecklist />
      <Toaster theme="dark" position="top-center" richColors />
    </BrowserRouter>
  </React.StrictMode>,
);
