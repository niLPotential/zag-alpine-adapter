import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, useMachine } from "../../src/mod.ts";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("accordion", () => ({
  service: useMachine(accordion.machine, {
    id: "1",
    dir: "ltr",
  }),
  get api() {
    return accordion.connect(this.service, normalizeProps);
  },
}));

Alpine.start();
