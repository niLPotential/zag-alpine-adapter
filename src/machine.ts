// deno-lint-ignore-file no-explicit-any ban-ts-comment
import type {
  ActionsOrFn,
  BindableContext,
  BindableRefs,
  ChooseFn,
  ComputedFn,
  EffectsOrFn,
  GuardFn,
  Machine,
  MachineSchema,
  Params,
  PropFn,
  Service,
} from "@zag-js/core";
import { createScope, INIT_STATE, MachineStatus } from "@zag-js/core";
import {
  compact,
  ensure,
  identity,
  isFunction,
  isString,
  toArray,
  warn,
} from "@zag-js/utils";
import Alpine from "alpinejs";
import { bindable } from "./bindable.ts";
import { useRefs } from "./refs.ts";
import { useTrack } from "./track.ts";

export function useMachine<T extends MachineSchema>(
  machine: Machine<T>,
  userProps: Partial<T["props"]> = {},
): Service<T> & { init: () => void } {
  const { id, ids, getRootNode } = userProps as any;
  const scope = createScope({ id, ids, getRootNode });

  const debug = (...args: any[]) => {
    if (machine.debug) console.log(...args);
  };

  const props = machine.props?.({
    props: compact(userProps),
    scope,
  }) ?? userProps;

  const prop: PropFn<T> = (key) => props[key] as any;

  const context: any = Alpine.reactive(
    machine.context?.({
      prop,
      bindable,
      scope,
      flush: identity,
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
    }),
  );

  const ctx: BindableContext<T> = {
    get(key) {
      return context[key]?.get();
    },
    set(key, value) {
      context[key]?.set(value);
    },
    initial(key) {
      return context[key]?.initial;
    },
    hash(key) {
      const current = context[key]?.get();
      return context[key]?.hash(current);
    },
  };

  const effects = new Map<string, VoidFunction>();
  let transition: any = null;

  let previousEvent: any = null;
  let event: any = { type: "" };

  const getEvent = () => ({
    ...event,
    current() {
      return event;
    },
    previous() {
      return previousEvent;
    },
  });

  const getState = () => ({
    ...state,
    matches(...values: T["state"][]) {
      return values.includes(state.get());
    },
    hasTag(tag: T["tag"]) {
      return !!machine.states[state.get() as T["state"]]?.tags?.includes(tag);
    },
  });

  const refs: BindableRefs<T> = useRefs(
    machine.refs?.({ prop, context: ctx }) ?? {},
  );

  const getParams = (): Params<T> => ({
    state: getState(),
    context: ctx,
    event: getEvent(),
    prop,
    send,
    action,
    guard,
    track: useTrack,
    refs,
    computed,
    flush,
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

  const computed: ComputedFn<T> = (key) => {
    ensure(
      machine.computed,
      () => `[zag-js] No computed object found on machine`,
    );
    const fn = machine.computed[key];
    return fn({
      context: ctx as any,
      event: getEvent(),
      prop,
      refs,
      scope,
      computed,
    });
  };

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

  const init = () => {
    status = MachineStatus.Started;
    debug("initializing...");
    state.invoke(state.initial!, INIT_STATE);
    machine.watch?.(getParams());
  };

  const send = (_event: any) => {
    if (status !== MachineStatus.Started) return;

    previousEvent = event;
    event = _event;

    debug("send", _event);

    const currentState = state.get();

    const transitions =
      // @ts-ignore
      machine.states[currentState].on?.[_event.type] ??
        // @ts-ignore
        machine.on?.[_event.type];

    const _transition = choose(transitions);
    if (!_transition) return;

    // save current transition
    transition = _transition;
    const target = _transition.target ?? currentState;

    debug("transition", _transition);

    const changed = target !== currentState;
    if (changed) {
      // state change is high priority
      state.set(target);
    } else if (_transition.reenter && !changed) {
      // reenter will re-invoke the current state
      state.invoke(currentState, currentState);
    } else {
      // call transition actions
      action(_transition.actions);
    }
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
    init,
  };
}

const flush = (fn: VoidFunction) => {
  Alpine.nextTick(() => {
    fn();
  });
};
