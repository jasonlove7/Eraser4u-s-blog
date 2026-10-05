---
title: 基于glibc-2.23 malloc源码学习
description: "详细版，未完待续..."
date: 2026-10-05
category: 学习笔记
tags: [malloc源码]
math: false
---

# 还在学习中，不全...  

# glibc malloc.c 源码精读｜阶段 1 笔记：Chunk 基础与物理布局

> 适用：第一次系统读 ptmalloc/glibc malloc 源码，或者复习 Heap Pwn 前的底层基础。
> 依据：本次上传的 `malloc.c`。文中涉及的实现细节以该源码版本为准；“常见 64 位”示例会单独标注。

## 0. 本阶段真正要掌握的主线

这一阶段只建立一个模型：**malloc 管理的不是“用户指针”，而是一串带元数据的 chunk。**

需要牢牢记住 5 件事：

1. `malloc()` 返回的是 `chunk2mem(p)`，不是 chunk 起始地址。
2. `size` 字段 = **真实 chunk 大小 + 若干低位 flag**。
3. `PREV_INUSE` 描述的是**前一个物理相邻 chunk 是否在使用**。
4. `next_chunk/prev_chunk` 处理的是**物理相邻关系**；`fd/bk` 处理的是**空闲链表关系**。
5. `request2size()` 把用户请求转换为 allocator 真正需要管理的 chunk 大小。



## 1. `struct malloc_chunk`

```
struct malloc_chunk {
  INTERNAL_SIZE_T      prev_size;
  INTERNAL_SIZE_T      size;
  struct malloc_chunk* fd;
  struct malloc_chunk* bk;
  struct malloc_chunk* fd_nextsize;
  struct malloc_chunk* bk_nextsize;
};
```

这是 allocator 对一块 chunk 的“结构化视图”。不要把它误解成“每个正在使用的 chunk 都完整占用六个字段”。其中：

- `prev_size`：用于知道前一个物理 chunk 的大小；只有在相应条件下才有意义。
- `size`：真实大小 + flags。
- `fd/bk`：chunk 处于普通 free-list/bin 时使用。
- `fd_nextsize/bk_nextsize`：主要服务于 large chunk 的额外 size-order 链接。

## 2. 用户指针和 chunk 指针

在常见 64 位配置下，`SIZE_SZ = 8`，所以 chunk 头部通常从概念上占 `0x10` 字节：

```
chunk start
+-------------------+
| prev_size   0x08  |
+-------------------+
| size        0x08  |
+-------------------+
| user data         |  <-- malloc() 返回这里
+-------------------+
```

源码中的核心转换宏本质上就是：

```
chunk2mem(p)  // chunk -> user pointer
mem2chunk(m)  // user pointer -> chunk
```

因此调试时最常见的思维错误就是：**看到 malloc 返回值，就把它当 chunk 起点。**

## 3. `size`：大小和 flags 共存

源码定义：

```
#define PREV_INUSE       0x1
#define IS_MMAPPED       0x2
#define NON_MAIN_ARENA   0x4
#define SIZE_BITS (PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA)
#define chunksize(p) ((p)->size & ~(SIZE_BITS))
```

逻辑模型：

```
63                         3 2 1 0
+--------------------------+-+-+-+
|      real chunk size     |A|M|P|
+--------------------------+-+-+-+
                            | | |
                            | | +-- PREV_INUSE
                            | +---- IS_MMAPPED
                            +------ NON_MAIN_ARENA
```

因为 chunk 通常满足对齐要求，低位本来就经常为 0，所以 allocator 借这些低位保存状态。即 `SIZE_BITS`，值为 `0x7` / 二进制 `111`,来存放 chunk 的状态属性

| **标志位**                 | **掩码值** | **含义**                                                     |
| -------------------------- | ---------- | ------------------------------------------------------------ |
| **`P`** (`PREV_INUSE`)     | `0x1`      | 前一个物理相邻的 chunk 是否处于在用状态（1 为在用/不可合并，0 为空闲）。 |
| **`M`** (`IS_MMAPPED`)     | `0x2`      | 当前 chunk 是否是通过 `mmap` 系统调用直接分配的。            |
| **`A`** (`NON_MAIN_ARENA`) | `0x4`      | 当前 chunk 是否来自于非主 arena（Non-main Arena）。          |

### 例：`0x31`

```
0x31 = 0x30 | 0x1
```

所以：

- 真实 chunk 大小：`0x30`
- `PREV_INUSE`：置 1
- 其他 flags：未置位

可以直接记成（详解请看附一）：

```
chunksize(p) == p->size & ~SIZE_BITS
```

## 4. 最容易混淆的：`PREV_INUSE`

源码注释写得非常关键：

```
/* size field is or'ed with PREV_INUSE when previous adjacent chunk in use */
```

它描述的是：

> **当前 chunk 的** **size** **里，这一位表示“前一个物理相邻 chunk 是否正在使用”。**

不是“当前 chunk 是否 in use”。

### 为什么这样设计？

allocator 在释放当前 chunk 时，需要判断前一个物理 chunk 能不能合并。如果 `PREV_INUSE == 0`，那么前一个 chunk 被认为是可合并的，于是它的大小可以通过 `prev_size` 找到。

## 5. `prev_size` 和 boundary tag 思路

源码：

```
#define prev_chunk(p) \
  ((mchunkptr)(((char *)(p)) - ((p)->prev_size)))
```

