import { createContext, FC, ReactNode, useContext, useMemo } from "react";
import { PaymentApi } from "../apis/Api";
import { PROXY_URL } from "../config/constants";

const PaymentApiContext = createContext<PaymentApi | null>(null);

export const PaymentApiProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const api = useMemo(
        () => new PaymentApi({ baseUrl: PROXY_URL!, secure: true, timeout: 5000 }),
        []
    );

    return <PaymentApiContext.Provider value={api}>{children}</PaymentApiContext.Provider>;
};

export const usePaymentApi = (): PaymentApi => {
    const context = useContext(PaymentApiContext);
    if (!context) {
        throw new Error("usePaymentApi must be used within a PaymentApiProvider");
    }
    return context;
};
