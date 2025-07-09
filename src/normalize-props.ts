import { createNormalizer } from "@zag-js/types";

export const normalizeProps = createNormalizer((props) => {
  const normalized: Record<string, any> = {};
  for (const key in props) {
    const value = props[key];
    if (!value) continue;
    if (key.startsWith("on")) {
      normalized[`@${key.substring(2).toLowerCase()}`] = value;
    } else {
      normalized[":" + key] = () => value;
    }
  }
  return normalized;
});
