import { Link, useLocation } from "react-router-dom";
import { PageHeading } from "../common/PageHeading";

interface ExplorerHeaderProps {
    title?: string;
}

const sections = [
    { href: "/explorer", label: "Latest blocks", description: "Explore recent activity on the poker network." },
    { href: "/explorer/accounts", label: "Accounts", description: "Browse network accounts and balances." },
    { href: "/explorer/address", label: "Address lookup", description: "Find an address and inspect its activity." },
    { href: "/explorer/distribution", label: "Hand distribution", description: "Explore recorded card frequencies and distribution statistics." }
];

export const ExplorerHeader = ({ title = "Block explorer" }: ExplorerHeaderProps) => {
    const { pathname } = useLocation();
    const section = sections.find(item => item.href === pathname);
    const explorer = pathname.startsWith("/explorer");
    const hands = pathname === "/hands";
    const players = pathname.startsWith("/players");
    const nodes = pathname === "/nodes" || pathname.startsWith("/node/");
    const description = hands
        ? "Your played hands, results and replays. All in one place."
        : players
          ? "Explore player profiles, results and hand history."
          : nodes
            ? "Check network health, connections and node details."
            : section?.description;
    return (
        <>
            <PageHeading
                title={hands ? "My hands" : section?.label || title}
                eyebrow={hands ? "YOUR GAME" : nodes ? "THE NETWORK" : "EXPLORE"}
                description={description}
                backTo={pathname.startsWith("/players/") ? "/players" : pathname.startsWith("/node/") ? "/nodes" : "/"}
                backLabel={pathname.startsWith("/players/") ? "Players" : pathname.startsWith("/node/") ? "Network nodes" : "Lobby"}
            />
            {explorer && (
                <nav className="page-section-tabs" aria-label="Explorer sections">
                    {sections.map(item => (
                        <Link
                            key={item.href}
                            to={item.href}
                            aria-current={
                                pathname === item.href || (item.href === "/explorer/address" && pathname.startsWith(item.href + "/")) ? "page" : undefined
                            }
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            )}
        </>
    );
};
export default ExplorerHeader;
