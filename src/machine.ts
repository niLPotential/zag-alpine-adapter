// deno-lint-ignore-file no-explicit-any
import type {
  ActionsOrFn,
  BindableContext,
  ChooseFn,
  ComputedFn,
  EffectsOrFn,
  GuardFn,
  Machine,
  MachineSchema,
  PropFn,
  Service,
} from "@zag-js/core";
import { createScope, INIT_STATE, MachineStatus } from "@zag-js/core";
import {
  compact,
  identity,
  isFunction,
  isString,
  toArray,
  warn,
} from "@zag-js/utils";
import { bindable } from "./bindable.ts";
import { createRefs } from "./refs.ts";

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
  let transition: any = null;
  let event: any = { type: "" };
  let previousEvent: any;

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

  const refs = createRefs(machine.refs?.({ prop, context: ctx }) ?? {});

  const trackers: { deps: any[]; fn: any }[] = [];

  const getParams = () => ({
    state: getState(),
    context: ctx,
    event: getEvent(),
    prop,
    send,
    action,
    guard,
    track: (deps: any[], fn: any) => {
      fn.prev = deps.map((dep) => dep());
      trackers.push({ deps, fn });
    },
    refs,
    computed,
    flush: identity,
    scope,
    choose,
  });

  const action = (keys: ActionsOrFn<T> | undefined) => {
    const strs = isFunction(keys) ? keys(getParams()) : keys;
    if (!strs) return;
    const fns = strs.map((s) => {
      const fn = machine.implementations?.actions?.[s];
      if (!fn) {
        warn(
          `[zag-js] No implementation found for action "${JSON.stringify(s)}"`,
        );
      }
      return fn;
    });
    for (const fn of fns) {
      fn?.(getParams());
    }
  };

  const guard = (str: T["guard"] | GuardFn<T>) => {
    if (isFunction(str)) return str(getParams());
    return machine.implementations?.guards?.[str](getParams());
  };

  const effect = (keys: EffectsOrFn<T> | undefined) => {
    const strs = isFunction(keys) ? keys(getParams()) : keys;
    if (!strs) return;
    const fns = strs.map((s) => {
      const fn = machine.implementations?.effects?.[s];
      if (!fn) {
        warn(
          `[zag-js] No implementation found for effect "${JSON.stringify(s)}"`,
        );
      }
      return fn;
    });
    const cleanups: VoidFunction[] = [];
    for (const fn of fns) {
      const cleanup = fn?.(getParams());
      if (cleanup) cleanups.push(cleanup);
    }
    return () => cleanups.forEach((fn) => fn?.());
  };

  const choose: ChooseFn<T> = (transitions) => {
    return toArray(transitions).find((t) => {
      let result = !t.guard;
      if (isString(t.guard)) result = !!guard(t.guard);
      else if (isFunction(t.guard)) result = t.guard(getParams());
      return result;
    });
  };

  const computed: ComputedFn<T> = (key) =>
    machine.computed?.[key]({
      context: ctx,
      event: getEvent(),
      prop,
      refs,
      scope,
      computed,
    }) ?? ({} as any);

  const state = bindable(() => ({
    defaultValue: machine.initialState({ prop }),
    onChange(nextState, prevState) {
      // compute effects: exit -> transition -> enter

      // exit effects
      if (prevState) {
        const exitEffects = effects.get(prevState);
        exitEffects?.();
        effects.delete(prevState);
      }

      // exit actions
      if (prevState) {
        action(machine.states[prevState]?.exit);
      }

      // transition actions
      action(transition?.actions);

      // enter effect
      const cleanup = effect(machine.states[nextState]?.effects);
      if (cleanup) effects.set(nextState as string, cleanup);

      // root entry actions
      if (prevState === INIT_STATE) {
        action(machine.entry);
        const cleanup = effect(machine.effects);
        if (cleanup) effects.set(INIT_STATE, cleanup);
      }

      // enter actions
      action(machine.states[nextState]?.entry);
    },
  }));

  let status = MachineStatus.NotStarted;

  const send = (__event: any) => {
    if (status !== MachineStatus.Started) return;

    previousEvent = event;
    event = __event;

    debug("send", event);

    let currentState = state.get();

    const transitions =
      // @ts-ignore event type
      machine.states[currentState].on?.[event.type] ??
        // @ts-ignore event type
        machine.on?.[event.type];

    const __transition = choose(transitions);
    if (!__transition) return;

    // save current transition
    transition = __transition;
    const target = transition.target ?? currentState;

    debug("transition", transition);

    const changed = target !== currentState;
    if (changed) {
      // state change is high priority
      state.set(target);
    } else if (transition.reenter && !changed) {
      // reenter will re-invoke the current state
      state.invoke(currentState, currentState);
    } else {
      // call transition actions
      action(transition.actions);
    }
  };

  machine.watch?.(getParams());

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
