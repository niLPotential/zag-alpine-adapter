import Alpine from "alpinejs";
import * as checkbox from "@zag-js/checkbox";
import { normalizeProps, useMachine } from "../../src/mod.ts";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("checkbox", () => ({
  service: useMachine(checkbox.machine),
  get api() {
    return checkbox.connect(this.service, normalizeProps);
  },
}));

Alpine.start();
