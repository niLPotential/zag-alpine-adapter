import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, useMachine } from "../../src/mod.ts";
import { add } from "@zag-js/utils";

// @ts-ignore
globalThis.Alpine = Alpine;

Alpine.data("accordion", () => {
  const service = Alpine.reactive(useMachine(accordion.machine, {
    id: "1",
    dir: "ltr",
  }));
  return {
    service,
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
    add() {
      this.value++;
    },
    get() {
      return this.value;
    },
  });
  // Alpine.effect(() => {
  //   console.log(data.value);
  // });
  const api = {
    ["@click"]() {
      data.add();
    },
    ["x-text"]() {
      return data.get();
    },
  };
  return { api };
});

Alpine.start();
