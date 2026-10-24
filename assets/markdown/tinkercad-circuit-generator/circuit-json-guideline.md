### Circuit JSON Guideline

Circuit JSON (`circuit.json`) represents the components and connections of a circuit. It has three main sections: `breadboards`, `parts`, and `wires`.

Basic Structure :

```json
{
    "breadboards": {},
    "parts": {},
    "wires": {}
}
```

`breadboards` contains entries with unique keys (`breadboard_id`), one per breadboard. Each entry stores its stage numbers as `[stage_x, stage_y]`.

**Notes :**

- Stage Numbers must not have gaps in Serial Order.
- Breadboard have 30 columns. Rows don't matter.
- Power Connections are Auto-Generated.

Example :

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

`parts` contains entries with unique keys (`part_id`), one per component. Each entry stores the component type and its placement on a breadboard.

- `type` is one of the supported types: `switch_dip_4`, `switch_dip_6`, `led`, or an IC code (see list below).
- `place` is a string in the format `breadboard_id.column_number`.

Available IC codes :

- `ic_74hc00`: Quad 2-input NAND gate
- `ic_74hc02`: Quad 2-input NOR gate
- `ic_74hc04`: Hex inverter (NOT gate)
- `ic_74hc08`: Quad 2-input AND gate
- `ic_74hc10`: Triple 3-input NAND gate
- `ic_74hc11`: Triple 3-input AND gate
- `ic_74hc20`: Dual 4-input NAND gate
- `ic_74hc21`: Dual 4-input AND gate
- `ic_74hc27`: Triple 3-input NOR gate
- `ic_74hc32`: Quad 2-input OR gate
- `ic_74hc86`: Quad 2-input XOR gate

**Notes :**

- Component always places its terminals horizontally on Breadboard.
- Power connections are Auto-Generated.

Component have different terminals used in `place` :

- `switch_dip_4` and `switch_dip_6`: Switch 1 or 1A/1B
- `led`: Cathode
- IC code: GND or Pin-7

Example :

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

`wires` contains entries with unique keys (`channel_id`), one per channel. Each entry stores the wire color (`color`) and an array of connections (`pairs`).

A channel is the main route that multiple wires can share, grouping them together. A pair is a single wire connecting two terminals, written as an array of two strings in the format `part_id.terminal_name`.

**Note :**

- See TinkerCAD to find the terminal name of each part.

Example :

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

**Follow these rules, or it won't work!**
