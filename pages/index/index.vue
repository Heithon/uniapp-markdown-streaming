<template>
  <scroll-view scroll-y scroll-x class="content">
    <silkide-markdown-streaming
      ref="smsRef"
      :source="source"
      :config="config"
    />
  </scroll-view>
</template>

<script setup>
import { ref, onMounted } from "vue";

const smsRef = ref(null);

const config = ref({
  isStreamingParse: false,
});

const source = ref(`
# 标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
公式：
$$
frac{1}{2}
$$
这是个公式$\\frac{1}{2}$
  `);

// setInterval(() => {
//   source.value += `
//   # 标题
//   ## 二级标题
//   ### 三级标题
//   `;
// }, 3000);

onMounted(() => {
  let count = 0;
  setInterval(() => {
    count++;
    if (count > 5) return;
    smsRef.value.write(`
### 这是第${count}个标题 $\\frac{1}{2}$
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} \\quad \\text{且} \\quad \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6} \\quad \\text{以及} \\quad \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\quad \\text{其中} \\quad \\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} \\quad \\text{和} \\quad \\oint_{\\partial S} \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{A}
$$
块级复杂公式 \`const a = 1\`：
\`\`\`
const a = 1;
const b = 2;
function sum(a, b) {
  return a + b;
}

console.log(sum(a, b));

\`\`\`
`);
  }, 200);
});
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}
</style>
