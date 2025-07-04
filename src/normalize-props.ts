import { createNormalizer } from "@zag-js/types";

type Dict = Record<string, string>;

export const normalizeProps = createNormalizer((props: Dict) => {
  const normalized: Dict = {};
  for (let key in props) {
    let value = props[key];
    if (value === undefined) continue;
    if (key.startsWith("on")) {
      value = value.toString().replace(key, "");
      key = `[@${key.substring(2).toLowerCase()}]`;
    }
    normalized[key] = value;
  }
  return normalized;
});