所以：

```
当前 chunk p
        |
        | - prev_size
        v
前一个物理 chunk
```

关键点：`prev_size` **不是任何时候都可信/有意义**。只有在前一个 chunk 被标记为 free 时，当前 chunk 的 `PREV_INUSE` 才会被清掉，allocator 才会使用 `prev_size` 找前一块。

源码还利用下一个 chunk 的 `prev_size` 来表达“前一块”的大小，这就是常说的 boundary-tag 思想。

## 6. `next_chunk()` vs `fd`

这是 Heap Pwn 中必须分清的一组概念：

```
#define next_chunk(p) \
  ((mchunkptr)(((char *)(p)) + ((p)->size & ~SIZE_BITS)))
```

`next_chunk(p)`：**物理相邻的下一个 chunk**。

而：

```
p->fd
```

表示：**free-list 中的下一个节点**。

两者没有“必须相等”的关系。



## 7. free chunk 为什么会出现 `fd/bk`

当 chunk 被释放后，它的用户数据区域不再需要保持原来的业务数据，allocator 可以复用这部分空间保存链表管理信息。

概念上可以这样看：

```
allocated chunk
+----------------+
| prev_size      |
+----------------+
| size           |
+----------------+
| user data      |
+----------------+

free chunk
+----------------+
| prev_size      |
+----------------+
| size           |
+----------------+
| fd             |
+----------------+
| bk             |
+----------------+
| ...            |
+----------------+
```

这解释了为什么 Heap Pwn 里“释放之后的 chunk 内容”和“使用中的 chunk 内容”会有明显差异。

## 8. `request2size()`：用户请求如何变成 chunk size

源码：

```
#define request2size(req) \
  (((req) + SIZE_SZ + MALLOC_ALIGN_MASK < MINSIZE) ? \
   MINSIZE : \
   ((req) + SIZE_SZ + MALLOC_ALIGN_MASK) & ~MALLOC_ALIGN_MASK)
```

逻辑：

```
用户 request
    |
    v
加入 allocator 所需的额外空间
    |
    v
按 MALLOC_ALIGNMENT 对齐
    |
    v
至少达到 MINSIZE
    |
    v
真正的 chunk size
```



### 常见 64 位示例（仅作理解）（详解请看附二）

在常见配置下：

- `SIZE_SZ = 8`
- `MALLOC_ALIGNMENT = 0x10`
- `MALLOC_ALIGN_MASK = 0xf`
- `MINSIZE` 常见为 `0x20`

例如请求：

```
malloc(0x20)
```

计算：

```
0x20 + 0x8 + 0xf = 0x37
0x37 & ~0xf = 0x30
```

所以会得到一个逻辑大小为 `0x30` 的 chunk。

> 注意：这里是理解源码的常见 64 位示例，不代表所有架构、所有 glibc 版本的常量都完全一样。

## 9. `MINSIZE` 为什么存在

源码：

```
#define MIN_CHUNK_SIZE \
    (offsetof(struct malloc_chunk, fd_nextsize))
#define MINSIZE \
    (unsigned long)(((MIN_CHUNK_SIZE+MALLOC_ALIGN_MASK) \
    & ~MALLOC_ALIGN_MASK))
```

核心含义：allocator 管理的 chunk 至少要有足够空间容纳它所需要的内部结构，并满足对齐条件。

所以 `MINSIZE` 不是“随便规定的最小数字”，而是由 chunk 内部布局和 alignment 推出来的。

## 10. 三种“关系”一图记住

| 关系           | 典型表达        | 含义                      |
| -------------- | --------------- | ------------------------- |
| 物理向后       | `prev_chunk(p)` | 前一个物理相邻 chunk      |
| 物理向前       | `next_chunk(p)` | 后一个物理相邻 chunk      |
| free-list 向前 | `p->fd`         | 链表中的下一个 free chunk |

**记忆句：地址决定物理关系，指针域决定链表关系。**

## 11. 三个关键宏：`set_head_size / set_head / set_foot`

源码：

```
#define set_head_size(p, s)  ((p)->size = (((p)->size & SIZE_BITS) | (s)))
#define set_head(p, s)       ((p)->size = (s))
#define set_foot(p, s)       (((mchunkptr) ((char *) (p) + (s)))->prev_size = (s))
```

区别：

- `set_head_size(p, s)`：改“真实 size 部分”，保留原有 flags。
- `set_head(p, s)`：整个 `size` 字段直接写成 `s`，flags 也一起由 `s` 决定。
- `set_foot(p, s)`：把 `s` 写到该 chunk 末尾对应的下一个 chunk 的 `prev_size` 位置，主要用于 free chunk。

这一组宏是理解后面的 split、合并、unsorted bin 和 `_int_free()` 的桥梁。

## 12. 复习时必须能脱口而出的 8 句话

1. `malloc()` 返回 user pointer，不是 chunk pointer。
2. 常见 64 位下，`mem2chunk()` / `chunk2mem()` 相差约 `0x10`。
3. `p->size` 不是纯 size，而是 `size + flags`。
4. `chunksize(p)` 会把 `SIZE_BITS` 清掉。(就是把低 3 位的标志PMA滤掉，只取出物理内存字节数。)
5. `PREV_INUSE` 表示前一个物理 chunk 是否在使用。
6. `next_chunk` 是物理相邻关系，`fd` 是 free-list 关系。
7. `request2size()` 把用户请求转换为对齐且满足最小尺寸要求的 chunk size。
8. free chunk 的用户区域可以被 allocator 当作 `fd/bk` 等内部链表空间复用。

