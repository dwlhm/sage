import React from "react"

export type TDefineStatic = (args: {
    foo: string,
    app: React.ElementType
}) => IUserOptions

export interface IUserOptions {
    foo: string,
    main: React.ReactNode
}

export const defineStatic: TDefineStatic = ({
    app,
    foo
}) => {
    const mainElement = React.createElement(app)
    return {
        foo,
        main: mainElement,
    }
}