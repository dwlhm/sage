import React from "react"

export type TDefineStatic = (args: {
    app: React.ElementType
}) => IUserOptions

export interface IUserOptions {
    main: React.ReactNode
}

export const defineStatic: TDefineStatic = ({
    app,
}) => {
    const mainElement = React.createElement(app)
    return {
        main: mainElement,
    }
}