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
- Automatic Power Connection Design. Focus Only On Logic.
- Wire Color Must Be One Of Following - `black` , `red` , `orange` , `yellow` , `green` , `turquoise` , `blue` , `purple` , `pink` , `brown` , `grey` , `white`