## 13. 和 Heap Pwn 的连接（只建立概念，不背利用链）

- `size` 被破坏 -> 可能影响 allocator 对物理布局的判断。
- `PREV_INUSE` 被改变 -> 会影响 allocator 对前一块状态的判断。
- `prev_size` -> 参与向前定位和物理合并。
- `fd/bk` -> 是普通 free-list/bin 的链表元数据。
- `fd_nextsize/bk_nextsize` -> 与 large chunk 的 size-order 管理相关。

**当前阶段不要急着记 exploit 技巧。真正要形成的是“allocator 在内存里到底看到了什么”。**



---



## 附一：

## Glibc Heap Chunk Size 掩码对齐与标志位清除

### 1. 核心概念与公式

在 Glibc 内存管理中，由于 chunk 大小必须按 8 或 16 字节对齐，`size` 字段的**低 3 位（bit 0~2）永远用不上**，因此被借用来存储标志位（A/M/P）。

计算 Chunk 真实大小时，需要使用以下位运算清空低 3 位：

$$\text{Real Size} = \text{p->size} \ \& \ (\sim\text{SIZE\_BITS})$$

### 2. 详细推导（以 `p->size = 0x41` 为例）

#### ① 掩码（Mask）生成：`~SIZE_BITS`

- `SIZE_BITS` = `0x7` = `0000 0111`（二进制）
- `~` (按位取反)：把 `0` 变 `1`，`1` 变 `0`
- **掩码二进制**：`...1111 1000`
- **掩码十六进制**：`0xfffffffffffffff8`（64 位系统）

> **作用**：生成一个**低 3 位为 0，高位全为 1** 的掩码，用于清空低 3 位。

#### ② 按位与（`&`）运算：`0x41 & ~0x7`

按位与规则：**同 1 则 1，有 0 则 0**。

Plaintext

```
  0x41 (二进制):  0000 ... 0100 0001  (0x40 chunk 大小 + PREV_INUSE 标志位)
& Mask (二进制):  1111 ... 1111 1000  (~0x7 掩码)
------------------------------------
  结果 (二进制):  0000 ... 0100 0000  => 0x40 (真实 Chunk 大小)
```

### 3. 低 3 位标志位说明

| **标志位**             | **十六进制** | **含义**                                          |
| ---------------------- | ------------ | ------------------------------------------------- |
| **P** (PREV_INUSE)     | `0x1`        | 前一个 Chunk 是否在使用中（1 = 在用，0 = 空闲）。 |
| **M** (IS_MMAPPED)     | `0x2`        | 当前 Chunk 是否通过 `mmap` 分配。                 |
| **A** (NON_MAIN_ARENA) | `0x4`        | 当前 Chunk 是否属于非主 Arena。                   |

### 💡 一句话记忆

- **`0x41`** = `0x40`（真实大小）+ `0x01`（`PREV_INUSE` 标志）。
- **`& ~7`（即 `& -8`）** = 强制把数值**向下对齐到 8 的倍数**，过滤掉所有标志位。

---

## 附二：

## ptmalloc 内存分配核心机制：`request2size` 换算逻辑

### 1. 基础物理结构与核心常量 (64位系统)

| **常量**                | **16进制** | **10进制** | **物理含义与作用**                                           |
| ----------------------- | ---------- | ---------- | ------------------------------------------------------------ |
| **`SIZE_SZ`**           | `0x8`      | 8 字节     | `sizeof(size_t)`，即 `prev_size` 与 `size` 字段的大小        |
| **`MALLOC_ALIGNMENT`**  | `0x10`     | 16 字节    | 内存对齐粒度（64 位系统指针对齐要求）                        |
| **`MALLOC_ALIGN_MASK`** | `0xf`      | 15 字节    | 对齐掩码（`MALLOC_ALIGNMENT - 1`），用于二进制向上取整       |
| **`MINSIZE`**           | `0x20`     | 32 字节    | 系统允许的最小 Chunk 大小（`2 * SIZE_SZ + 2 * sizeof(char*)`） |

**用户视角**：只关心自己申请的裸内存 `req`（`malloc(req)`）。

**物理实际需求空间** = `req + SIZE_SZ`

#### 运算步骤分解：

1. **`+ SIZE_SZ`**：加入基础 Header 开销（8 字节）。

2. **`+ MALLOC_ALIGN_MASK`**：为二进制进位凑数（加上 `15`），使非 16 整除的余数产生进位。

3. **`& ~MALLOC_ALIGN_MASK`**：按位与 `~0xf`（即 `...FFFFFFFFFFFFFFF0`），强制清零低 4 位，完成**向上对齐到最近的 `0x10` 倍数**。

4. **校验 `MINSIZE`**：若计算值小于 `0x20`，强制取 `0x20`。

   

---



# 第二阶段：从“一个 chunk”进入“整个 malloc 仓库”

刚才已经学会了：

```
chunk
├── prev_size
├── size
└── 用户区 / free 时的内部字段
```

现在我们要在它上面再加一层：

```
                    malloc_state / arena
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
       fastbins           bins              top
          │                │                 │
       小 chunk        普通 free chunk     顶部剩余空间
```

# 

**主题**：`malloc_state` / `arena` / `fastbins` / `bins` / `top`

