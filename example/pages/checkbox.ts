import Alpine from "alpinejs";
import * as checkbox from "@zag-js/checkbox";
import { normalizeProps, VanillaMachine } from "../../src/mod.ts";

// @ts-ignore
window.Alpine = Alpine;

Alpine.data("checkbox", () => {
  const machine = new VanillaMachine(checkbox.machine);
  return {
    init() {
      machine.start();
    },
    api: checkbox.connect(machine.service, normalizeProps),
  };
});

Alpine.start();
