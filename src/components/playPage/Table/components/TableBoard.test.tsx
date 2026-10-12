import React from "react";
import { render, screen } from "@testing-library/react";
import { TableBoard } from "./TableBoard";
import type { PotDisplayValues } from "../../../../utils/potDisplayUtils";
import type { CardBackStyle } from "../../../../utils/cardImages";

jest.mock("../../../../hooks/animations/useCardAnimations", () => ({ useCardAnimations: () => ({ revealedSlots: [true, true, true, true, true] }) }));
jest.mock("../../../../utils/cardImages", () => ({ getCardImageUrl: (card: string) => `/cards/${card}.svg`, getCardBackUrl: () => "/back.svg" }));
jest.mock("./TotalPotDisplay", () => ({ TotalPotDisplay: () => <div>Total pot</div> }));
jest.mock("./MainPotDisplay", () => ({ MainPotDisplay: () => <div>Main pot</div> }));

const props = {
    clubLogo: "/logo.png",
    potDisplayValues: { showTotalPot: true, showMainPot: true, totalPot: "576", mainPot: "500", isTournamentStyle: true } as PotDisplayValues,
    communityCards: ["QD", "8S", "TH", "2C", "QC"],
    isSitAndGoWaitingForPlayers: false,
    cardBackStyle: "classic" as CardBackStyle,
    winnerCards: new Set(["QD", "QC"])
};
test("four-seat portrait uses the clear upper board without changing cards or pot content", () => {
    const { container } = render(<TableBoard {...props} isPortrait tableSize={4} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'true');
    expect(screen.getAllByAltText('Card Front')).toHaveLength(5);
    expect(container.querySelectorAll('.animate-win-card')).toHaveLength(2);
    expect(screen.getByText('Total pot')).toBeInTheDocument();
    expect(screen.getByText('Main pot')).toBeInTheDocument();
});
test.each([2, 6, 9])("%i-seat portrait keeps its centred board", tableSize => {
    const { container } = render(<TableBoard {...props} isPortrait tableSize={tableSize} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'false');
});
test("four-seat landscape keeps the centred board, and empty slots keep the same layout", () => {
    const { container, rerender } = render(<TableBoard {...props} tableSize={4} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'false');
    rerender(<TableBoard {...props} isPortrait tableSize={4} communityCards={[]} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'true');
    expect(container.querySelector('.community-card-row')?.children).toHaveLength(5);
});