**本阶段目标**：第一阶段回答“一个 chunk 长什么样”；第二阶段回答“glibc 如何管理大量 chunk”。核心对象从 `malloc_chunk` 上升到 `malloc_state`（arena）。

## 架构总览

```
+-------------------+      +-------------------+      +-------------------+
|    fastbinsY[]    | ---> |      bins[]       | ---> |        top        |
|     快速路径        |      |     普通 bins     |      |    Arena 顶部      |
|   单链表 / LIFO    |      | unsorted/small/lrg|      |   不进入普通 bin    |
+-------------------+      +-------------------+      +-------------------+
                                     |
                                     v
                           +-------------------+
                           |  last_remainder   |
                           | 最近一次 split余料  |
                           +-------------------+
                                     |
                                     v
                           +-------------------+
                           |     binmap[]      |
                           | 记录“可能非空”bin   |
                           +-------------------+
                           [同一个 arena 的管理状态]
```

## 一、核心总图：`malloc_state` 是 arena 的控制中心

源码定义 `struct malloc_state`，核心字段包括 `fastbinsY`、`top`、`last_remainder`、`bins`、`binmap`，以及 arena 链表和内存统计。你的源码中 `main_arena` 是其中一个实例。

> **来源**：`malloc.c`，`struct malloc_state` / `main_arena` 相关代码（约 1370–1450 行）。

| **字段**                            | **作用**                | **记忆方式**                    |
| ----------------------------------- | ----------------------- | ------------------------------- |
| **`mutex`**                         | 同步访问 arena          | 管理者的锁                      |
| **`flags`**                         | arena 自身状态          | 不是 chunk 的 size flags        |
| **`fastbinsY[]`**                   | 快速释放的小 chunk 链表 | 快、单链、LIFO                  |
| **`top`**                           | arena 顶部连续备用空间  | 不进普通 bins                   |
| **`last_remainder`**                | 最近一次 split 的余料   | 最近余料                        |
| **`bins[]`**                        | 普通 bins 的头部数组    | unsorted / small / large        |
| **`binmap[]`**                      | 辅助搜索的位图          | 哪些 bin 可能非空               |
| **`next` / `next_free`**            | arena 链表关系          | arena 之间串起来                |
| **`system_mem` / `max_system_mem`** | arena 的系统内存统计    | 这个 arena 目前占了多少系统内存 |

## 二、fastbins：快速缓存区

源码：`mfastbinptr fastbinsY[NFASTBINS]`。`fastbin()` 宏按 index 找到某个 fastbin。源码明确说明 fastbins 是最近释放的小 chunk 的快速路径，采用单向链表和 LIFO。

### regular bins 的层次

```
+-------------------+
|   unsorted bin    |  刚释放 / split remainder 的中转站
+-------------------+  先给一次直接复用机会，再分拣
          |
          v
+-------------------+
|     smallbins     |  小尺寸 size class
+-------------------+  同一 bin 内 chunk 尺寸相同，查找快
          |
          v
+-------------------+
|     largebins     |  较大尺寸范围
+-------------------+  按范围索引，桶内还维护 size 顺序
```

**关键点**：fastbin 不使用普通 bin 的双向 `fd`/`bk` 结构来维护链表；它主要依赖 chunk 的 `fd`。源码还强调，fastbin 中的 chunk 暂时保留相关 in-use 标记，因此不会立即参与普通 consolidation；`malloc_consolidate()` 会在合适时机把 fastbin 中的 chunk 放出来并进行整合。

## 三、bins：普通 free chunk 的组织方式

你的源码设定 `NBINS=128`、`NSMALLBINS=64`。regular bins 是双向链表；bin header 本身被设计成可以“像 `malloc_chunk` 一样”使用，从而复用 `fd`/`bk` 链表逻辑。`bin_at()` 就是完成这种地址/类型解释的小技巧。

### 3.1 unsorted bin

源码把 unsorted bin 定义为 bin 1。刚释放的 chunk 和 split 后的 remainder 首先进入这里；malloc 会先给它们一次直接复用的机会，不合适的才进入 smallbin/largebin。最容易记忆的模型是：**“待分拣区”**。

### 3.2 smallbins

smallbin 对应离散的 size class，同一个 smallbin 内的 chunk 尺寸相同，所以找到对应 bin 后无需在桶内做复杂的 size 搜索。

### 3.3 largebins

largebin 对较大尺寸采用更宽的范围划分；桶内仍维护 size 顺序，因此大请求可以做 best-fit。源码还使用 `fd_nextsize` / `bk_nextsize` 辅助维护这种按尺寸的关系。

## 四、top：arena 顶部剩余连续空间

`top` 是 arena 当前可用内存的最顶部 chunk，不进入普通 bins。只有在普通 free chunks 无法满足请求时才考虑它；如果 top 也不够，则进入 `sysmalloc`。

- **要形成的直觉**：普通 bins 是“已经存在的 free chunks”；top 是“arena 尾部还没被切成独立 chunks 的连续备用空间”。

## 五、last_remainder 与 binmap

- **`last_remainder`**：记录最近一次小请求 split 后留下的 remainder，主要用于改善连续小请求时的局部性。
- **`binmap`**：是位图，不存 chunk；它只帮助 malloc 快速跳过那些明显没有可用 chunk 的 bin。源码特别说明：binmap 的位可能暂时是“旧状态”，直到遍历时发现该 bin 确实为空才清掉。

