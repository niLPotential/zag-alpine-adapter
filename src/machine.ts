// deno-lint-ignore-file no-explicit-any
import type {
  BindableContext,
  Machine,
  MachineSchema,
  PropFn,
  Service,
} from "@zag-js/core";
import { createScope } from "@zag-js/core";
import { compact } from "@zag-js/utils";
import { bindable } from "./bindable.ts";

export function useMachine<T extends MachineSchema>(
  machine: Machine<T>,
  userProps: Partial<T["props"]> = {},
): Service<T> {
  const { id, ids, getRootNode } = userProps as any;
  const scope = createScope({ id, ids, getRootNode });

  const debug = (...args: any[]) => {
    if (machine.debug) console.log(...args);
  };

  const prop: PropFn<T> = (key) => {
    const props = machine.props?.({ props: compact(userProps), scope }) ??
      userProps;
    return props[key] as any;
  };

  const context = machine.context?.({
    prop,
    bindable,
    scope,
    flush(fn: VoidFunction) {
      fn();
    },
    getContext() {
      return ctx;
    },
    getComputed() {
      return computed;
    },
    getRefs() {
      return refs;
    },
    getEvent() {
      return getEvent();
    },
  });

  const ctx: BindableContext<T> = {
    get(key) {
      return context?.[key].get()!;
    },
    set(key, value) {
      context?.[key].set(value);
    },
    initial(key) {
      return context?.[key].initial!;
    },
    hash(key) {
      const current = context?.[key].get()!;
      return context?.[key].hash(current)!;
    },
  };

  const effects = new Map<string, VoidFunction>();
  const transition: any = null;
  const event: any = { type: "" };
  const previousEvent: any;

  const getEvent = () => ({
    ...event,
    current: () => event,
    previous: () => previousEvent,
  });

  const getState = () => ({
    ...state,
    matches: (...values: T["state"][]) => values.includes(state.get()),
    hasTag: (tag: T["tag"]) =>
      !!machine.states[state.get() as T["state"]]?.tags?.includes(tag),
  });

  const refs;

  const getParams;

  const action;

  const guard;

  const effect;

  const choose;

  const computed;

  const state;

  return {
    state: getState(),
    send,
    context: ctx,
    prop,
    scope,
    refs,
    computed,
    event: getEvent(),
    getStatus: () => status,
  };
}
