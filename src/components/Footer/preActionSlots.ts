import { PreAction } from "../../utils/preActions";

/**
 * Pre-action slot mapping shared by mobile landscape (the bottom-up action column)
 * and desktop (the left-to-right action row): index 0 FOLD, 1 CHECK, 2 CALL, 3 RAISE (always empty). null = empty slot.
 *  - owing a bet: Fold on FOLD, Call Any on CHECK (free, checking is impossible), Call $x on CALL
 *  - all-in call: Fold on FOLD, All In on CALL
 *  - free check: Check on FOLD (folding is never needed), Check/Fold on CHECK, Call Any on CALL
 *  - lone Check/Fold: on CHECK
 */
export function preActionSlots(buttons: PreAction[]): (PreAction | null)[] {
    const has = (a: PreAction) => buttons.includes(a);
    const slots: (PreAction | null)[] = [null, null, null, null];
    if (has("fold")) slots[0] = "fold";
    if (has("check-fold")) {
        slots[1] = "check-fold";
        if (has("check")) slots[0] = "check";
    } else if (has("check")) {
        slots[1] = "check";
    }
    if (has("call-exact")) {
        slots[2] = "call-exact";
        if (has("call-any")) slots[1] = "call-any";
    } else if (has("all-in")) {
        slots[2] = "all-in";
    } else if (has("call-any")) {
        slots[2] = "call-any";
    }
    return slots;
}