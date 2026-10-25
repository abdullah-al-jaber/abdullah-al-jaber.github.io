### Net-List JSON Guideline

Net-List JSON (`net-list.json`) contains the blueprint of circuit. Learn Format from Example :

```json
{
    "boards": [
        { "id": "BRD#1", "at": [0, 0] },
        { "id": "BRD#2", "at": [0, 1] }
    ],
    "parts": [
        { "id": "SWT#1", "type": "switch_dip_4", "anchor": "1B@BRD#2:2" },
        { "id": "IC#1", "type": "ic_74hc86", "anchor": "1A@BRD#1:2" },
        { "id": "IC#2", "type": "ic_74hc08", "anchor": "1A@BRD#1:12" },
        { "id": "IC#3", "type": "ic_74hc32", "anchor": "1A@BRD#1:22" },
        { "id": "LED#1", "type": "led", "anchor": "ANODE@BRD#2:20" },
        { "id": "LED#2", "type": "led", "anchor": "ANODE@BRD#2:26" }
    ],
    "wires": [
        ["SWT#1.1", "IC#1.1A", "#FF0000"],
        ["SWT#1.1", "IC#2.1A", "#FF0000"],
        ["SWT#1.2", "IC#1.1B", "#FF8800"],
        ["SWT#1.2", "IC#2.1B", "#FF8800"],
        ["SWT#1.3", "IC#1.2B", "#FFFF00"],
        ["SWT#1.3", "IC#2.2B", "#FFFF00"],
        ["IC#1.1Y", "IC#1.2A", "#00AA00"],
        ["IC#1.1Y", "IC#2.2A", "#00AA00"],
        ["IC#1.2Y", "LED#1.CATHODE", "#0000FF"],
        ["IC#2.1Y", "IC#3.1A", "#AA00FF"],
        ["IC#2.2Y", "IC#3.1B", "#AA00FF"],
        ["IC#3.1Y", "LED#2.CATHODE", "#FFFFFF"]
    ]
}
```

**Notes :**

- Format of `anchor`: `"PIN_NAME@BOARD_ID:COLUMN_NUMBER"`
