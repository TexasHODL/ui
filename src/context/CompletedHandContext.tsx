import { createContext, useContext } from "react";
import type { CompletedHandView } from "../utils/completedHandCelebration";

/**
 * What the table should paint for a completed hand. `null` (no provider) means
 * the snapshot is shown as it arrived — unit tests and surfaces outside the table.
 */
const CompletedHandContext = createContext<CompletedHandView | null>(null);

export const CompletedHandProvider = CompletedHandContext.Provider;

export const useCompletedHandView = (): CompletedHandView | null => useContext(CompletedHandContext);
