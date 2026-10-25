const BOARD_GRID_GAP = [40, 40];
const BACKGROUND_COLOR = "#efefef";

const NS_URL = "http://www.w3.org/2000/svg";
const RESOLUTION_FACTOR = 4;

const initialize_svg = () => {
    const container = document.querySelector<HTMLDivElement>("div#circuit");
    if (container == null) throw new Error("SVG Container Not Found !");
    container.childNodes.forEach((node) => node.remove());
    const SVG = document.createElementNS(NS_URL, "svg");
    container.appendChild(SVG);
    SVG.id = "SVG";
    return SVG;
};

const download_file = (file_name: string, blob_url: string) => {
    const link = document.createElement("a");
    link.download = file_name;
    link.href = blob_url;
    link.click();
};

const svg_to_canvas = async (svg: SVGSVGElement, canvas: HTMLCanvasElement) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));

    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx == null) throw new Error("Canvas Context Not Found !");
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    } finally {
        URL.revokeObjectURL(url);
    }
};

const button = document.querySelector<HTMLButtonElement>("button#submit");
if (button == null) throw new Error("Submit Button Not Found !");
button.addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    const svg = document.querySelector<SVGSVGElement>("svg#SVG");
    if (svg == null) throw new Error("SVG Not Found !");
    await svg_to_canvas(svg, canvas);
    download_file("circuit.png", canvas.toDataURL("image/png"));
});

const footer = document.querySelector("footer") as HTMLElement;

footer.addEventListener("click", (event) => {
    if (event.detail === 2) {
        download_file("circuit.json", JSON.stringify(circuit));
    }
});

const status_bar = document.querySelector("section#status") as HTMLDivElement;
const file_input = document.querySelector("input#json-file") as HTMLInputElement;
const drop_zone = document.querySelector("label#json-drop") as HTMLLabelElement;

const handle_file = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) return window.alert("File isn't JSON FILE !");
    status_bar.setAttribute("data-state", "info");
    try {
        const circuit = JSON.parse(await file.text());
        await circuit_generator(circuit);
        status_bar.setAttribute("data-state", "success");
    } catch (error) {
        console.error(error);
        status_bar.setAttribute("data-state", "error");
    } finally {
        file_input.value = "";
    }
};

file_input.addEventListener("change", () => {
    if (file_input.files == null) return window.alert("No File Found !");
    handle_file(file_input.files[0]);
});

drop_zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop_zone.classList.add("drag-over");
});
drop_zone.addEventListener("dragleave", () => drop_zone.classList.remove("drag-over"));
drop_zone.addEventListener("drop", (event) => {
    event.preventDefault();
    drop_zone.classList.remove("dragover");
    if (event.dataTransfer == null) return window.alert("No File Found");
    handle_file(event.dataTransfer.files[0]);
});

const fetch_json = async (json_url: string) => {
    const response = await fetch(json_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${json_url}`);
    return response.json();
};

type Point = [number, number];
type Body_Box = [number, number, number, number];

type Component_Metadata = {
    body_box: Body_Box;
    terminals: Record<string, Point>;
};

type Metadata = Record<string, Component_Metadata>;
const metadata: Metadata = await fetch_json("/assets/json/tinkercad-circuit-generator/metadata.json");

const fetch_svg = async (svg_url: string): Promise<SVGSVGElement> => {
    const response = await fetch(svg_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${svg_url}`);
    const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error(`Invalid SVG on ${svg_url}`);
    return doc.documentElement as unknown as SVGSVGElement;
};

const GVS = document.createElementNS(NS_URL, "svg");
Object.assign(GVS.style, {
    position: "fixed",
    top: "200vh",
    bottom: "200vh",
    visibility: "hidden",
} as Partial<CSSStyleDeclaration>);
GVS.id = "GVS";
document.body.appendChild(GVS);

const normalize_svg = (svg_element: SVGSVGElement, padding = 5, scale = false) => {
    const clone_svg_element = svg_element.cloneNode(true) as SVGSVGElement;
    GVS.appendChild(clone_svg_element);
    const bbox = clone_svg_element.getBBox();
    let [x, y, w, h] = [bbox.x, bbox.y, bbox.width, bbox.height];
    [x, y] = [x, y].map((value) => value - padding);
    [w, h] = [w, h].map((value) => value + padding * 2);
    [x, y, w, h] = [x, y, w, h].map((value) => Math.round(value));
    svg_element.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    if (scale) [w, h] = [w, h].map((value) => value * RESOLUTION_FACTOR);
    svg_element.setAttribute("width", w.toString());
    svg_element.setAttribute("height", h.toString());
    GVS.removeChild(clone_svg_element);
    return svg_element;
};

