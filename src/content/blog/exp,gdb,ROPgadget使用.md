---
title: exp,gdb,ROPgadget使用（简略）
description: "简略版，作为作者的笔记小库..."
date: 2026-10-05
category: 学习笔记
tags: [exp,gdb,ROPgadget]
math: false
---
## gdb调试：

info b:查看断点有哪些 ； 

d 1：d是delete，然后是删除断点1 ；

c :继续运行，直到遇到输入或者是下一个断点

backtrace：显示函数调用栈（其中蕴含着父类子类函数关系）

return：退出当前函数，一般用来退出库函数，回到main函数

gdb：打完断点后，进行r，比如断在了main函数上，之后可以通过n（步过）一行行往下走，直到来到有漏洞的行或者函数，可以在DISASM中看，有小箭头指的就是目前到了哪一行，然后按s（步进）就进入了函数

---

## EXP

1.elf.symbols["buf2"]：获取buf2地址

elf.plt["gets"]：获取gets的plt表地址

2.假如有一个gets函数，输入一个'12/n'，机器收到的是ACSII码，1的ASCII是49，49对应的十六进制是0x31，所以我输入的其实是0x31320a（0a对应的是换行符）

![image-20260917153044661](/Eraser4u-s-blog/images/exp,gdb,ROPgadget/image-20260917153044661.png)


这一个函数就是将0x31320a转化为12对应的0xc

然后重命名就是点击v8，再按n就可以重命名

3.在libc泄露地址的时候，先用recv()接收到的是小端序的地址，我们要把地址通过u32（）使其变成整数，然后用hex()将其变成十六进制数字

4.libc.symbols["write"] 获取write在libc中的偏移

next(libc.search[b'/bin/sh']) 这是在libc中搜素第一个字符串/bin/sh的偏移 

hex()  :  将十进制整数改为十六进制 （一般u32()转完就用hex()再转）

.recv()[4:8]  :  取接收到的数据中**索引为 4 到 7 的 4 个字节**（Python 的切片是左闭右开 `[4:8]`，32位系统下地址占四个字节）。

u32()  :  将小端序的数据修改为十进制整数

send和sendline的区别：sendline会自动在最后加上一个换行符，像是gets()这样的函数，只有读取到换行符的时候才会停下，所以就用sendline

---

## ROPgadget
1.ROPgadget --binary 文件 --only "pop|ret" | grep eax
grep前面的|是管道符，作用是将管道符前面的输出作为管道符后面的输入，起到数据传输的作用

2.假如我现在要找/bin/sh的地址，我可以先elf = ELF("./ret2syscall")，然后elf.search("/bin/sh")

或者是ROPgadget --binary 文件 --string"/bin/sh"


