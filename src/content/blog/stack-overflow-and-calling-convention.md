---
# ============================================================
# 这是一篇 draft: true 的**测试文章**，用来验证文章系统：
# frontmatter 校验、目录、代码高亮、上下篇、系列、标签页。
#
# 它不会出现在线上（生产构建会排除 draft）。
# 本地想看它：npm run dev 或 npm run build:with-drafts
#
# 你自己写文章时，把它删掉即可 —— 或者留着当 frontmatter 的参考。
# ============================================================
title: 从栈溢出理解函数调用
description: 从 x86-64 的调用约定出发，看一个函数调用在栈上究竟发生了什么，以及缓冲区溢出为什么能改写返回地址。
date: 2026-09-20
category: 技术分享
tags: [栈溢出, x86-64, 汇编, 调用约定]
series: PWN 从零开始
seriesOrder: 1
draft: true
math: false
---

栈溢出是所有二进制利用的起点。但在写第一个 exploit 之前，
更有价值的一件事是搞清楚：**一次普通的函数调用，在内存里到底长什么样。**

这篇笔记只讲这一件事。

## 调用约定：参数放在哪里

x86-64 System V 约定下，前六个整型参数依次放在寄存器里：

| 参数序号 | 寄存器 |
| --- | --- |
| 1 | `rdi` |
| 2 | `rsi` |
| 3 | `rdx` |
| 4 | `rcx` |
| 5 | `r8` |
| 6 | `r9` |

超过六个的参数才走栈。返回值放在 `rax`。

## 一个最小的例子

```c
#include <stdio.h>
#include <string.h>

void greet(char *name) {
    char buf[16];
    strcpy(buf, name);      /* 没有长度检查 */
    printf("hello, %s\n", buf);
}

int main(int argc, char **argv) {
    greet(argv[1]);
    return 0;
}
```

`greet` 的栈帧在进入时大致是这样：

```asm
greet:
    push   rbp              ; 保存调用者的栈基址
    mov    rbp, rsp         ; 建立自己的栈帧
    sub    rsp, 0x20        ; 为 buf 腾出空间
    mov    [rbp-0x18], rdi  ; name 存到局部变量
    lea    rax, [rbp-0x18]
    mov    rsi, rax
    lea    rdi, [rbp-0x10]  ; buf 的地址
    call   strcpy           ; ← 没有边界检查
    ...
    leave                   ; mov rsp, rbp; pop rbp
    ret                     ; pop rip
```

关键在于 `buf` 位于 `rbp-0x10`，而**保存的返回地址在 `rbp+0x8`**。

两者之间只隔了 16 字节。只要 `name` 超过 16 个字节，
多出来的部分就会向上覆盖 `rbp`，再往上就是返回地址。

## 溢出的那一刻

```python
payload  = b'A' * 16      # 填满 buf
payload += b'B' * 8       # 覆盖保存的 rbp
payload += p64(target)    # 覆盖返回地址
```

当 `greet` 执行到 `ret` 时，CPU 会从栈顶弹出这 8 个字节当作下一条指令的地址 ——
也就是弹到了我们写进去的 `target`。

**控制流转移就是这么发生的。** 后面所有的现代缓解措施
（栈不可执行、Canary、ASLR、PIE）都是在试图阻止或削弱这一步。

## 为什么这件事值得反复看

真正的漏洞利用很少是"直接跳到 shellcode"这么干净。
现代二进制里更常见的是先泄漏一个地址、再算 base、再找 gadget，
但所有这些技巧都建立在同一个前提上：

> 你能改写栈上某个位置的 8 个字节，而程序会用它们决定下一步去哪。

把这层想清楚了，后面遇到绕 Canary、ret2libc、ROP 时才不会只是在背步骤。

## 顺着往下

下一篇会看**为什么返回值本身也需要保护** —— Canary 是怎么被塞进栈帧的，
以及哪些写法会把它泄出去。
