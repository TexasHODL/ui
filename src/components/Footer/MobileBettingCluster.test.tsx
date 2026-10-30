
import { fireEvent, render, screen } from "@testing-library/react";
import { PlayerStatus, TexasHoldemRound } from "@block52/poker-vm-sdk";
import { MobileBettingCluster } from "./MobileBettingCluster";
import type { MainActionButtonsProps, RaiseBetControlsProps } from "./types";

jest.mock("../common", () => ({
    LoadingSpinner: () => null
}));

const actions: MainActionButtonsProps = {
    canFold: true,
    canCheck: false,
    canCall: true,
    callAmount: "110",
    canBet: false,
    canRaise: true,
    raiseAmount: 600,
    isRaiseAmountInvalid: false,
    playerStatus: PlayerStatus.ACTIVE,
    loading: null,
    isMobileLandscape: false,
    currentRound: TexasHoldemRound.FLOP,
    previousActions: [],
    userAddress: "fixture",
    isAllIn: false,
    isTournament: true,
    callIsAllIn: false,
    canAllIn: false,
    allInAmount: "1330",
    onFold: jest.fn(),
    onCheck: jest.fn(),
    onCall: jest.fn(),
    onBetOrRaise: jest.fn(),
    onAllIn: jest.fn()
};

const sizing: RaiseBetControlsProps = {
    amount: 600,
    minAmount: 20,
    maxAmount: 1330,
    formattedMaxAmount: "1,330",
    displayOffset: 0,
    totalPotMicro: 400n,
    callAmountMicro: 0n,
    isInvalid: false,
    isMobileLandscape: false,
    isTournament: true,
    currentRound: TexasHoldemRound.FLOP,
    previousActions: [],
    disabled: false,
    onAmountChange: jest.fn(),
    onIncrement: jest.fn(),
    onDecrement: jest.fn(),
    onAllIn: jest.fn(),
    maxIsAllIn: true,
    allowBlindMultiples: true
};

describe("MobileBettingCluster", () => {
    it("stacks portrait actions with the preset row and a slider anchored on raise", () => {
        const onBetOrRaise = jest.fn();
        render(
            <MobileBettingCluster
                presentation="portrait"
                leftHand={false}
                showSizing
                actions={{ ...actions, onBetOrRaise }}
                sizing={sizing}
            />
        );
        const cluster = screen.getByTestId("mobile-bet-cluster");
        expect(cluster).toHaveAttribute("data-presentation", "portrait");
        expect(screen.getByRole("button", { name: "Fold" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Call/ })).toBeInTheDocument();
        expect(screen.getByRole("slider", { name: "Bet amount" }).parentElement).toHaveClass("portrait-raise-slider");
        fireEvent.click(screen.getByRole("button", { name: /^Raise to/ }));
        expect(onBetOrRaise).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("button", { name: "Min" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "1/4 Pot" })).not.toBeInTheDocument();
    });

    it("puts landscape presets on the screen edge and mirrors them for the left hand", () => {
        const { rerender } = render(
            <MobileBettingCluster presentation="landscape" leftHand={false} showSizing actions={actions} sizing={sizing} />
        );
        const cluster = screen.getByTestId("mobile-bet-cluster");
        expect(cluster).toHaveClass("mobile-bet-landscape");
        expect(cluster).not.toHaveClass("hand-left");
        expect(cluster.querySelector(".mobile-bet-sizing")).not.toBeNull();
        rerender(<MobileBettingCluster presentation="landscape" leftHand showSizing actions={actions} sizing={sizing} />);
        expect(screen.getByTestId("mobile-bet-cluster")).toHaveClass("hand-left");
        expect(screen.getByTestId("mobile-bet-cluster")).toHaveAttribute("data-hand", "left");
    });
});
