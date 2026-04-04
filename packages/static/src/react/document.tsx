import React, { type ComponentType, type PropsWithChildren, useEffect, useState } from "react"

interface DocumentProps {
    routes: Record<string, () => Promise<ComponentType>>
    lang?: string
}

export default function Document({ children, routes, lang = "en" }: PropsWithChildren<DocumentProps>) {
    return (
        <html lang={lang}>
            <head>
                <title>Sage Simple Example</title>
            </head>
            <body>
                <RoutesProvider routes={routes}>
                    {children}
                </RoutesProvider>
            </body>
        </html>
    )
}

const RoutesContext = React.createContext<{
    navigateTo: (path: string) => void
    routes: Record<string, () => Promise<ComponentType>>
}>({
    navigateTo: () => { },
    routes: {},
})

export const RoutesProvider = ({ children, routes }: { children: React.ReactNode, routes: Record<string, () => Promise<ComponentType>> }) => {
    const [activeRoute, setActiveRoute] = useState(children)

    const navigateTo = async (path: string) => {
        const loader = routes[path]
        if (loader) {
            const mod: any = await loader()
            const Component = mod.default || mod
            history.pushState({}, "", path)
            setActiveRoute(<Component />)
        }
    }

    useEffect(() => {
        const handlePopState = async () => {
            const loader = routes[location.pathname]
            if (loader) {
                const mod: any = await loader()
                const Component = mod.default || mod
                setActiveRoute(<Component />)
            }
        }

        globalThis.addEventListener("popstate", handlePopState)

        return () => {
            globalThis.removeEventListener("popstate", handlePopState)
        }
    }, [routes])

    return (
        <RoutesContext.Provider value={{ navigateTo, routes }}>
            {activeRoute}
        </RoutesContext.Provider>
    )
}

export const useRoutes = () => React.useContext(RoutesContext)
