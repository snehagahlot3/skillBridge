import { createContext, useContext, useState, type ReactNode } from "react";

interface AiContextValue {
  job: { id: string; title: string; myRole?: string | null } | null;
  setJob: (job: { id: string; title: string; myRole?: string | null } | null) => void;
}

const AiContext = createContext<AiContextValue | null>(null);

export function AiProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<{ id: string; title: string; myRole?: string | null } | null>(null);
  return <AiContext.Provider value={{ job, setJob }}>{children}</AiContext.Provider>;
}

export function useAiContext() {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAiContext must be used within AiProvider");
  return ctx;
}