## 六、必须牢牢记住的五种“仓库”

1. **fastbin**：快速缓存；单链表；LIFO；延迟 consolidation。
2. **unsorted**：中转/待分拣区；刚释放或刚 split 的 chunk 先到这里。
3. **smallbin**：小尺寸 size class；同一桶尺寸相同；查找快。
4. **largebin**：大尺寸范围；桶内按 size 组织；支持 best-fit。
5. **top**：arena 顶部连续备用空间；不属于普通 bin。



---



# glibc malloc.c 精读笔记 · 第三阶段

> 主题：`_int_malloc()` —— 一次 `malloc()` 到底如何寻找、选取、切分并返回 chunk
> 复习定位：**理解整体分配路线，不追求把每一行代码背下来。**
>
> 本笔记严格围绕本次提供的 `malloc.c` 源码整理，核心函数位于约 `3319` 行开始的 `_int_malloc()`。

## 一、这一阶段到底学什么？

前两阶段已经分别解决：

```
阶段 1
一个 chunk 长什么样？
    ↓
malloc_chunk / prev_size / size / flags / fd / bk
阶段 2
chunk 放在哪里？
    ↓
arena / malloc_state
├── fastbins
├── unsorted
├── smallbins
├── largebins
└── top
```

第三阶段把这两层真正连接起来：

```
用户调用 malloc(bytes)
        ↓
      _int_malloc()
        ↓
   “我去哪里找一个合适的 chunk？”
```

核心答案：

```
bytes
  ↓
标准化为 nb
  ↓
fastbin
  ↓
smallbin
  ↓
unsorted
  ↓
largebin / 其他 bins
  ↓
top
  ↓
sysmalloc
```

> **一句话记忆：**`**_int_malloc()**` **就是 allocator 的“选 chunk + 返回 chunk”核心流程。**

# 二、先建立完整路线图

## 1. 主路线

```
                    _int_malloc(av, bytes)
                              │
                              ▼
                  checked_request2size()
                              │
                              ▼
                             nb
                              │
          ┌───────────────────┼──────────────────┐
          │                   │                  │
          ▼                   ▼                  ▼
      fastbin             smallbin        large request
          │                   │                  │
          │                   │             consolidate
          │                   │                  │
          └──────────────┬────┴──────────────────┘
                         ▼
                      unsorted
                         │
              ┌──────────┴──────────┐
              │                     │
          exact fit              不合适
              │                     │
              ▼                     ▼
            return              放入 bins
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                         smallbin            largebin
                                                │
                                            best-fit
                                                │
                                             binmap
                                                │
                                                ▼
                                              top
                                                │
                                  ┌─────────────┴─────────────┐
                                  │                           │
                                足够                         不足
                                  │                           │
                                  ▼                           ▼
                               split                    consolidate
                                  │                           │
                                  ▼                           ▼
                               return                    sysmalloc
```

# 三、`malloc()` 和 `_int_malloc()` 的关系

外围入口大致会先获得一个 arena：

```
arena_get(ar_ptr, bytes);
victim = _int_malloc(ar_ptr, bytes);
```

因此可以理解为：

```
malloc(bytes)
    │
    ├── 找到/选择 arena
    │
    ▼
_int_malloc(arena, bytes)
    │
    └── 真正寻找 chunk
```

所以本阶段最值得研究的是：

```
_int_malloc(mstate av, size_t bytes)
```

其中：

- `av`：当前 arena
- `bytes`：用户原始请求
- `nb`：allocator 内部标准化后的请求大小
- `victim`：当前正在考虑/准备返回的 chunk
- `remainder`：split 后剩下的 chunk

# 四、第一步：`bytes → nb`

源码首先执行：

```
checked_request2size(bytes, nb);
```

核心思想：

```
用户请求 bytes
      ↓
补 metadata / alignment
      ↓
满足 MINSIZE
      ↓
得到内部 chunk size
      ↓
nb
```

例如常见 64-bit 情况下：

```
malloc(0x20)
    ↓
nb 可能是 0x30
```

这里最容易犯的错：

```
bytes ≠ nb
```

`bytes` 是：

> 用户想要的 payload 大小

`nb` 是：

> allocator 实际按什么 chunk 大小去搜索、切分

所以之后看到：

```
smallbin_index(nb)
largebin_index(nb)
fastbin_index(nb)
```

都应该理解成：

> **“根据这次 malloc 真正需要的 chunk 大小去选择路径。”**

# 五、第二步：`av == NULL`

源码：

```
if (__glibc_unlikely(av == NULL))
{
    void *p = sysmalloc(nb, av);
    ...
    return p;
}
```

意思：

```
没有可用 arena
    ↓
不再搜索现有 bins
    ↓
sysmalloc()
```

这部分本阶段只记住：

> **已有 arena → 从 arena 找；没有 arena → 直接走系统内存路径。**

`sysmalloc()` 后面专门学习。

# 六、第三步：fastbin 快速路径

源码核心：

```
if ((unsigned long) nb <= get_max_fast())
{
    idx = fastbin_index(nb);
    ...
}
```

路线：

```
nb
 ↓
是否 <= max_fast ?
 ↓ 是
fastbin_index(nb)
 ↓
fastbinsY[idx]
 ↓
victim
 ↓
检查
 ↓
chunk2mem(victim)
 ↓
return
```

## 1. 为什么这么快？

因为 fastbin 的特点是：

