import { createContext, FC, ReactNode, useContext } from "react";
import Api from "../apis/Api";
import { PROXY_URL } from "../config/constants";

const ApiContext = createContext<Api>(null as any);

export const ApiProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const api = new Api(PROXY_URL!, true);

    return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApi = (): Api => {
    return useContext(ApiContext);
};
