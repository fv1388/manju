// 访问口令：防白嫖——网站/接口需输入正确口令才能调用生成，避免陌生人消耗你充值的模型额度
// 如需改口令，改这里即可（改完需重新部署）
export const ACCESS_CODE = "manju1388";

export function checkAccess(code: unknown): boolean {
  return typeof code === "string" && code === ACCESS_CODE;
}
