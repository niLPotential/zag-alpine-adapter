import { createNormalizer } from "@zag-js/types";

type Dict = Record<string, string>;

export const normalizeProps = createNormalizer((props: Dict) => {
  const normalized: Dict = {};
  for (let key in props) {
    if (key.startsWith("on")) {
      console.log(key, props[key])
      continue;
    }
    normalized[key] = props[key];
  }
  return normalized;
});
