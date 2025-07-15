import { createNormalizer } from "@zag-js/types";

export const normalizeProps = createNormalizer((props) => {
  const normalized: Record<string, any> = {};
  for (const key in props) {
    if (!props[key]) continue;
    if (key.startsWith("on")) {
      normalized[`@${key.substring(2).toLowerCase()}`] = props[key];
    } else {
      normalized[":" + key] = () => props[key];
    }
  }
  return normalized;
});
