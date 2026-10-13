import { useEffect } from "react";
import { TEXAS_HODL_FAVICON } from "../constants/branding";


function applyFavicon(url: string) {
    const links = document.querySelectorAll("link[rel*=\"icon\"]");
    links.forEach((link) => {
        (link as HTMLLinkElement).href = url;
    });

    const appleTouchIcon = document.querySelector("link[rel=\"apple-touch-icon\"]") as HTMLLinkElement;
    if (appleTouchIcon) appleTouchIcon.href = url;

    const maskIcon = document.querySelector("link[rel=\"mask-icon\"]") as HTMLLinkElement;
    if (maskIcon) maskIcon.href = url;
}

/**
 * Sets the document title and repository-owned card-fan favicon.
 */
const FaviconSetter: React.FC = () => {
    useEffect(() => {
        const appTitle = import.meta.env.VITE_APP_TITLE || "Texas HODL";
        document.title = appTitle;

        applyFavicon(TEXAS_HODL_FAVICON);
    }, []);

    return null;
};

export default FaviconSetter;
