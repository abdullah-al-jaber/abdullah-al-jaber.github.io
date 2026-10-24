### Circuit JSON Guideline

Circuit JSON (`circuit.json`) is a structured json format used to represent the components and connections of a circuit in Tinkercad. The JSON structure consists of three main sections: `breadboards`, `parts`, and `wires`.

Below is the basic structure of the `circuit.json` file:

```json
{
    "breadboards": {},
    "parts": {},
    "wires": {}
}
```

`breadboards` contains entries with unique keys (`breadboard_id`) representing each breadboard in the circuit. Entries store the stage numbers in array `[stage_x, stage_y]`.

**Note: Stage Numbers can't contain Any Gaps in Serial Order**

Below is an example of a `breadboards` entry:

```json
{
    "breadboards": {
        "brd#1": [1, 1],
        "brd#2": [2, 1]
    },
    "parts": {},
    "wires": {}
}
```

`parts` contains entries with unique keys (`part_id`) representing each component in the circuit. Entries store the type of component and its placement on a breadboard.

- `type` is one of the supported types: `switch_dip_4`, `switch_dip_6`, `led`, IC code (See List).
- `place` is a string in the format `breadboard_id.column_number`.

Available IC codes :

- `ic_74hc00` - Quad 2-input NAND gate
- `ic_74hc02` - Quad 2-input NOR gate
- `ic_74hc04` - Hex Inverter or NOT gate
- `ic_74hc08` - Quad 2-input AND gate
- `ic_74hc10` - Triple 3-input NAND gate
- `ic_74hc11` - Triple 3-input AND gate
- `ic_74hc20` - Dual 4-input NAND gate
- `ic_74hc21` - Dual 4-input AND gate
- `ic_74hc27` - Triple 3-input NOR gate
- `ic_74hc32` - Quad 2-input OR gate
- `ic_74hc86` - Quad 2-input XOR gate

**`part` always place terminals horizontally on `breadboard`.**

Column Number Positioning:

- `switch_dip_4` and `switch_dip_6` - Switch 1
- `led` - Cathode
- `ic_code` - Pin 1

Below is an example of a `parts` entry:

```json
{
    "breadboards": {
        "brd#1": [1, 1]
    },
    "parts": {
        "swt#1": { "type": "switch_dip_4", "place": "brd#1.5" },
        "led#1": { "type": "led", "place": "brd#1.10" },
        "ic#1": { "type": "ic_74hc00", "place": "brd#1.15" }
    },
    "wires": {}
}
```

`wires` contains entries with unique keys (`channel_id`) representing each channel in the circuit. Entries store the color of the wire (`color`) and the array of pair (`pairs`) connection.

Channel is the main route that multiple wires can share, grouping wires together. Pair is actually the wire that connect two terminals of part, which is an array of two strings, where each string represents a terminal in the format `part_id.terminal_name`.

**See TinkerCAD to find the terminal name of each part.**

Below is an example of a `wires` entry:

```json
{
    "breadboards": {
        "brd#1": [1, 1]
    },
    "parts": {
        "swt#1": { "type": "switch_dip_4", "place": "brd#1.5" },
        "led#1": { "type": "led", "place": "brd#1.10" }
    },
    "wires": {
        "channel#1": { "color": "green", "pairs": [["swt#1.1A", "led#1.Anode"]] }
    }
}
```

**Please Follow or It won't Work !**
