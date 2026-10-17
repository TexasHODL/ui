
import { render, screen } from "@testing-library/react";
import { FinishingHandRecap } from "./FinishingHandRecap";
import type { FinishingHand } from "../../utils/finishingHand";

jest.mock("../../utils/cardImages", () => ({ getCardImageUrl: (code: string) => `/cards/${code}.svg` }));

const hand: FinishingHand = {
    handNumber: 27, board: ["AS", "KD", "AD", "10H", "6D"],
    players: [
        { seat: 1, cards: [], description: "Cards not shown", won: null },
        { seat: 2, cards: ["5S", "KH"], description: "Two Pair, As and Ks", won: "2400" }
    ]
};

test("uses the table card artwork, normalizes tens, and preserves board order", () => {
    const { container } = render(<FinishingHandRecap hand={hand} />);
    const board = container.querySelectorAll(".finish-board-cards img");
    expect(Array.from(board, card => card.getAttribute("src"))).toEqual([
        "/cards/AS.svg", "/cards/KD.svg", "/cards/AD.svg", "/cards/TH.svg", "/cards/6D.svg"
    ]);
    expect(screen.getByRole("img", { name: /10 of hearts/ })).toHaveClass("finish-card-winning");
    expect(screen.getByRole("img", { name: /Ace of spades/ })).toHaveClass("finish-card-winning");
    expect(screen.getByRole("img", { name: "6 of diamonds" })).toHaveClass("finish-card-muted");
});

test("fans revealed hole cards without rendering hidden cards or changing the result", () => {
    const { container } = render(<FinishingHandRecap hand={hand} />);
    expect(container.querySelectorAll(".hole-card-fan")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "5 of spades" }).parentElement).toHaveClass("hole-card-fan-slot");
    expect(screen.getByRole("img", { name: /King of hearts/ }).parentElement).toHaveClass("hole-card-fan-slot");
    expect(screen.getAllByRole("img")).toHaveLength(7);
    expect(screen.getByText("Cards not shown")).toBeInTheDocument();
    expect(screen.getByText("Won 2,400 chips")).toBeInTheDocument();
    expect(screen.getByText("Two Pair, As and Ks")).toBeInTheDocument();
});

test("missing snapshots and undealt boards do not invent any cards", () => {
    const { rerender } = render(<FinishingHandRecap hand={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    rerender(<FinishingHandRecap hand={{ ...hand, board: [], players: [] }} />);
    expect(screen.getByText("No community cards dealt.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
});
