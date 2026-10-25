// Geometry of the Arduino board drawing (src/ArduinoBoard.tsx), in the drawing's own coordinates.

// Spacing between header sockets.
export const PITCH = 22

// Header socket positions in the board drawing's own coordinates, so the workbench can wire to them.
// `id` is unique per socket; `net` is the electrical pin, so the three GND sockets share net "GND".
export interface BoardPin {
  id: string
  net: string
  label: string
  x: number
  y: number
}

function headerPins(x: number, y: number, ids: (string | null)[], labels: string[]): BoardPin[] {
  return ids.flatMap((id, i) =>
    id ? [{ id, net: id.split('.')[0], label: labels[i], x: x + 11 + i * PITCH, y: y + 13 }] : [],
  )
}

export const BOARD_PINS: BoardPin[] = [
  ...headerPins(240, 16, ['SCL', 'SDA', 'AREF', 'GND.1', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'], ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8']),
  ...headerPins(476, 16, ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'], ['7', '~6', '~5', '4', '~3', '2', 'TX 1', 'RX 0']),
  ...headerPins(240, 492, [null, 'IOREF', 'RESET', '3V3', '5V', 'GND.2', 'GND.3', 'VIN'], ['', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN']),
  ...headerPins(476, 492, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'], ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']),
]

// The drawing's viewBox; BoardGroup uses it to place the board inside another SVG.
export const BOARD_VIEWBOX = { x: -40, y: -6, w: 740, h: 548 }
