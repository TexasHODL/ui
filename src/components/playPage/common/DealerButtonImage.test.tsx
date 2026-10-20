import { act, render, screen } from "@testing-library/react";
import DealerButtonImage from "./DealerButtonImage";
import { resetTableStylesForTests, setTableStyle } from "../../../theme/tableStyles";

describe("DealerButtonImage", () => {
    beforeEach(() => {
        localStorage.clear();
        resetTableStylesForTests();
    });

    it("draws the Clean minimal button by default and switches live", () => {
        render(<DealerButtonImage />);
        expect(screen.getByAltText("Dealer Button")).toHaveAttribute("src", "/assets/dealerstyles/C.svg");
        act(() => setTableStyle("dealer", "B"));
        expect(screen.getByAltText("Dealer Button")).toHaveAttribute("src", "/assets/dealerstyles/B.svg");
        // Current = the existing CustomDealer.svg art (file stub in Jest).
        act(() => setTableStyle("dealer", "current"));
        expect(screen.getByAltText("Dealer Button")).toHaveAttribute("src", "test-file-stub");
    });
});
