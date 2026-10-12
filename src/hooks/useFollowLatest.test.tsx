import { fireEvent, render, screen } from "@testing-library/react";
import { useFollowLatest } from "./useFollowLatest";

function Log({ changeKey }: { changeKey: string }) {
    const { scrollRef, onScroll } = useFollowLatest(changeKey);
    return <div ref={scrollRef} onScroll={onScroll} data-testid="log" />;
}

test("follows new actions, pauses when reading older rows, and resumes at the bottom", () => {
    const { rerender } = render(<Log changeKey="1" />);
    const element = screen.getByTestId("log");
    Object.defineProperty(element, "scrollHeight", { configurable: true, value: 600 });
    Object.defineProperty(element, "clientHeight", { configurable: true, value: 100 });
    rerender(<Log changeKey="2" />);
    expect(element.scrollTop).toBe(600);
    element.scrollTop = 100;
    fireEvent.scroll(element);
    rerender(<Log changeKey="3" />);
    expect(element.scrollTop).toBe(100);
    element.scrollTop = 500;
    fireEvent.scroll(element);
    Object.defineProperty(element, "scrollHeight", { configurable: true, value: 700 });
    rerender(<Log changeKey="4" />);
    expect(element.scrollTop).toBe(700);
});
