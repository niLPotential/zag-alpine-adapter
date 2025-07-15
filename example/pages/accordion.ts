import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, useMachine } from "../../src/mod.ts";
import { createNormalizer } from "@zag-js/types";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("counter", () => {
  const data = Alpine.reactive({ text: 1 });
  const normalize = createNormalizer((props) => {
    const normalized = {};
    for (const key in props) {
      normalized["x-" + key] = () => props[key];
    }
    return normalized;
  });
  const connect = (data, normalize) => {
    return normalize.button(data);
  };
  return {
    bind: {
      "x-bind": () => connect(data, normalize),
      "@click": () => {
        data.text++;
        console.log(data.text);
      },
    },
  };
});

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
