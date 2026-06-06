// 渲染层测试固定数据。
// 作用：
// 1. 集中维护 renderer 测试使用的稳定时间常量。
// 2. 避免各测试文件重复声明基础 fixture。
export const BASE_TIME = Date.parse("2026-05-29T08:00:00.000Z");
