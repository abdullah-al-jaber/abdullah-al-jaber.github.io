### Circuit JSON Guideline

`Root Of JSON` (object-type) contains :
1. `breadboards` - (object-type)
2. `parts` -  (object-type)
3. `wires` -  (object-type)

`breadboards` contains :
- `breadboard_id` - (object-type)
    - Format: "brd#<n>" (unique)
    - stage: integer [1-n] [No Gap]

2. parts
    - Key: "<type>#<n>" (e.g. "swt#1", "ic#1", "led#1")
    - type: one of the supported types (switch_dip_4, switch_dip_6, ic_74hc00, led, resistor)
    - place: "brd#<n>.<column>" (column is a number, e.g. "brd#1.27")

3. wires
    - Key: "channel#<n>" (unique)
    - color: red, black, or green
    - nodes: array of [from, to] pairs, each in "<part>.<terminal>" form (e.g. "swt#1.1A")

Template:

```json
{
    "breadboards": {
        "brd#1": { "stage": 1 }
    },
    "parts": {
        "led#1": { "type": "led", "place": "brd#1.10" }
    },
    "wires": {
        "channel#1": { "color": "green", "nodes": [["swt#1.1A", "led#1.1A"]] }
    }
}
```

Checklist before generating:

- Every part's place references an existing breadboard
- Stage numbers are consecutive starting at 1
- Every wire node references an existing part and valid terminal
- Keys are unique within their section
