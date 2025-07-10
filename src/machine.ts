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
import { bindable } from "./bindable.ts";
import { createRefs } from "./refs.ts";

export class AlpineService<T extends MachineSchema> {
  private ctx: BindableContext<T>;
  private refs: BindableRefs<T>;

  private effects = new Map<string, VoidFunction>();
  private transition: any = null;

  private previousEvent: any;
  private event = { type: "" };

  constructor(
    private machine: Machine<T>,
    private userProps: Partial<T["props"]>,
  ) {
    const context: any = this.machine.context?.({
      prop: this.prop,
      bindable,
      scope: this.scope,
      flush: identity,
      getContext: () => this.ctx,
      getComputed: () => this.computed,
      getRefs: () => this.refs,
      getEvent: this.getEvent.bind(this),
    });

    const ctx: BindableContext<T> = {
      get(key) {
        return context[key].get();
      },
      set(key, value) {
        context[key].set(value);
      },
      initial(key) {
        return context[key].initial;
      },
      hash(key) {
        const current = context[key].get();
        return context[key].hash(current);
      },
    };
    this.ctx = ctx;

    this.refs = createRefs(
      this.machine.refs?.({ prop: this.prop, context: this.ctx }) ?? {},
    );
  }

  private get scope() {
    const { id, ids, getRootNode } = this.userProps as any;
    return createScope({ id, ids, getRootNode });
  }

  private debug(...args: any[]) {
    if (this.machine.debug) console.log(...args);
  }

  private get props() {
    return this.machine.props?.({
      props: compact(this.userProps),
      scope: this.scope,
    }) ?? this.userProps;
  }
  private prop: PropFn<T> = (key) => this.props[key] as any;

  private getEvent = () => ({
    ...this.event,
    current: () => this.event,
    previous: () => this.previousEvent,
  });

  private getState = () => ({
    ...this.state,
    matches: (...values: T["state"][]) => values.includes(this.state.get()),
    hasTag: (tag: T["tag"]) =>
      !!this.machine.states[this.state.get() as T["state"]]?.tags?.includes(
        tag,
      ),
  });

  private getParams = (): Params<T> => ({
    state: this.getState(),
    context: this.ctx,
    event: this.getEvent(),
    prop: this.prop,
    send: this.send,
    action: this.action,
    guard: this.guard,
    track: (deps: any[], effect: VoidFunction) => {},
    refs: this.refs,
    computed: this.computed,
    flush: identity,
    scope: this.scope,
    choose: this.choose,
  });

  private action(keys: ActionsOrFn<T> | undefined) {
    const strs = isFunction(keys) ? keys(this.getParams()) : keys;
    if (!strs) return;
    const fns = strs.map((s) => {
      const fn = this.machine.implementations?.actions?.[s];
      if (!fn) {
        warn(
          `[zag-js] No implementation found for action "${JSON.stringify(s)}"`,
        );
      }
      return fn;
    });
    for (const fn of fns) {
      fn?.(this.getParams());
    }
  }

  private guard(str: T["guard"] | GuardFn<T>) {
    if (isFunction(str)) return str(this.getParams());
    return this.machine.implementations?.guards?.[str](this.getParams());
  }

  private effect(keys: EffectsOrFn<T> | undefined) {
    const strs = isFunction(keys) ? keys(this.getParams()) : keys;
    if (!strs) return;
    const fns = strs.map((s) => {
      const fn = this.machine.implementations?.effects?.[s];
      if (!fn) {
        warn(
          `[zag-js] No implementation found for effect "${JSON.stringify(s)}"`,
        );
      }
      return fn;
    });
    const cleanups: VoidFunction[] = [];
    for (const fn of fns) {
      const cleanup = fn?.(this.getParams());
      if (cleanup) cleanups.push(cleanup);
    }
    return () => cleanups.forEach((fn) => fn?.());
  }
  private choose: ChooseFn<T> = (transitions) =>
    toArray(transitions).find((t) => {
      let result = !t.guard;
      if (isString(t.guard)) result = !!this.guard(t.guard);
      else if (isFunction(t.guard)) result = t.guard(this.getParams());
      return result;
    });

  private computed: ComputedFn<T> = (key) => {
    ensure(
      this.machine.computed,
      () => `[zag-js] No computed object found on machine`,
    );
    const fn = this.machine.computed[key];
    return fn({
      context: this.ctx,
      event: this.getEvent(),
      prop: this.prop,
      refs: this.refs,
      scope: this.scope,
      computed: this.computed,
    });
  };

  private state = bindable(() => ({
    defaultValue: this.machine.initialState({ prop: this.prop }),
    onChange: (nextState, prevState) => {
      // compute effects: exit -> transition -> enter

      // exit effects
      if (prevState) {
        const exitEffects = this.effects.get(prevState);
        exitEffects?.();
        this.effects.delete(prevState);
      }

      // exit actions
      if (prevState) {
        this.action(this.machine.states[prevState]?.exit);
      }

      // transition actions
      this.action(this.transition?.actions);

      // enter effect
      const cleanup = this.effect(this.machine.states[nextState]?.effects);
      if (cleanup) this.effects.set(nextState as string, cleanup);

      // root entry actions
      if (prevState === INIT_STATE) {
        this.action(this.machine.entry);
        const cleanup = this.effect(this.machine.effects);
        if (cleanup) this.effects.set(INIT_STATE, cleanup);
      }

      // enter actions
      this.action(this.machine.states[nextState]?.entry);
    },
  }));

  private status = MachineStatus.NotStarted;

  private init() {
    this.status = MachineStatus.Started;
    this.debug("initializing...");
    this.state.invoke(this.state.initial!, INIT_STATE);
    this.machine.watch?.(this.getParams());
  }

  private send(event: any) {
    if (this.status !== MachineStatus.Started) return;

    this.previousEvent = this.event;
    this.event = event;

    this.debug("send", event);

    const currentState = this.state.get();

    const transitions =
      // @ts-ignore
      this.machine.states[currentState].on?.[event.type] ??
        // @ts-ignore
        this.machine.on?.[event.type];

    const transition = this.choose(transitions);
    if (!transition) return;

    // save current transition
    this.transition = transition;
    const target = transition.target ?? currentState;

    this.debug("transition", transition);

    const changed = target !== currentState;
    if (changed) {
      // state change is high priority
      this.state.set(target);
    } else if (transition.reenter && !changed) {
      // reenter will re-invoke the current state
      this.state.invoke(currentState, currentState);
    } else {
      // call transition actions
      this.action(transition.actions);
    }
  }
}
