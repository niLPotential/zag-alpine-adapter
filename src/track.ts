import Alpine from "alpinejs";

export const useTrack = (deps: any[], effect: VoidFunction) => {
  const d = Alpine.reactive([...deps.map((d) => d())]);
  Alpine.effect(() => {
    d;
    effect();
  });
};
