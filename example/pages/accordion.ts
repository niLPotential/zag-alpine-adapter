import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, useMachine } from "../../src/mod.ts";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("accordion", () => {
  const service = Alpine.reactive(useMachine(accordion.machine, {
    id: "1",
    dir: "ltr",
  }));
  return {
    api: accordion.connect(service, normalizeProps),
    init() {
      service.init();
      Alpine.effect(() => {
        this.api = accordion.connect(service, normalizeProps);
      });
    },
  };
});

Alpine.data("test", () => {
  const data = Alpine.reactive({
    value: 0,
  });
  Alpine.effect(() => {
    console.log(data.value);
  });
  const api = {
    ["@click"]() {
      data.value++;
      console.log(data.value);
    },
    ["x-text"]() {
      return data.value;
    },
  };
  return { api };
});

Alpine.start();
