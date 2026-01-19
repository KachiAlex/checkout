import { e as a, A as i } from "./index-CcrCVdax.js";
async function t() {
  const { data: t } = await a.get(`${i}/api/v1/subscription-pricing`);
  return t;
}
async function n(t, n) {
  const { data: r } = await a.put(`${i}/api/v1/subscription-pricing`, t, {
    headers: { Authorization: `Bearer ${n}` },
  });
  return r;
}
export { t as g, n as u };
