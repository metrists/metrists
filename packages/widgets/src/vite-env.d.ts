/** Vite serves stylesheets as importable modules; give them a type so the
 *  rail's DOM-guarded `import("./minimap.css")` typechecks. */
declare module "*.css";
