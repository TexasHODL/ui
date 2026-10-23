import React from "react";
import CustomDealer from "../../../assets/CustomDealer.svg";
import { useDealerImageUrl } from "../../../theme/useTableStyles";

/**
 * Dealer button art in the style chosen in Settings > Dealer button.
 * SVG styles A–D share CustomDealer.svg's 171×215.25 viewBox so existing
 * sizing CSS fits them; Marble (E) is a square webp that object-fits the
 * same box.
 */
const DealerButtonImage: React.FC = () => {
    const src = useDealerImageUrl(CustomDealer);
    return <img src={src} alt="Dealer Button" />;
};

export default DealerButtonImage;
