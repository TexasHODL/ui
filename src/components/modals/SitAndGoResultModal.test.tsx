import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SitAndGoResultModal } from "./SitAndGoResultModal";
import type { PlayerResultData } from "../../hooks/game/useSitAndGoPlayerResults";

const mockNavigate = jest.fn();
let mockPayoutStatus = "unclaimed";
const mockCheck = jest.fn();
jest.mock("../../context/CosmosApiContext", () => ({ useCosmosApi: jest.fn() }));
jest.mock("../../hooks/game/useSngPayoutStatus", () => ({
    ...jest.requireActual("../../hooks/game/useSngPayoutStatus"),
    useSngPayoutStatus: () => ({ status: mockPayoutStatus, check: mockCheck, retry: jest.fn() })
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
let mockResult: PlayerResultData | null;
let mockIsSitAndGo = true;
let mockResults: { place: number }[] = [];
const mockGetPlayerResult = () => mockResult;
jest.mock("../../hooks/game/useSitAndGoPlayerResults", () => ({
    useSitAndGoPlayerResults: () => ({
        getPlayerResult: () => mockGetPlayerResult(),
        isSitAndGo: mockIsSitAndGo,
        allResults: mockResults
    })
}));
const TABLE_ID = "0xabc";
const USER_ADDRESS = "b521user";
const dismissalKey = `viewed_sng_result_${TABLE_ID}_${USER_ADDRESS}`;
const result = (place: number, payout = "400000") => ({ place, payout, isWinner: place === 1 });
const show = (onClaim = jest.fn().mockResolvedValue(undefined)) =>
    render(<SitAndGoResultModal tableId={TABLE_ID} onClaim={onClaim} />);

beforeEach(() => {
    mockNavigate.mockReset();
    mockPayoutStatus = "unclaimed";
    mockCheck.mockReset().mockResolvedValue(false);
    localStorage.clear();
    localStorage.setItem("user_cosmos_address", USER_ADDRESS);
    mockIsSitAndGo = true;
    mockResult = result(3);
    mockResults = [];
});

test("opens the centred finishing-hand review immediately without review or NFT buttons", () => {
    show();
    expect(screen.getByRole("dialog", { name: "Tournament result" })).toHaveClass("sng-result-expanded");
    expect(screen.getByRole("img", { name: "Texas HODL" })).toBeInTheDocument();
    expect(screen.getByText(/finishing hand wasn’t captured/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /NFT/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Collect $0.40" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Spectate|Return to lobby/ })).toBeNull();
});

test.each([1, 2, 3, 4])("all paid positions offer Collect, including place %i", place => {
    mockResult = result(place);
    show();
    expect(screen.getByTestId("sng-result-payout")).toHaveTextContent("$0.40");
    expect(screen.getByRole("button", { name: "Collect $0.40" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /NFT/ })).toBeNull();
});

test("collects once, waits for success, then offers navigation without auto-redirecting", async () => {
    let complete!: () => void;
    const claim = jest.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    show(claim);
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    const busy = screen.getByRole("button", { name: "Collecting…" });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    await waitFor(() => expect(claim).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: /Spectate|Return to lobby/ })).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    await act(async () => { complete(); });
    expect(screen.getByRole("status")).toHaveTextContent("Your winnings have been collected.");
    expect(screen.queryByTestId("sng-result-claim-winnings-btn")).toBeNull();
    expect(screen.getByRole("button", { name: "Spectate table" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Return to lobby" })).toBeEnabled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem(dismissalKey)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Spectate table" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem(dismissalKey)).toBe("true");
});

test.each([1, 2])("place %i only offers Return to lobby after collection", async place => {
    mockResult = result(place);
    const claim = jest.fn().mockResolvedValue(undefined);
    show(claim);
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    await screen.findByRole("button", { name: "Return to lobby" });
    expect(screen.queryByRole("button", { name: "Spectate table" })).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Return to lobby" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(claim).toHaveBeenCalledTimes(1);
});

test("collection errors retain the review and allow retry, without exposing navigation", async () => {
    const claim = jest.fn().mockRejectedValueOnce(new Error("Collection failed")).mockResolvedValueOnce(undefined);
    show(claim);
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Collection failed");
    expect(screen.queryByRole("button", { name: /Spectate|Return to lobby/ })).toBeNull();
    expect(localStorage.getItem(dismissalKey)).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    await screen.findByRole("button", { name: "Return to lobby" });
    expect(claim).toHaveBeenCalledTimes(2);
});

test("retains the receipt when settlement removes the live player result", async () => {
    const claim = jest.fn().mockResolvedValue(undefined);
    const { rerender } = show(claim);
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    await screen.findByRole("status");
    mockResult = null;
    rerender(<SitAndGoResultModal tableId={TABLE_ID} onClaim={claim} />);
    expect(screen.getByRole("button", { name: "Return to lobby" })).toBeInTheDocument();
    expect(screen.getByTestId("sng-result-payout")).toHaveTextContent("$0.40");
});

test("keeps spectating available below second place even when a winner is recorded", async () => {
    const claim = jest.fn().mockResolvedValue(undefined);
    const { rerender } = show(claim);
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    await screen.findByRole("button", { name: "Spectate table" });
    mockResults = [{ place: 1 }];
    rerender(<SitAndGoResultModal tableId={TABLE_ID} onClaim={claim} />);
    expect(screen.getByRole("button", { name: "Spectate table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return to lobby" })).toBeInTheDocument();
});

test("a previously collected prize skips Collect and offers navigation", () => {
    mockPayoutStatus = "claimed";
    const claim = jest.fn();
    show(claim);
    expect(screen.queryByTestId("sng-result-claim-winnings-btn")).toBeNull();
    expect(screen.getByRole("button", { name: "Spectate table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return to lobby" })).toBeInTheDocument();
    expect(claim).not.toHaveBeenCalled();
});

test.each(["checking", "error"])("does not offer Collect when payout status is %s", status => {
    mockPayoutStatus = status;
    show();
    expect(screen.queryByTestId("sng-result-claim-winnings-btn")).toBeNull();
});

test("a claim from another tab found at preflight never submits again", async () => {
    mockCheck.mockResolvedValue(true);
    const claim = jest.fn();
    show(claim);
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    await screen.findByRole("button", { name: "Return to lobby" });
    expect(claim).not.toHaveBeenCalled();
});

test("the chain's precise already-claimed error becomes a collected receipt", async () => {
    show(jest.fn().mockRejectedValue(new Error("transaction failed: sit-and-go payout already claimed")));
    fireEvent.click(screen.getByRole("button", { name: "Collect $0.40" }));
    await screen.findByRole("button", { name: "Return to lobby" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByTestId("sng-result-claim-winnings-btn")).toBeNull();
});

test.each(["Spectate table", "Return to lobby"])("unpaid finishers can choose %s without any transaction", action => {
    mockResult = result(3, "0");
    const claim = jest.fn();
    show(claim);
    expect(screen.getByText("Thanks for playing.")).toBeInTheDocument();
    expect(screen.queryByTestId("sng-result-claim-winnings-btn")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: action }));
    expect(claim).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    if (action === "Return to lobby") expect(mockNavigate).toHaveBeenCalledWith("/");
    else expect(mockNavigate).not.toHaveBeenCalled();
});

test.each(["unfinished", "cash", "spectator", "dismissed"])("does not open for %s", state => {
    if (state === "unfinished") mockResult = null;
    if (state === "cash") mockIsSitAndGo = false;
    if (state === "spectator") localStorage.removeItem("user_cosmos_address");
    if (state === "dismissed") localStorage.setItem(dismissalKey, "true");
    show();
    expect(screen.queryByRole("dialog")).toBeNull();
});
