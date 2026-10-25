// The Learn tab's course outline, from a first Arduino sketch up to the instruction set.
// Titles and summaries are placeholders to rewrite. To add a lesson video, set `video` to a file URL
// (e.g. '/videos/blink.mp4' in the public folder) or a YouTube link.

export interface Lesson {
  id: string
  title: string
  summary: string
  video?: string
}

export interface Unit {
  id: string
  title: string
  lessons: Lesson[]
}

export const COURSE: Unit[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    lessons: [
      { id: 'what-is-arduino', title: 'What is an Arduino?', summary: 'The board, the microcontroller on it, and what it can do.' },
      { id: 'board-tour', title: 'A Tour of the Board', summary: 'Pins, power, USB and the parts you will use most.' },
      { id: 'first-sketch', title: 'Your First Sketch: Blink', summary: 'Write, compile and run a program that blinks an LED.' },
      { id: 'setup-loop', title: 'setup() and loop()', summary: 'How every Arduino program starts and keeps running.' },
    ],
  },
  {
    id: 'electronics',
    title: 'Electronics Basics',
    lessons: [
      { id: 'ohms-law', title: 'Voltage, Current and Resistance', summary: "Ohm's law and why it matters for every circuit." },
      { id: 'leds-resistors', title: 'LEDs and Resistors', summary: 'Why an LED needs a resistor, and how to pick one.' },
      { id: 'breadboards', title: 'Breadboards and Wiring', summary: 'How the rows and rails connect, and how to build a circuit.' },
      { id: 'buttons', title: 'Buttons and Pull-up Resistors', summary: 'Reading a button reliably as an input.' },
    ],
  },
  {
    id: 'programming',
    title: 'Programming the Arduino',
    lessons: [
      { id: 'variables', title: 'Variables and Types', summary: 'Storing numbers, and how big each type is.' },
      { id: 'digital-io', title: 'Digital Input and Output', summary: 'pinMode, digitalWrite and digitalRead.' },
      { id: 'timing', title: 'Timing with delay() and millis()', summary: 'Waiting, and keeping time without stopping the program.' },
      { id: 'control-flow', title: 'Conditions and Loops', summary: 'if, for and while on a microcontroller.' },
      { id: 'functions', title: 'Functions', summary: 'Breaking a sketch into reusable pieces.' },
    ],
  },
  {
    id: 'inside',
    title: 'Inside the Microcontroller',
    lessons: [
      { id: 'compiling', title: 'From C++ to Machine Code', summary: 'What compiling does, and what a .hex file holds.' },
      { id: 'registers-memory', title: 'Registers and Memory', summary: 'The 32 registers, SRAM, flash, and I/O registers.' },
      { id: 'io-ports', title: 'I/O Ports: DDR, PORT and PIN', summary: 'What digitalWrite really changes inside the chip.' },
      { id: 'timers-interrupts', title: 'Timers and Interrupts', summary: 'How millis() keeps counting in the background.' },
    ],
  },
  {
    id: 'isa',
    title: 'Instruction Set Architecture',
    lessons: [
      { id: 'what-is-isa', title: 'What is an ISA?', summary: 'The contract between software and the processor.' },
      { id: 'encoding', title: 'Instruction Formats and Encoding', summary: 'How opcodes and operands are packed into 16 bits.' },
      { id: 'sreg', title: 'The Status Register and Flags', summary: 'Carry, zero, negative and how branches use them.' },
      { id: 'branches-stack', title: 'Branches, Calls and the Stack', summary: 'Jumping around a program and returning from functions.' },
      { id: 'reading-disassembly', title: 'Reading Blink, Instruction by Instruction', summary: 'Step through a real program in the debugger.' },
    ],
  },
]
