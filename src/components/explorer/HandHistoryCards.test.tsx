import { render, screen } from "@testing-library/react";
import { HandHistoryCards } from "./HandHistoryCards";
import type { HistorySeatCards } from "../../utils/handHistoryCards";

const seats: HistorySeatCards[] = [
    { seat: 1, address: "hero", cards: ["qh", "qd"], yours: true },
    { seat: 2, address: "shown", cards: ["AS", "AD"], yours: false },
    { seat: 3, address: "allin", cards: ["KS", "KC"], yours: false }
];

describe("HandHistoryCards", () => {
    it("labels the viewer's seat and draws every revealed hand", () => {
        render(<HandHistoryCards seats={seats} />);
        expect(screen.getByLabelText("Your Cards")).toHaveTextContent("Your Cards");
        expect(screen.getByLabelText("Your Cards")).toHaveTextContent("Seat 1");
        expect(screen.getByAltText("QH")).toBeInTheDocument();
        expect(screen.getByAltText("AS")).toBeInTheDocument();
        expect(screen.getByAltText("KS")).toBeInTheDocument();
        expect(screen.queryByAltText("QS")).not.toBeInTheDocument();
    });

    it("renders nothing when no hole cards were revealed", () => {
        const { container } = render(<HandHistoryCards seats={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
