import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfileIdentity } from "./ProfileIdentity";

const ADDRESS = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";

jest.mock("./ProfileHeaderAvatar", () => ({
    ProfileHeaderAvatar: ({ address }: { address: string }) => <span data-testid="player-avatar" data-address={address} />
}));

describe("ProfileIdentity", () => {
    const writeText = jest.fn();

    beforeEach(() => {
        writeText.mockReset();
        writeText.mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    });

    it("shows the full address for copy and keeps the avatar", () => {
        render(<ProfileIdentity address={ADDRESS} />);
        expect(screen.getByText(ADDRESS)).toHaveAttribute("title", ADDRESS);
        expect(screen.getByTestId("player-avatar")).toHaveAttribute("data-address", ADDRESS);
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    });

    it("copies the full address", async () => {
        render(<ProfileIdentity address={ADDRESS} />);
        fireEvent.click(screen.getByRole("button", { name: "Copy" }));
        await waitFor(() => expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument());
        expect(writeText).toHaveBeenCalledWith(ADDRESS);
    });

    it("leaves the button unchanged when the clipboard rejects", async () => {
        writeText.mockRejectedValueOnce(new Error("denied"));
        const error = jest.spyOn(console, "error").mockImplementation(() => {});
        render(<ProfileIdentity address={ADDRESS} />);
        fireEvent.click(screen.getByRole("button", { name: "Copy" }));
        await waitFor(() => expect(error).toHaveBeenCalled());
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
        error.mockRestore();
    });
});
