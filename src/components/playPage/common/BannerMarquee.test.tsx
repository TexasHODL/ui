import { render } from "@testing-library/react";
import { BannerMarquee } from "./BannerMarquee";

const setWidths = (containerWidth: number, itemWidth: number) => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        get() {
            return (this as HTMLElement).classList.contains("seat-banner-marquee")
                ? containerWidth
                : itemWidth;
        }
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
        configurable: true,
        get() {
            return (this as HTMLElement).classList.contains("seat-banner-marquee-item")
                ? itemWidth
                : containerWidth;
        }
    });
};

const cleanupWidths = () => {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
};

describe("BannerMarquee", () => {
    afterEach(() => cleanupWidths());

    it("stays static and has no duplicate when the text fits", () => {
        setWidths(120, 80);
        const { container } = render(<BannerMarquee>FOLD</BannerMarquee>);
        const root = container.querySelector(".seat-banner-marquee");
        expect(root).toHaveAttribute("data-overflow", "false");
        expect(container.querySelectorAll(".seat-banner-marquee-item")).toHaveLength(1);
        expect(container.querySelector("[aria-hidden='true']")).toBeNull();
    });

    it("duplicates the line so an overflowing label can loop", () => {
        setWidths(80, 200);
        const { container } = render(<BannerMarquee>RAISE TO $1250.00</BannerMarquee>);
        const root = container.querySelector(".seat-banner-marquee");
        expect(root).toHaveAttribute("data-overflow", "true");
        const items = container.querySelectorAll(".seat-banner-marquee-item");
        expect(items).toHaveLength(2);
        expect(items[1]).toHaveAttribute("aria-hidden", "true");
        expect(items[0]).toHaveTextContent("RAISE TO $1250.00");
        expect(items[1]).toHaveTextContent("RAISE TO $1250.00");
    });
});
