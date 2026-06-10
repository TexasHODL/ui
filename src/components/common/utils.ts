import { truncateMiddle } from "../../utils/stringUtils";

// Add function to format address
export const formatAddress = (address: string | undefined) => {
    return truncateMiddle(address, 6, 4);
};
