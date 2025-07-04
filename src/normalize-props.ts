import { createNormalizer } from "@zag-js/types";

function toAlpineProp(prop: string) {
  if (prop.startsWith("on")) return `@${prop.substr(2)}`;
  return prop;
}

export const normalizeProps = createNormalizer((props: any) => {
  return Object.entries(props).reduce<any>((acc, [key, value]) => {
    if (value === undefined) return acc;

    acc[toAlpineProp(key)] = value;

    return acc;
  }, {});
});
