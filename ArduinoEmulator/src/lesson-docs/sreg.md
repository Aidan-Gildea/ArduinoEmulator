How does a CPU make a decision? It can't evaluate `if (x == 10)` directly. Instead, an arithmetic instruction leaves notes about its result in the **status register**, and a branch instruction reads those notes to decide where to go.

## The eight flags

SREG is an 8-bit I/O register (data address `0x5F`). Each bit is a **flag**:

| Bit | Flag | Set when |
|---|---|---|
| 7 | **I** Interrupt enable | Interrupts are allowed (set by SEI, cleared by CLI) |
| 6 | **T** Bit copy | Used by the BST and BLD instructions |
| 5 | **H** Half carry | A carry passed out of bit 3 (used for decimal math) |
| 4 | **S** Sign | N XOR V: the true sign of the result, even after overflow |
| 3 | **V** Overflow | The signed result didn't fit in 8 bits |
| 2 | **N** Negative | Bit 7 of the result is 1 |
| 1 | **Z** Zero | The result is exactly 0 |
| 0 | **C** Carry | An unsigned result didn't fit: a carry out of bit 7, or a borrow |

Arithmetic and logic instructions update these flags. Data transfer instructions like `MOV` and `LDI` don't touch them.

## Worked examples

**200 + 100 in 8 bits.** The true answer, 300, doesn't fit in a byte (maximum 255). The result is 300 − 256 = **44**, and the carry out is recorded in **C = 1**. Z = 0 (not zero), N = 0 (bit 7 is clear).

**100 + 100.** The result, 200, fits in a byte, so C = 0. But read as signed numbers (−128 to 127), two positives just produced a "negative" byte: bit 7 is set, so **N = 1**, and **V = 1** flags the signed overflow. S = N XOR V = 0, correctly saying the true answer is positive.

**5 − 5.** The result is 0, so **Z = 1**.

## Comparing and branching

To compare two values, the CPU subtracts them and keeps only the flags. `CP Rd, Rr` does exactly that: it computes Rd − Rr, updates the flags, and throws the result away. A conditional branch then reads the flags:

| Branch | Taken when | Use after CP a, b for |
|---|---|---|
| `BREQ` | Z = 1 | a == b |
| `BRNE` | Z = 0 | a != b |
| `BRLO` (`BRCS`) | C = 1 | a < b, unsigned |
| `BRSH` (`BRCC`) | C = 0 | a ≥ b, unsigned |
| `BRLT` | S = 1 | a < b, signed |
| `BRGE` | S = 0 | a ≥ b, signed |

Unsigned and signed comparisons need different branches, which is one reason the compiler cares whether your variable is `int` or `unsigned int`.

## A loop in assembly

Here is a loop that runs ten times:

```asm
        ldi  r16, 10      ; counter = 10
again:
        dec  r16          ; counter = counter - 1, sets Z when it reaches 0
        brne again        ; Z = 0? go round again
        ; ...carries on here once r16 is 0
```

`DEC` updates Z, so no separate compare is needed. When r16 reaches 0, Z becomes 1, `BRNE` isn't taken, and execution falls through. Counting down to zero is a classic trick because it saves an instruction on every pass.

> [!TIP]
> EEXPO's debugger shows the eight SREG flags as lights. Step through any compiled sketch and watch Z and C change after every `CP`, `SUB` or `DEC`.

## Key ideas

- SREG holds eight flags describing the last arithmetic or logic result.
- Z = zero, C = unsigned carry or borrow, N = bit 7 set, V = signed overflow, S = the true sign.
- `CP` subtracts to set the flags without keeping the result.
- Conditional branches read the flags; there are separate branches for signed and unsigned comparisons.

```quiz
Q: After CP r24, r25 where both registers hold 7, which flag is set?
- [x] Z
- [ ] C
- [ ] N
- [ ] V
= CP computes 7 − 7 = 0, so the Zero flag is set. Nothing borrowed or overflowed.

Q: What do 250 + 10 in an 8-bit register give, and which flag records the lost part?
- [ ] 260, with Z set
- [x] 4, with C set
- [ ] 255, with V set
- [ ] 0, with Z set
= 260 doesn't fit in a byte, so it wraps to 260 − 256 = 4, and the carry out of bit 7 sets C.

Q: Which branch would you use after CP a, b to jump when a < b for unsigned numbers?
- [ ] BRLT
- [x] BRLO
- [ ] BREQ
- [ ] BRGE
= BRLO (branch if lower) checks the carry flag, which is right for unsigned comparisons. BRLT uses the sign flag, for signed numbers.
```
