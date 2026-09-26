---
title: 从 PE 文件结构认识 Windows 二进制
description: 从 DOS 头一路走到节表，把 PE 文件的骨架拆开看一遍，理解 Windows 加载器是怎么把文件变成进程的。
date: 2026-09-22
category: Windows 内核
tags: [PE, Windows, 逆向, 加载器]
series: Windows 二进制入门
seriesOrder: 1
draft: true
math: false
---

Windows 上的每一个 `.exe`、`.dll`、`.sys` 都是 PE 格式。
做内核安全或逆向，PE 是绕不开的第一张地图。

这篇笔记把骨架过一遍，重点是**结构之间的指向关系**，而不是字段大全。

## 为什么是从 DOS 头开始

PE 文件的最前面是一段 DOS 时代的遗留代码：

```c
typedef struct _IMAGE_DOS_HEADER {
    WORD   e_magic;      // 'MZ' —— 0x5A4D
    ...
    LONG   e_lfanew;     // 指向真正的 PE 头
} IMAGE_DOS_HEADER;
```

`e_magic` 是 `MZ`（DOS 作者 Mark Zbikowski 的缩写）。
它唯一的作用是让老程序能在 DOS 下打印一句"This program cannot be run in DOS mode"。

真正有用的是 **`e_lfanew`** —— 一个偏移量，指向文件里真正的 PE 头。
加载器就是靠它跳过那段 DOS 残骸的。

## 三段式骨架

```
DOS 头 (MZ)  →  e_lfanew  →  NT 头 (PE\0\0 + FileHeader + OptionalHeader)
                                    ↓
                            节表 (Section Table)
                                    ↓
                             各节的实际数据
```

NT 头里的 `Signature` 是 `PE\0\0`。后面跟着：

- **FileHeader**：机器类型、节的数量、时间戳、可选头大小
- **OptionalHeader**：虽然是"可选"，但对可执行文件是必需的。
  里面最关键的两个字段是 `AddressOfEntryPoint`（入口点的 RVA）
  和 `ImageBase`（期望的加载基址）。

## RVA、VA 和文件偏移

这三个概念的区别是初学者最容易混淆的地方：

| 概念 | 含义 |
| --- | --- |
| **FOA**（文件偏移） | 数据在磁盘文件里的位置 |
| **RVA**（相对虚拟地址） | 数据相对于镜像基址的偏移 |
| **VA**（虚拟地址） | `ImageBase + RVA`，运行时的实际地址 |

**节表是 FOA 与 RVA 之间的唯一桥梁。**

```c
typedef struct _IMAGE_SECTION_HEADER {
    BYTE  Name[8];              // ".text" ".data" ".rdata"
    DWORD VirtualAddress;       // 该节的 RVA
    DWORD SizeOfRawData;        // 在文件中的大小
    DWORD PointerToRawData;     // 该节在文件中的偏移 ← FOA
    DWORD Characteristics;      // 读/写/执行权限
} IMAGE_SECTION_HEADER;
```

给定一个 RVA 想找它在文件里的位置：

```
offset_in_section = RVA - VirtualAddress
FOA = PointerToRawData + offset_in_section
```

几乎所有 PE 解析器（包括杀软和 EDR）做的第一件事就是这个换算。

## 几个关键的节

| 节名 | 内容 | 典型权限 |
| --- | --- | --- |
| `.text` | 可执行代码 | R-X |
| `.rdata` | 只读数据、导入表 | R-- |
| `.data` | 已初始化的全局变量 | RW- |
| `.bss` | 未初始化的全局变量（文件里不占空间） | RW- |
| `.pdata` | 异常处理信息（x64 特有） | R-- |

**`.text` 段不可写，这是 DEP（数据执行保护）的基础。**
现代利用之所以要写 ROP，就是因为没法再把 shellcode 放进栈里执行 ——
只能去 `.text` 里找现成的指令片段拼起来。

## 导入表：程序如何找到 DLL

程序并不直接调用 `kernel32!CreateFileW`。它调用的是一张表里的间接跳转：

```
调用点 → IAT 表项 → （加载时由加载器填入真实地址）
```

- **导入表（Import Directory）**：描述"需要哪些 DLL 的哪些函数"，在 `.rdata`
- **IAT（导入地址表）**：加载器把真实函数地址写进来的地方，可写

**IAT 是可写的，这一点是很多 Windows 漏洞利用的支点。**
如果能改写一个 IAT 项，就等于劫持了后续所有对那个 API 的调用 ——
不需要修改任何代码，也不会破坏 `.text` 的完整性校验。

## 接下来

下一篇会讲**重定位**：当 `ImageBase` 被 ASLR 改掉之后，
那些写死在代码里的绝对地址是怎么被一一修正的，
以及为什么 `.reloc` 段可以被整体丢弃。
