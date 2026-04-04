import { hydrateRoot } from "react-dom/client"

export const Client = ({ children }: { children: React.ReactNode }) => {
    const root = document.body
    if (!root) {
        throw new Error("Root element not found")
    }
    hydrateRoot(root, children)
}