```
小尺寸
+
固定 bucket
+
单链表
+
LIFO
```

所以找到对应 index 后，不需要做复杂搜索。

## 2. `victim` 是什么？

allocator 源码里的：

```
victim
```

不要翻译成“受害者”。

这里更接近：

> **当前选中的候选 chunk / 准备返回的 chunk。**

例如：

```
fastbinsY[idx]
      │
      ▼
   victim
```

## 3. 为什么还要检查 `fastbin_index(chunksize(victim))`？

源码会检查：

```
if (fastbin_index(chunksize(victim)) != idx)
    ...
```

因为 allocator 需要确认：

```
这个 victim 的真实 chunk size
        ↓
计算出来的 fastbin index
        ↓
确实还是当前 idx
```

也就是：

> **数据结构内部必须自洽。**

## 4. 最后为什么是 `chunk2mem(victim)`？

第一阶段已经学过：

```
chunk2mem(p) = p + 2 * SIZE_SZ
```

所以：

```
victim（chunk 指针）
        ↓
     chunk2mem
        ↓
用户拿到的 payload 指针
```

# 七、第四步：smallbin 路径

如果不是 fastbin，代码继续：

```
if (in_smallbin_range(nb))
{
    idx = smallbin_index(nb);
    bin = bin_at(av, idx);
    ...
}
```

路线：

```
nb
 ↓
smallbin range ?
 ↓ 是
smallbin_index(nb)
 ↓
对应 smallbin
 ↓
last(bin)
 ↓
victim
 ↓
返回
```

## 为什么 smallbin 不需要复杂搜索？

因为 smallbin 的设计就是：

> **一个 bin 对应一个固定 size class。**

可以想成：

```
smallbin A
    │
    ├── 0x40
    ├── 0x40
    └── 0x40

smallbin B
    │
    ├── 0x50
    ├── 0x50
    └── 0x50
```

因此：

```
进入正确 smallbin
      ↓
里面的 chunk 尺寸已经很明确
      ↓
不用在桶内部做复杂 best-fit
```

这也是 smallbin 比 largebin 简单的根本原因。

# 八、`set_inuse_bit_at_offset()` 在干什么？

smallbin 取 chunk 后会看到：

```
set_inuse_bit_at_offset(victim, nb);
```

这个宏不是简单地“修改 victim 的 in-use”。

它做的是：

```
victim
  │
  │ + nb
  ▼
next chunk
  │
  └── next->size |= PREV_INUSE
```

图：

```
victim
+--------------------+
| prev_size          |
| size               |
| user area          |
+--------------------+
          │
          │ nb
          ▼
next chunk
+--------------------+
| prev_size          |
| size | PREV_INUSE |
+--------------------+
```

也就是：

> **告诉下一个物理 chunk：它前面的 chunk 现在处于 in-use 状态。**

这正是第一阶段 `PREV_INUSE` 概念的实际应用。

# 九、第五步：large request 为什么可能先 `malloc_consolidate()`？

源码：

```
else
{
    idx = largebin_index(nb);

    if (have_fastchunks(av))
        malloc_consolidate(av);
}
```

意思：

```
nb 不属于 smallbin
      ↓
当前是大请求
      ↓
如果 fastbin 还有东西
      ↓
先 consolidation
```

为什么？

因为 fastbin 是一种：

> **延迟整理的快速路径。**

里面可能还有暂时没有合并的 free chunks。

面对较大的请求，allocator 更愿意：

```
先把 fastbin 整理出来
      ↓
尽可能获得可利用的连续空间
      ↓
再继续搜索
```

记忆：

```
小请求 → fastbin 更重要
大请求 → 先考虑把 fastbin 清理/合并
```

# 十、真正核心：unsorted bin

接下来进入：

```
while ((victim = unsorted_chunks(av)->bk)
       != unsorted_chunks(av))
```

这意味着：

> `_int_malloc()` 会主动处理 unsorted 中最近进入的 chunk。

可以把 unsorted 理解成：

```
           新进入的 free/remainder
                     │
                     ▼
             ┌───────────────┐
             │    unsorted   │
             │   待分拣区     │
             └───────┬───────┘
                     │
             malloc 来检查
                     │
          ┌──────────┴──────────┐
          │                     │
       exact fit             不合适
          │                     │
          ▼                     ▼
        直接用              放进 regular bins
```

## 一句话记忆

> **unsorted = “先给它一次直接复用机会，再决定最终去哪”。**

# 十一、unsorted 里首先检查什么？

源码会先：

```
size = chunksize(victim);
```

注意：

```
victim->size
```

包含 flags；

而：

```
chunksize(victim)
```

是把 `SIZE_BITS` 去掉后的真实 chunk size。

所以：

```
victim->size  = size + flags
size           = 纯 chunk size
```

这是第三阶段必须保持的习惯。

# 十二、特殊路径：`last_remainder`

源码存在一个特殊条件：

```
if (in_smallbin_range(nb) &&
    bck == unsorted_chunks(av) &&
    victim == av->last_remainder &&
    size > nb + MINSIZE)
```

它表达的是：

```
当前是小请求
+
unsorted 里几乎只有这个 chunk
+
这个 chunk 正好是 last_remainder
+
还足够大可以继续切
```

于是：

```
last_remainder
      ↓
再次 split
      ↓
一部分给本次 malloc
      ↓
新的 remainder 留下来
```

核心目的是源码所说的：

> 改善连续小请求时的 locality。

