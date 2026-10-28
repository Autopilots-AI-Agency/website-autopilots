import { defineConfig } from "astro/config";
import { rumataBackends } from "./rumata-backends.mjs";
import { siteOrigin } from "./src/config/site-origin.mjs";
export default defineConfig({site:siteOrigin(process.env.PUBLIC_SITE_URL),vite:{plugins:process.env.NETLIFY ? [] : [rumataBackends()]}});
