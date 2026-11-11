import {
    LOBBY_MODAL_CHROME_PX,
    TABLE_BANNER_END_VAR,
    TABLE_MODAL_GAP_PX,
    clearTableBannerEnd,
    modalAvailableHeight,
    publishTableBannerEnd,
    readTableBannerEndPx,
    tableBannerEndPx
} from "./tableModalClearance";

describe("table modal clearance", () => {
    afterEach(() => {
        clearTableBannerEnd();
    });

    it("ceils the banner's bottom edge so the dialog cannot start above it", () => {
        expect(tableBannerEndPx(118.2)).toBe("119px");
        expect(tableBannerEndPx(44)).toBe("44px");
        expect(tableBannerEndPx(0)).toBe("0px");
    });

    it("reads a published banner end and treats an empty or junk value as no banner", () => {
        expect(readTableBannerEndPx("")).toBe(0);
        expect(readTableBannerEndPx("  ")).toBe(0);
        expect(readTableBannerEndPx("auto")).toBe(0);
        expect(readTableBannerEndPx("0px")).toBe(0);
        expect(readTableBannerEndPx("-4px")).toBe(0);
        expect(readTableBannerEndPx("118px")).toBe(118);
        expect(readTableBannerEndPx("118.5px")).toBe(118.5);
    });

    it("publishes the banner end on the document and clears it when the table goes away", () => {
        publishTableBannerEnd("132px");
        expect(document.documentElement.style.getPropertyValue(TABLE_BANNER_END_VAR)).toBe("132px");
        expect(readTableBannerEndPx(getComputedStyle(document.documentElement).getPropertyValue(TABLE_BANNER_END_VAR))).toBe(132);
        clearTableBannerEnd();
        expect(document.documentElement.style.getPropertyValue(TABLE_BANNER_END_VAR)).toBe("");
    });

    it("keeps the lobby phone-fit margin when no table banner is measured", () => {
        expect(modalAvailableHeight(800, 0)).toBe(800 - LOBBY_MODAL_CHROME_PX);
    });

    it("fits a table dialog in the space under the banners, with a gap above and below", () => {
        expect(modalAvailableHeight(540, 120)).toBe(540 - 120 - TABLE_MODAL_GAP_PX * 2);
        expect(modalAvailableHeight(844, 66)).toBe(844 - 66 - 24);
    });

    it("never reports a zero or negative height", () => {
        expect(modalAvailableHeight(20, 80)).toBe(1);
    });
});