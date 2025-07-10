import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { AlpineService, normalizeProps } from "../../src/mod.ts";

// @ts-ignore
window.Alpine = Alpine;

class Accordion {
  service: accordion.Service;
  api: accordion.Api;
  constructor() {
    this.service = new AlpineService(accordion.machine, {
      id: "1",
      dir: "ltr",
    });
    this.api = accordion.connect(this.service, normalizeProps);
  }
}

Alpine.data("accordion", () => new Accordion());

Alpine.start();
