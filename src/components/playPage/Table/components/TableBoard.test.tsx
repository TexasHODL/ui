import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

test.each(["modern", "classic"] as const)("%s table displays the approved SVG", tableTheme => {
    render(<TableBoard {...props} clubLogo="/texas-hodl-logo-sharp.svg" tableTheme={tableTheme} />);
    expect(screen.getByAltText("Texas HODL")).toHaveAttribute("src", "/texas-hodl-logo-sharp.svg");
});

test("a failed custom table logo falls back to the approved SVG without retrying it", () => {
    render(<TableBoard {...props} />);
    const logo = screen.getByAltText("Texas HODL");
    fireEvent.error(logo);
    expect(logo).toHaveAttribute("src", "/texas-hodl-logo-sharp.svg");
    const setSource = jest.spyOn(HTMLImageElement.prototype, "src", "set");
    fireEvent.error(logo);
    expect(setSource).not.toHaveBeenCalled();
    setSource.mockRestore();
});

test("the nouns theme retains its own artwork", () => {
    render(<TableBoard {...props} tableTheme="nouns" />);
    expect(screen.queryByAltText("Texas HODL")).not.toBeInTheDocument();
});
test("four-seat portrait uses the clear upper board without changing cards or pot content", () => {
    const { container } = render(<TableBoard {...props} isPortrait tableSize={4} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'true');
    expect(screen.getAllByAltText('Card Front')).toHaveLength(5);
    expect(container.querySelectorAll('.animate-win-card')).toHaveLength(2);
    expect(screen.getByText('Total pot')).toBeInTheDocument();
    expect(screen.getByText('Main pot')).toBeInTheDocument();
});
test.each([2, 6, 9])("%i-seat portrait selects its own board placement", tableSize => {
    const { container } = render(<TableBoard {...props} isPortrait tableSize={tableSize} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'false');
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-seats', String(tableSize));
    expect(container.querySelector('.community-pots')).toContainElement(screen.getByText('Main pot'));
});
test("four-seat landscape keeps the centred board, and empty slots keep the same layout", () => {
    const { container, rerender } = render(<TableBoard {...props} tableSize={4} />);
    expect(container.querySelector('.community-board')).not.toHaveAttribute('data-portrait-seats');
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'false');
    rerender(<TableBoard {...props} isPortrait tableSize={4} communityCards={[]} />);
    expect(container.querySelector('.community-board')).toHaveAttribute('data-portrait-four', 'true');
    expect(container.querySelector('.community-card-row')?.children).toHaveLength(5);
});
