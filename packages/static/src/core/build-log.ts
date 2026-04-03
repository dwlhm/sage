/**
 * Build-time messages printed to the terminal. Kept in one place so lint rules stay satisfied.
 */

export const logSageStaticBuildStart = (): void => {
    // oxlint-disable-next-line no-console -- intentional CLI feedback during `vite build`
    console.log("\n🌿 sage-static: Generating static pages...")
}

export const logSageStaticBuildDone = (): void => {
    // oxlint-disable-next-line no-console -- intentional CLI feedback during `vite build`
    console.log("🌿 sage-static: Done!\n")
}
