import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, VanillaMachine } from "../../src/mod.ts";

// @ts-ignore
window.Alpine = Alpine;

Alpine.data("accordion", () => {
  const machine = new VanillaMachine(accordion.machine, {
    id: "1",
    dir: "ltr",
  });
  return {
    init() {
      machine.start();
    },
    api: accordion.connect(machine.service, normalizeProps),
  };
});

Alpine.start();
