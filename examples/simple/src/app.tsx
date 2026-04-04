import { useState } from "react";
import { useRoutes } from "@sage/static/react";

export default function App() {
    const [count, setCount] = useState(0);
    const { navigateTo } = useRoutes();

    const handleClick = () => {
        setCount(count + 1);
    }

    return (
        <div>
            <title>Home: Sage Static</title>
            <p>Count: {count}</p>
            <button onClick={handleClick}>Increment</button>
            <div style={{ marginTop: '1rem' }}>
                <button onClick={() => navigateTo('/about')}>Go to About</button>
            </div>
        </div>
    )
}