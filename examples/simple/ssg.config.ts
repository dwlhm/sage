import Document from "./src/Document"

export default {
    entries: [
        {
            component: () => import("./src/App"),
            out: "index.html",
            path: "/",
        },
        {
            component: () => import("./src/About"),
            out: "about/index.html",
            path: "/about",
        }
    ],
    root: Document,
}