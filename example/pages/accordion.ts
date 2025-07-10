import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { AlpineService, normalizeProps } from "../../src/mod.ts";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("accordion", () => ({
  service: new AlpineService(accordion.machine, {
    id: "1",
    dir: "ltr",
  }),
  get api() {
    return accordion.connect(this.service, normalizeProps);
  },
  init() {
    this.service.init();
  },
}));

Alpine.start();
