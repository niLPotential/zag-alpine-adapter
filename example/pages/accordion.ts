import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, VanillaMachine } from "../../src/mod.ts";

// @ts-ignore
window.Alpine = Alpine;

class Accordion {
  machine: any;
  api: any;
  constructor() {
    this.machine = new VanillaMachine(accordion.machine, {
      id: "1",
      dir: "ltr",
    });
    this.machine.machine.debug = true;
    this.api = accordion.connect(this.machine.service, normalizeProps);
  }
  init() {
    this.machine.start();
  }
}

Alpine.data("accordion", () => new Accordion());

Alpine.start();
