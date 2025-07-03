import Alpine from "alpinejs";
import * as checkbox from "@zag-js/checkbox";
import { normalizeProps, useMachine } from "../../src/mod.ts";

window.Alpine = Alpine;

Alpine.data("checkbox", () => {
  const service = useMachine(checkbox.machine);
  return {
    api: checkbox.connect(service, normalizeProps),
  };
});

Alpine.start();
