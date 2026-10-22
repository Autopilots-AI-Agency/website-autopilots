import { defineConfig } from "astro/config";
import { rumataBackends } from "./rumata-backends.mjs";
export default defineConfig({site:"https://auto-pilots.io",vite:{plugins:process.env.NETLIFY ? [] : [rumataBackends()]}});
