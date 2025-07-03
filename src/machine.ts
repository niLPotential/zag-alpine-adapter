// deno-lint-ignore-file no-explicit-any
import type { Machine, MachineSchema, PropFn, Service } from "@zag-js/core";
import { createScope } from "@zag-js/core";
import { compact } from "@zag-js/utils";

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
