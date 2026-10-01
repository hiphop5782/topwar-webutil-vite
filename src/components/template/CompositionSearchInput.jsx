import { useEffect, useRef, useState } from "react";

// Keep IME composition local: router updates must not restore an older input value.
export default function CompositionSearchInput({ value, onValueChange, ...props }) {
    const [draft, setDraft] = useState(value);
    const composing = useRef(false);
    const published = useRef(value);

    useEffect(() => {
        published.current = value;
        if (!composing.current) setDraft(value);
    }, [value]);

    const publish = (nextValue) => {
        if (nextValue === published.current) return;
        published.current = nextValue;
        onValueChange(nextValue);
    };

    return (
        <input
            {...props}
            value={draft}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={(event) => {
                composing.current = false;
                setDraft(event.currentTarget.value);
                publish(event.currentTarget.value);
            }}
            onChange={(event) => {
                const nextValue = event.target.value;
                setDraft(nextValue);
                if (!composing.current && !event.nativeEvent.isComposing) publish(nextValue);
            }}
        />
    );
}