复习时只记：

> `**last_remainder**` **是最近一次切分留下的“余料”，对连续小请求有专门优化路径。**

# 十三、unsorted exact fit

如果某个 chunk：

```
if (size == nb)
```

说明：

```
victim size
     =
这次正好需要的 nb
```

于是：

```
unsorted
   │
   └── victim
          │
       exact fit
          │
          ▼
       直接返回
```

这也是为什么 unsorted 很重要：

> 刚 free 的 chunk，不一定要等进 smallbin / largebin；它可能下一次 malloc 就直接被重新利用。

# 十四、unsorted 中不是 exact fit 怎么办？

这时候 allocator 开始“分拣”。

```
victim
  │
  ├── size 属于 smallbin 范围
  │       ↓
  │    smallbin
  │
  └── size 属于 largebin 范围
          ↓
       largebin
```

所以要牢记：

> **判断的是“当前 victim 的 size 属于什么类别”。**

不是在判断：

> “用户这次请求属于什么类别”。

这是一个很常见的阅读误区。

# 十五、largebin 为什么需要 `fd_nextsize / bk_nextsize`？

smallbin 基本是：

```
固定 size class
      ↓
普通双向链
```

largebin 则是：

```
一段较宽的 size 范围
      ↓
同一个 bin 内可能有不同大小
      ↓
需要维护 size 顺序
      ↓
才能做 best-fit
```

因此 large chunk 需要两组关系：

```
普通 bin 链：

A <-> B <-> C <-> D
    ↑
  fd / bk


size 顺序辅助关系：

A =====> C =====> D
    ↑
fd_nextsize / bk_nextsize
```

两套关系不要混。

# 十六、三个“next”一定不要混

这是本阶段非常重要的复习点：

| 表达式           | 含义                                |
| ---------------- | ----------------------------------- |
| `next_chunk(p)`  | **物理地址上**下一个 chunk          |
| `p->fd`          | 当前 free-list 中的下一个节点       |
| `p->fd_nextsize` | largebin 中按 size 关系的下一个节点 |

图：

```
物理内存：

P ────────→ next_chunk(P)


普通 bin：

P ────────→ P->fd


largebin size 顺序：

P ────────→ P->fd_nextsize
```

它们完全可能指向三个不同的 chunk。

# 十七、`unlink()`：从双向链表中摘掉 victim

核心源码逻辑：

```
FD = P->fd;
BK = P->bk;

if (FD->bk != P || BK->fd != P)
    error;

FD->bk = BK;
BK->fd = FD;
```

假设：

```
A <-> P <-> B
```

则：

```
P->bk = A
P->fd = B
```

执行 unlink 后：

```
A <----------> B

     P 被摘掉
```

对应：

```
B->bk = A;
A->fd = B;
```

# 十八、为什么 largebin 的 unlink 更复杂？

因为 large chunk 还有第二套 size-order 关系：

```
fd / bk
    +
fd_nextsize / bk_nextsize
```

因此 unlink 不仅需要：

```
A <-> P <-> B
```

还要保证：

```
size-prev <-> P <-> size-next
```

源码会进一步检查：

```
P->fd_nextsize->bk_nextsize == P
P->bk_nextsize->fd_nextsize == P
```

所以：

```
smallbin unlink
    ↓
只需关心普通双链

largebin unlink
    ↓
普通双链
+
size-order 关系
```

这就是 largebin 源码明显更复杂的原因。

# 十九、best-fit：为什么 largebin 要排序？

假设：

```
largebin 中：

0x320
0x380
0x420
0x500
0x700
```

请求：

```
nb = 0x400
```

符合要求的：

```
0x420
0x500
0x700
```

best-fit 选择：

```
0x420
```

也就是：

> **满足请求的最小 chunk。**

所以 largebin 必须维护足够的 size 顺序信息，方便找到“最合适的大块”。

# 二十、split：一个 chunk 变成两个 chunk

取到：

```
victim size = size
```

请求：

```
nb
```

先算：

```
remainder_size = size - nb;
```

然后根据：

```
remainder_size < MINSIZE ?
```

分两种情况。

## 情况 A：剩余空间太小

```
size - nb < MINSIZE
```

说明剩下的部分连一个合法 chunk 都不够。

所以：

```
整个 victim 基本都给这次 malloc
```

图：

```
原 victim

+---------------------------+
|         victim            |
|                           |
+---------------------------+

                ↓ malloc

+---------------------------+
|      用户得到的 chunk     |
+---------------------------+
```

不再单独产生 remainder。

## 情况 B：剩余空间足够

```
size - nb >= MINSIZE
```

于是：

```
remainder = chunk_at_offset(victim, nb);
```

得到：

```
原 victim

+----------------+----------------------+
|      nb        |      remainder       |
+----------------+----------------------+
       ↑                    ↑
   返回用户             继续作为 free
```

这就是 allocator 最核心的 split 操作。

# 二十一、split 后 remainder 为什么进入 unsorted？

源码会把 remainder 插回：

```
unsorted
```

所以完整过程：

```
largebin
   │
   ▼
找到 victim
   │
 unlink
   │
   ▼
+------------------+-------------------+
|      nb          |    remainder      |
+------------------+-------------------+
       │                    │
       │                    │
       ▼                    ▼
     用户                unsorted
```

为什么不是立即再分类？

因为 allocator 希望：

> **新产生的 remainder 先获得一次直接复用机会。**

