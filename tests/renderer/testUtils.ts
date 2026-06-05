// React 渲染层测试共享工具。
// 作用：
// 1. 统一安装假的 window.ideaNotes，避免每个测试文件重复 preload mock。
// 2. 提供样式源码读取和 CSS 规则提取辅助函数，服务样式契约测试。
// 3. 集中维护 renderer 测试使用的稳定时间常量。
export { BASE_TIME } from "./helpers/fixtures";
export { installApi } from "./helpers/fakeIdeaNotesApi";
export {
  RENDERER_SRC,
  readCssRuleBlock,
  readRendererStyles,
} from "./helpers/styleAssertions";