const circuit = {};

type Board = { id: string; at: [number, number] };
type Part = { id: string; type: string; anchor: string };
type Wire = [string, string, string];

type Net_List = {
    boards: Board[];
    parts: Part[];
    wires: Wire[];
};

const circuit_generator = async (net_list: Net_List) => {
    try {
        const SVG = initialize_svg();

        type Component = {
            id: string;
            pos: Point;
            type: string;
        };
        const components: Component[] = [
            {
                id: "ps#1",
                pos: [0, 0],
                type: "power_supply",
            },
        ];

        net_list.boards = [...net_list.boards].sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1]);
        const board_map = new Map<number, Map<number, Board>>();
        for (const board of net_list.boards) {
            const [x, y] = board.at;
            if (board_map.get(x)?.has(y)) throw new Error("Duplicate Board Position !");
            if (x > 0 && !board_map.get(x - 1)?.has(0)) throw new Error("Column Gap Found !");
            if (y > 0 && (!board_map.has(x) || !board_map.get(x)?.has(y - 1))) throw new Error("Row Gap Found !");
            if (!board_map.has(x)) board_map.set(x, new Map());
            board_map.get(x)!.set(y, board);
        }

        for (const [x, temp] of board_map)
            for (const [y, board] of temp) {
                const pos: Point = [
                    x * (metadata.breadboard.body_box[2] + BOARD_GRID_GAP[0]),
                    y * (metadata.breadboard.body_box[3] + BOARD_GRID_GAP[1]),
                ];
                pos[0] += metadata.power_supply.body_box[2] + 40;
                const board_component: Component = {
                    id: board.id,
                    type: "breadboard",
                    pos: pos,
                };
                components.push(board_component);
            }

        const find_component_by_id = (id: string) => {
            for (const component of components) {
                if (component.id == id) return component;
            }
            throw new Error("Can't Find Component By ID !");
        };

        const terminal_position = (component: Component, terminal: string): Point => {
            const component_metadata = metadata[component.type];
            const point = component_metadata.terminals[terminal];
            if (!point) throw new Error("Terminal Not Found !");
            return [
                point[0] + component.pos[0] - component_metadata.body_box[0],
                point[1] + component.pos[1] - component_metadata.body_box[1],
            ];
        };

        const compute_direction = (terminal: string, component_type: string) => {
            const [UP, DOWN] = ["F", "E"];
            if (component_type == "led") return UP;
            else if (component_type.startsWith("switch")) return terminal.endsWith("B") ? UP : DOWN;
            else if (component_type.startsWith("ic") || component_type == "resistor") {
                const component_metadata = metadata[component_type];
                return component_metadata.terminals[terminal][1] > 0 ? DOWN : UP;
            } else throw new Error("Can't Determine Polarity");
        };

        for (const part of net_list.parts) {
            if (part.type == "led") {
                const [terminal, board_id, column] = part.anchor.split(/[@:]/);
                const resistor_part: Part = {
                    id: `${part.id}_res`,
                    type: "resistor",
                    anchor: `Terminal 2@${board_id}:${Number(column) + (terminal == "Anode" ? 0 : 1)}`,
                };
                net_list.parts.push(resistor_part);
            }
        }

        for (const part of net_list.parts) {
            const component_metadata = metadata[part.type];
            if (!component_metadata) throw new Error("Component Not Found !");
            const [terminal, board_id, column] = part.anchor.split(/[@:]/);
            if (!component_metadata.terminals[terminal]) throw new Error("Terminal Not Found !");
            const polarity = compute_direction(terminal, part.type);
            const component: Component = {
                id: part.id,
                type: part.type,
                pos: [0, 0],
            };
            const board_point = terminal_position(find_component_by_id(board_id), `${polarity}${column}`);
            const terminal_point = terminal_position(component, terminal);
            component.pos = [board_point[0] - terminal_point[0], board_point[1] - terminal_point[1]];
            components.push(component);
        }

        for (const component of components) {
            const svg = normalize_svg(
                await fetch_svg(`/assets/image/tinkercad-circuit-generator/${component.type}.svg`),
            );
            svg.setAttribute("x", component.pos[0].toString());
            svg.setAttribute("y", component.pos[1].toString());
            SVG.appendChild(svg);
        }

        normalize_svg(SVG, 10, true);
    } catch (error) {
        const error_stack = (error as Error).stack?.replace(String(error), "").trim();
        const show_alert = false,
            show_trace = false;
        if (show_alert) window.alert(`ERROR => ${(error as Error).message} ${show_trace ? `\n [${error_stack}]` : ""}`);
        throw error;
    }
};
