import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const appEntry = fileURLToPath(new URL("./index.html", import.meta.url));
const studyEntry = fileURLToPath(new URL("./src/study/einstein-equation-study.html", import.meta.url));

export default defineConfig({
  base: "/curvature-game/",
  build: {
    rollupOptions: {
      input: {
        app: appEntry,
        study: studyEntry,
      },
    },
  },
});
