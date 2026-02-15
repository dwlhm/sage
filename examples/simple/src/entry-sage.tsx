import { defineStatic } from "@sage/static";
import App from "./app";

export default function main() {
    return {
        static: defineStatic({
            app: App,
            foo: 'dwlhm bar'
        })
    }
}