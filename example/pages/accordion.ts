import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, useMachine } from "../../src/mod.ts";
import { createNormalizer } from "@zag-js/types";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("counter", () => {
  const data = Alpine.reactive({ value: 1 });
  const normalize = createNormalizer((props) => {
    const normalized = {};
    // const v = props.value; fails
    normalized["x-text"] = () => props.value; // works
    return normalized;
  });
  const connect = (data, normalize) => {
    return normalize.button(data);
  };
  return {
    bind: {
      "x-bind": () => connect(data, normalize),
      "@click": () => {
        data.value++;
        console.log(data.value);
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
