import { useEffect } from "react";

interface MetadataProps {
    title?: string;
    description?: string;
    image?: string;
}

const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
};

const removeMeta = (name: string, attr: "name" | "property" = "name") => {
    const el = document.querySelector(`meta[${attr}="${name}"]`);
    if (el) el.remove();
};

/**
 * Injects Twitter Card and Open Graph meta tags into <head> for social sharing.
 * Renders nothing visible — place once per page near the route root.
 *
 * @example
 * <Metadata
 *   title="Block 52 Poker"
 *   description="Play on-chain poker powered by the Poker VM."
 *   image="https://example.com/preview.png"
 * />
 */
const Metadata: React.FC<MetadataProps> = ({
    title = "Block 52 Poker",
    description = "Play on-chain poker powered by the Poker VM.",
    image = "https://raw.githubusercontent.com/block52/cards/refs/heads/main/assets/logo-rectangle-color.jpeg"
}) => {
    useEffect(() => {
        const prev = document.title;
        document.title = title;

        setMeta("description", description);

        // Twitter Card
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", title);
        setMeta("twitter:description", description);
        setMeta("twitter:image", image);

        // Open Graph
        setMeta("og:type", "website", "property");
        setMeta("og:title", title, "property");
        setMeta("og:description", description, "property");
        setMeta("og:image", image, "property");

        return () => {
            document.title = prev;
            removeMeta("twitter:card");
            removeMeta("twitter:title");
            removeMeta("twitter:description");
            removeMeta("twitter:image");
            removeMeta("og:type", "property");
            removeMeta("og:title", "property");
            removeMeta("og:description", "property");
            removeMeta("og:image", "property");
        };
    }, [title, description, image]);

    return null;
};

Metadata.displayName = "Metadata";

export { Metadata };
export default Metadata;