下一次 malloc：

```
unsorted
   ↓
exact fit ?
   ↓
是 → 直接拿走
```

所以 unsorted 是一种：

> **延迟分拣 / 快速再利用机制。**

# 二十二、binmap 在这里做什么？

如果当前 bin 没找到足够大的 chunk，allocator 会继续扫描更大的 bins。

但是没必要：

```
bin 65
bin 66
bin 67
bin 68
bin 69
...
```

一个个检查。

因此：

```
binmap
```

用 bit 表示：

```
某个 bin “可能有东西”
```

搜索逻辑：

```
binmap
   ↓
跳过明显为空的 bin
   ↓
找到可能非空的 bin
   ↓
检查实际链表
```

注意：

> `binmap` 是加速索引，不是绝对真值表。

源码会在实际检查到“假阳性”时把对应 bit 清掉。



---



# 二十三、这一阶段最应该背下来的“12 句话”

1. `**bytes**` **是用户请求，**`**nb**` **是内部标准化后的 chunk size。**
2. `**victim**` **就是当前被 allocator 选中的 chunk。**
3. **fastbin 是小块的快速路径，按 index 直接定位。**
4. **smallbin 一个 bin 对应一个 size class，所以不需要复杂搜索。**
5. **unsorted 是刚进入 allocator 的 free/remainder 的待分拣区。**
6. **unsorted 中如果 exact fit，可以直接返回，不必进入 regular bins。**
7. **largebin 内部存在不同 size，因此需要 size-order 信息。**
8. `**fd/bk**` **是普通 bin 链，**`**fd_nextsize/bk_nextsize**` **是 largebin size 关系。**
9. `**next_chunk(p)**` **是物理相邻关系，与** `**p->fd**` **完全不同。**
10. `**unlink()**` **的本质是把 victim 从双向 free-list 中摘掉。**
11. **split 的本质是：**`**victim = nb + remainder**`**。**
12. **新 remainder 通常重新进入 unsorted，等待下一次 malloc 再决定最终去向。**

# 二十四、第三阶段 8 个问题 + 标准答案

## 1. 为什么 smallbin 不需要像 largebin 一样复杂搜索？

因为 smallbin 按 size class 分类。

进入对应 smallbin 后：

```
bin
 ↓
chunk
chunk
chunk
```

这些 chunk 本身就是同一类尺寸，因此无需再做复杂 best-fit 搜索。

## 2. 为什么 unsorted 不是最终存放位置？

因为它主要承担：

> **刚 free / 刚 split chunk 的中转与快速复用。**

allocator 会先给 chunk 一次机会：

```
exact fit ?
```

不匹配时，再把它分到：

```
smallbin / largebin
```

## 3. 大 chunk split 后，`victim` 和 `remainder` 分别是什么？

例如：

```
原 chunk = 0x100
请求     = 0x40
```

那么：

```
victim    = 0x40
remainder = 0xc0
```

图：

```
+-----------+------------------+
|  victim   |    remainder     |
|   0x40    |      0xc0        |
+-----------+------------------+
```

victim 最终给用户；remainder 保留下来作为 free chunk。

## 4. 为什么 remainder 经常重新进入 unsorted？

因为它是：

> **刚刚新产生的 free chunk。**

allocator 不急着马上做最终分类，而是先进入 unsorted：

```
remainder
   ↓
unsorted
   ↓
下一次 malloc
   ↓
可能 exact fit → 直接复用
```

这样可以减少不必要的重新分类。

## 5. 为什么 allocator 在使用 top 前，要先尽量搜索已有 bins？

因为 top 只是：

> arena 顶部的最后备用空间。

如果已经存在一个更加合适的 free chunk，优先复用它可以避免：

```
不断消耗 top
```

从而减少不必要的内存扩张。

因此整体思路是：

```
已有 free chunks
      ↓
先尽可能利用
      ↓
都不合适
      ↓
才考虑 top
```

## 6. 为什么 top 不够时，还可能先 `malloc_consolidate()`，最后才 `sysmalloc()`？

因为 fastbin 里可能仍然有：

```
暂时没有合并的 free chunks
```

于是 allocator 会先：

```
fastbins
   ↓
malloc_consolidate
   ↓
尽可能合并/整理
   ↓
再次尝试
```

只有现有 arena 真正无法满足时，才进一步：

```
sysmalloc()
```

向系统申请更多内存。

# 二十五、最容易混淆的 6 个点

## ① `bytes` vs `nb`

```
bytes = 用户请求
nb    = 内部请求
```

## ② `victim->size` vs `chunksize(victim)`

```
victim->size
    = size + flags

chunksize(victim)
    = 去掉 SIZE_BITS 后的真实 size
```

## ③ `next_chunk()` vs `fd`

```
next_chunk(p)
    = 物理相邻

p->fd
    = free-list 相邻
```

## ④ `fd/bk` vs `fd_nextsize/bk_nextsize`

```
fd/bk
    = 普通链表

fd_nextsize/bk_nextsize
    = largebin size 关系
```

## ⑤ unsorted ≠ 最终 bin

```
unsorted
    ↓
先尝试直接复用
    ↓
不合适
    ↓
再分类
```

## ⑥ split ≠ free

split 只是：

```
一个 chunk
    ↓
两个 chunk
```

新产生的 remainder 是 free chunk，但它首先进入：

```
unsorted
```

而不是立刻进入最终 regular bin。

