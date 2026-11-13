import { pressDismissesDetails } from "./dismissDetails";

const mount = () => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const button = document.createElement("button");
    const label = document.createTextNode("Light");
    button.append(label);
    const outside = document.createElement("a");
    details.append(summary, button);
    document.body.append(details, outside);
    return { details, summary, button, label, outside };
};

afterEach(() => {
    document.body.replaceChildren();
});

it("closes an open menu on a press outside it", () => {
    const { details, outside } = mount();
    details.open = true;
    expect(pressDismissesDetails(details, outside)).toBe(true);
    expect(pressDismissesDetails(details, document.body)).toBe(true);
    expect(pressDismissesDetails(details, null)).toBe(true);
});

it("leaves the menu alone for a press on its summary, a control, or text inside a control", () => {
    const { details, summary, button, label } = mount();
    details.open = true;
    expect(pressDismissesDetails(details, summary)).toBe(false);
    expect(pressDismissesDetails(details, button)).toBe(false);
    expect(pressDismissesDetails(details, label)).toBe(false);
});

it("does nothing while the menu is closed", () => {
    const { details, outside, button } = mount();
    details.open = false;
    expect(pressDismissesDetails(details, outside)).toBe(false);
    expect(pressDismissesDetails(details, button)).toBe(false);
    expect(pressDismissesDetails(details, null)).toBe(false);
});
