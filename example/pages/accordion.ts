import Alpine from "alpinejs";
import * as accordion from "@zag-js/accordion";
import { normalizeProps, VanillaMachine } from "../../src/mod.ts";

// @ts-ignore
window.Alpine = Alpine;

class Accordion {
  machine: any;
  api: any;
  item: any;
  constructor() {
    this.machine = new VanillaMachine(accordion.machine, {
      id: "1",
      dir: "ltr",
    });
    this.api = accordion.connect(this.machine.service, normalizeProps);
    this.item = (props) => this.api.getItemProps(props);
  }
  init() {
    this.machine.subscribe(() => {
      this.api = accordion.connect(this.machine.service, normalizeProps);
      this.item = (props) => this.api.getItemProps(props);
    });
    this.machine.start();
  }
}

Alpine.data("accordion", () => new Accordion());

Alpine.start();
