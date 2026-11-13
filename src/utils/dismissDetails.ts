/**
 * Whether a press should close a `<details>` menu.
 *
 * A closed menu stays closed. A press anywhere inside — the summary, a link,
 * a button, or the text inside one — belongs to the menu. Anything else,
 * including a press with no node (a click or tap off the menu), closes it.
 */
export function pressDismissesDetails(details: HTMLDetailsElement, target: EventTarget | null): boolean {
    if (!details.open) return false;
    return !(target instanceof Node && details.contains(target));
}
