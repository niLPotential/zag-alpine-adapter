import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, useMachine } from "../../src/mod.ts";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("accordion", () => {
  const service = useMachine(accordion.machine, {
    id: "1",
    dir: "ltr",
    multiple: true,
  });
  return {
    get api() {
      return accordion.connect(service, normalizeProps);
    },
    init() {
      service.init();
    },
  };
});

Alpine.start();
