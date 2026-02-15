import { type Connect } from "vite";
import { type factory } from "../factory";

export const createStaticMiddleware = (
    staticFactory: ReturnType<typeof factory>
): Connect.NextHandleFunction => async (req, res, next) => {
    if (req.url !== '/') {
        next();
        return;
    }

    try {
        const html = await staticFactory.generateHtml();
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
    } catch (error) {
        next(error);
    }
};