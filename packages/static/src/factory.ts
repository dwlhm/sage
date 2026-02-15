import type { IUserOptions } from "./define"
import type { TRenderToStatic } from "./render"

export const factory = ({
    render,
    userOptions,
}: {
    render: TRenderToStatic,
    userOptions: IUserOptions,
}) => {
    const { main } = userOptions

    return {
        generateHtml: () => render(main)
    }
}