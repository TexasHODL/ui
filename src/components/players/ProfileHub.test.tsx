import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { STORAGE_COSMOS_ADDRESS } from "../../utils/cosmos/storage";
import { ProfileHub } from "./ProfileHub";

const ME = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const THEM = "b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93";

let mockAddress: string | null = null;
jest.mock("../../hooks/wallet/useCosmosWallet", () => ({
    __esModule: true,
    useCosmosWallet: () => ({ address: mockAddress }),
    default: () => ({ address: mockAddress })
}));

const renderHub = (profileAddress: string | undefined, path = "/") =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <ProfileHub profileAddress={profileAddress} />
        </MemoryRouter>
    );

const sections = () => screen.getByRole("navigation", { name: "Profile sections" });

describe("ProfileHub", () => {
    beforeEach(() => {
        mockAddress = null;
        localStorage.clear();
    });

    it("shows My Hands, Wallet and Stats on your own profile", () => {
        mockAddress = ME;
        renderHub(ME);
        const nav = sections();
        expect(within(nav).getByRole("link", { name: "My Hands" })).toHaveAttribute("href", `/players/${ME}?tab=hands`);
        expect(within(nav).getByRole("link", { name: "Wallet" })).toHaveAttribute("href", `/players/${ME}?tab=wallet`);
        expect(within(nav).getByRole("link", { name: "Stats" })).toHaveAttribute("href", `/players/${ME}`);
        expect(within(nav).getByRole("link", { name: "Stats" })).toHaveAttribute("aria-current", "page");
        expect(within(nav).getByRole("link", { name: "My Hands" })).not.toHaveAttribute("aria-current");
    });

    it("marks the tab named in the url and keeps the other sections on this page", () => {
        mockAddress = ME;
        renderHub(ME, `/players/${ME}?tab=hands`);
        const nav = sections();
        expect(within(nav).getByRole("link", { name: "My Hands" })).toHaveAttribute("aria-current", "page");
        expect(within(nav).getByRole("link", { name: "Wallet" })).not.toHaveAttribute("aria-current");
        expect(within(nav).getByRole("link", { name: "Stats" })).not.toHaveAttribute("aria-current");
        renderHub(ME, `/players/${ME}?tab=wallet`);
        const walletNav = screen.getAllByRole("navigation", { name: "Profile sections" })[1];
        expect(within(walletNav).getByRole("link", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
    });

    it("treats a different-cased wallet address as your own profile", () => {
        mockAddress = ME.toUpperCase();
        renderHub(ME);
        expect(within(sections()).getByRole("link", { name: "My Hands" })).toBeInTheDocument();
    });

    it("shows only Stats on someone else's profile", () => {
        mockAddress = ME;
        renderHub(THEM);
        const nav = sections();
        expect(within(nav).getByRole("link", { name: "Stats" })).toHaveAttribute("href", `/players/${THEM}`);
        expect(within(nav).getByRole("link", { name: "Stats" })).toHaveAttribute("aria-current", "page");
        expect(within(nav).queryByRole("link", { name: "My Hands" })).not.toBeInTheDocument();
        expect(within(nav).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
    });

    it("shows only Stats when no wallet is connected", () => {
        renderHub(ME);
        const nav = sections();
        expect(within(nav).getByRole("link", { name: "Stats" })).toBeInTheDocument();
        expect(within(nav).queryByRole("link", { name: "My Hands" })).not.toBeInTheDocument();
        expect(within(nav).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
    });

    it("uses a stored address before the wallet hook has derived one", () => {
        localStorage.setItem(STORAGE_COSMOS_ADDRESS, ME);
        renderHub(ME);
        expect(within(sections()).getByRole("link", { name: "My Hands" })).toHaveAttribute("href", `/players/${ME}?tab=hands`);
    });

    it("renders nothing when the profile route has no address", () => {
        mockAddress = ME;
        renderHub(undefined);
        expect(screen.queryByRole("navigation", { name: "Profile sections" })).not.toBeInTheDocument();
    });
});
