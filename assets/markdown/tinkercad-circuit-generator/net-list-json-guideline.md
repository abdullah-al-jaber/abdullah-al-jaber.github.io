### Net-List JSON Guideline

Net-List JSON (`net-list.json`) contains the blueprint of circuit. Learn Format from Example :

```json
{
    "boards": [
        { "id": "BRD#1", "at": [0, 0] },
        { "id": "BRD#2", "at": [0, 1] }
    ],
    "parts": [
        { "id": "SWT#1", "type": "switch_dip_6", "anchor": "1B@BRD#2:2" },
        { "id": "IC#1", "type": "ic_74hc86", "anchor": "1A@BRD#1:2" },
        { "id": "IC#2", "type": "ic_74hc08", "anchor": "1A@BRD#1:12" },
        { "id": "IC#3", "type": "ic_74hc32", "anchor": "1A@BRD#1:22" },
        { "id": "LED#1", "type": "led", "anchor": "Anode@BRD#2:22" },
        { "id": "LED#2", "type": "led", "anchor": "Anode@BRD#2:26" }
    ],
    "wires": [
        ["SWT#1.1A", "IC#1.1A", "red"],
        ["SWT#1.2A", "IC#1.1B", "orange"],
        ["SWT#1.3A", "IC#1.2B", "green"],

        ["IC#1.1Y", "IC#1.2A", "blue"],
        ["IC#1.2Y", "LED#1.Anode", "purple"],

        ["SWT#1.1A", "IC#2.1A", "red"],
        ["SWT#1.2A", "IC#2.1B", "orange"],

        ["IC#1.1Y", "IC#2.2A", "green"],
        ["SWT#1.3A", "IC#2.2B", "blue"],

        ["IC#2.1Y", "IC#3.1A", "purple"],
        ["IC#2.2Y", "IC#3.1B", "white"],

        ["IC#3.1Y", "LED#2.Anode", "yellow"]
    ]
}
```

**Notes :**

- Format of `anchor`: `"TERMINAL_NAME@BOARD_ID:COLUMN_NUMBER"`
- Automatic Power Connection Design. Focus Only On Logical Wiring.
- Wire Color Must Be One Of Following - `black` , `red` , `orange` , `yellow` , `green` , `turquoise` , `blue` , `purple` , `pink` , `brown` , `grey` , `white`.
- Board Have 30 Columns. Enough Spacing Between Parts Are Preferred.
- Following Are Parts And Terminals Available -

```json
{
    "ic_74hc00": ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND", "3Y", "3A", "3B", "4Y", "4A", "4B", "Vcc"],
    "ic_74hc02": ["1Y", "1A", "1B", "2Y", "2A", "2B", "GND", "3A", "3B", "3Y", "4A", "4B", "4Y", "Vcc"],
    "ic_74hc04": ["1A", "1Y", "2A", "2Y", "3A", "3Y", "GND", "4Y", "4A", "5Y", "5A", "6Y", "6A", "Vcc"],
    "ic_74hc08": ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND", "3Y", "3A", "3B", "4Y", "4A", "4B", "Vcc"],
    "ic_74hc10": ["1A", "1B", "2A", "2B", "2C", "2Y", "GND", "3Y", "3A", "3B", "3C", "1Y", "1C", "Vcc"],
    "ic_74hc11": ["1A", "1B", "2A", "2B", "2C", "2Y", "GND", "3Y", "3A", "3B", "3C", "1Y", "1C", "Vcc"],
    "ic_74hc20": ["1A", "1B", "NC", "1C", "1D", "1Y", "GND", "2Y", "2A", "2B", "NC1", "2C", "2D", "Vcc"],
    "ic_74hc21": ["1A", "1B", "NC", "1C", "1D", "1Y", "GND", "2Y", "2A", "2B", "NC1", "2C", "2D", "Vcc"],
    "ic_74hc27": ["1A", "1B", "2A", "2B", "2C", "2Y", "GND", "3Y", "3A", "3B", "3C", "1Y", "1C", "Vcc"],
    "ic_74hc32": ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND", "3Y", "3A", "3B", "4Y", "4A", "4B", "Vcc"],
    "ic_74hc86": ["1A", "1B", "1Y", "2A", "2B", "2Y", "GND", "3Y", "3A", "3B", "4Y", "4A", "4B", "Vcc"],
    "switch_dip_6": ["1B", "2B", "3B", "4B", "5B", "6B", "1A", "2A", "3A", "4A", "5A", "6A"],
    "switch_dip_4": ["1B", "2B", "3B", "4B", "1A", "2A", "3A", "4A"],
    "led": ["Cathode", "Anode"]
}
```

- Although Wires Between Board Terminals (Not Given Above) Are Supported, They Are Discouraged. Board Have [`A` , `B` , `C` , `D` , `E`] (BOTTOM ROWS) [`F` , `G` , `H` , `I` , `J`] (TOP ROWS). Board Have [`1` - `30`] Columns.
