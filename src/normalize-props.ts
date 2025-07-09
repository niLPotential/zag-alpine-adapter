import { createNormalizer } from "@zag-js/types";

export const normalizeProps = createNormalizer((props) => {
  const normalized: Record<string, any> = {};
  for (let key in props) {
    const value = props[key];
    if (!value) continue;
    if (key.startsWith("on")) {
      key = `@${key.substring(2).toLowerCase()}`;
    }
    if (key === "hidden") {
      normalized[":hidden"] = () => value
      continue
    }
    normalized[key] = value;
  }
  return normalized;
});
