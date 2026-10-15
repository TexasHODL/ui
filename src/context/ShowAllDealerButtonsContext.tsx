import { createContext, useContext, type ReactNode } from "react";

/**
 * Preview-only override. Live tables show the dealer button on the one seat
 * the chain names. The table preview sets this so every occupied seat draws
 * the same badge-anchored button.
 */
const ShowAllDealerButtonsContext = createContext(false);

export const ShowAllDealerButtonsProvider = ({
    enabled,
    children
}: {
    enabled: boolean;
    children: ReactNode;
}) => (
    <ShowAllDealerButtonsContext.Provider value={enabled}>
        {children}
    </ShowAllDealerButtonsContext.Provider>
);

export const useShowAllDealerButtons = (): boolean => useContext(ShowAllDealerButtonsContext);
