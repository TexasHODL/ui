import React from "react";
import CustomDealer from "../../../assets/CustomDealer.svg";
import { useDealerImageUrl } from "../../../theme/useTableStyles";

/**
 * Dealer button art in the style chosen in Settings > Dealer button. Every
 * style shares CustomDealer.svg's 171×215.25 viewBox, so the existing sizing
 * CSS fits them all.
 */
const DealerButtonImage: React.FC = () => {
    const src = useDealerImageUrl(CustomDealer);
    return <img src={src} alt="Dealer Button" />;
};

export default DealerButtonImage;
