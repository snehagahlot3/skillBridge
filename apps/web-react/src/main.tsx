import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AiProvider } from "./context/AiContext";
import AiWidget from "./components/AiWidget";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AiProvider>
          <App />
          <AiWidget />
        </AiProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);