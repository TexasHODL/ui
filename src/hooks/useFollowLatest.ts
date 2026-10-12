import { useLayoutEffect, useRef } from "react";

/** Follow incoming rows unless the reader deliberately scrolls up. */
export const useFollowLatest = (changeKey: string) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (element && following.current) element.scrollTop = element.scrollHeight;
    }, [changeKey]);
    const onScroll = () => {
        const element = scrollRef.current;
        if (element) following.current = element.scrollHeight - element.clientHeight - element.scrollTop < 24;
    };
    return { scrollRef, onScroll };
};
