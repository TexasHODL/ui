import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { MobileActionDock } from "./MobileActionDock";

it("overlays portrait actions without reserving table height", () => {
    render(<MobileActionDock mode="overlay"><div>Fold</div></MobileActionDock>);
    const slot = screen.getByTestId("mobile-action-slot");
    expect(slot).toHaveAttribute("data-mode", "overlay");
    expect(slot).not.toHaveAttribute("style");
    expect(screen.getByText("Fold")).toBeInTheDocument();
});

it("keeps the landscape column host mounted across mode changes", () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Actions() {
        useEffect(() => {
            mounted();
            return unmounted;
        }, []);
        return <div>Actions</div>;
    }
    const { rerender } = render(<MobileActionDock mode="overlay"><Actions /></MobileActionDock>);
    rerender(<MobileActionDock mode="column"><Actions /></MobileActionDock>);
    expect(screen.getByTestId("mobile-action-slot")).toHaveAttribute("data-mode", "column");
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
});
