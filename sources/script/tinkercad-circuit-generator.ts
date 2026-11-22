const BOARD_GRID_GAP = [8, 8];
const BACKGROUND_COLOR = "#efefef";

const NS_URL = "http://www.w3.org/2000/svg";
const RESOLUTION_FACTOR = 4;

const initialize_svg = () => {
    const container = document.querySelector<HTMLDivElement>("div#circuit");
    if (container == null) throw new Error("SVG Container Not Found !");
    container.replaceChildren();
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
        const url = URL.createObjectURL(new Blob([JSON.stringify(circuit)], { type: "application/json" }));
        download_file("circuit.json", url);
        URL.revokeObjectURL(url);
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
    drop_zone.classList.remove("drag-over");
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
type Wire = [anchor_1: string, anchor_2: string, color: string];

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
                    x * (metadata.breadboard.body_box[2] + BOARD_GRID_GAP[0] * 10 + 20),
                    y * (metadata.breadboard.body_box[3] + BOARD_GRID_GAP[1] * 10),
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
            throw new Error(`Can't Find Component By ID ! [${id}]`);
        };

        const terminal_position = (component: Component, terminal: string): Point => {
            const component_metadata = metadata[component.type];
            const point = component_metadata.terminals[terminal];
            if (!point) throw new Error(`Terminal Not Found ! [${component.id}.${terminal}]`);
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

        type Connection = {
            id: string;
            points: Point[];
            terminals: string[];
            color: string;
        };
        const connections: Connection[] = [];

        const power_board_connection = (
            power_component: Component,
            board_component: Component,
            terminal_1: string,
            terminal_2: string,
            color: string,
        ) => {
            const point_1 = terminal_position(power_component, terminal_1);
            const point_2 = terminal_position(board_component, terminal_2);
            const power_connection: Connection = {
                id: `${power_component.id}.positive`,
                points: [point_1, [point_1[0], point_2[1]], point_2],
                terminals: [`${power_component.id}.${terminal_1}`, `${board_component.id}.${terminal_2}`],
                color: color,
            };
            connections.push(power_connection);
        };
        const bridge_board_connection = (
            board_component_1: Component,
            board_component_2: Component,
            terminal_1: string,
            terminal_2: string,
            color: string,
            offset: number = 20,
        ) => {
            const point_1 = terminal_position(board_component_1, terminal_1);
            const point_2 = terminal_position(board_component_2, terminal_2);
            const bridge_connection: Connection = {
                id: `${board_component_1.id}.positive`,
                points:
                    offset == 0
                        ? [point_1, point_2]
                        : [point_1, [point_1[0] + offset, point_1[1]], [point_2[0] + offset, point_2[1]], point_2],
                terminals: [`${board_component_1.id}.${terminal_1}`, `${board_component_2.id}.${terminal_2}`],
                color: color,
            };
            if (color == "#F00") {
                positive_bridge_board_connection.push(bridge_connection);
            } else if (color == "#000") {
                negative_bridge_board_connection.push(bridge_connection);
            } else throw new Error(`Unknown Power Color ! [${color}]`);
        };

        const negative_bridge_board_connection: Connection[] = [];
        const positive_bridge_board_connection: Connection[] = [];
        for (const [x, temp] of board_map)
            for (const [y, board] of temp) {
                const current_board_component = find_component_by_id(board.id);
                bridge_board_connection(current_board_component, current_board_component, "W30", "Y30", "#F00", 30);
                bridge_board_connection(current_board_component, current_board_component, "X30", "Z30", "#000", 40);
                if (x == 0 && y == 0) {
                    const power_component = components[0];
                    power_board_connection(power_component, current_board_component, "Positive", "W1", "#F00");
                    power_board_connection(power_component, current_board_component, "Negative", "X1", "#000");
                } else if (x != 0 && y == 0) {
                    const target_board_component = find_component_by_id(board_map.get(x - 1)?.get(0)?.id as string);
                    bridge_board_connection(current_board_component, target_board_component, "Y1", "Y30", "#F00", 0);
                    bridge_board_connection(current_board_component, target_board_component, "Z1", "Z30", "#000", 0);
                } else {
                    const target_board_component = find_component_by_id(board_map.get(x)?.get(y - 1)?.id as string);
                    bridge_board_connection(current_board_component, target_board_component, "Y30", "W30", "#F00", 30);
                    bridge_board_connection(current_board_component, target_board_component, "Z30", "X30", "#000", 40);
                }
            }
        connections.push(...negative_bridge_board_connection);
        connections.push(...positive_bridge_board_connection);

        const point_equal = (point_1: Point, point_2: Point) => point_1[0] == point_2[0] && point_1[1] == point_2[1];
        const find_board_terminal = (board_component: Component, point: Point) => {
            const board_terminals = metadata[board_component.type].terminals;
            for (const board_terminal in board_terminals) {
                if (point_equal(terminal_position(board_component, board_terminal), point)) return board_terminal;
            }
            throw new Error(`Board Terminal Not Found ! [${board_component.id}, (${point}])`);
        };

        const board_connection = (
            board_component: Component,
            connection_id: string,
            terminal_1: string,
            terminal_2: string,
            color: string,
        ) => {
            connections.push({
                id: connection_id,
                points: [
                    terminal_position(board_component, terminal_1),
                    terminal_position(board_component, terminal_2),
                ],
                terminals: [`${board_component.id}.${terminal_1}`, `${board_component.id}.${terminal_2}`],
                color: color,
            });
        };

        const farthest_terminal = (board_component: Component, part_component: Component, terminal_name: string) => {
            const board_terminal = find_board_terminal(
                board_component,
                terminal_position(part_component, terminal_name),
            );
            if (part_component.type == "led" && terminal_name == "Anode") return board_terminal.replace("F", "A");
            if (board_terminal.startsWith("F")) {
                return board_terminal.replace("F", "J");
            } else if (board_terminal.startsWith("E")) {
                return board_terminal.replace("E", "A");
            } else {
                throw new Error(`Unknown Direction Terminal ! [${board_terminal}]`);
            }
        };

        const power_part_connection = (
            board_component: Component,
            part_component: Component,
            terminal: string,
            color: string,
            power_terminal: string,
        ) => {
            const terminal_1 = farthest_terminal(board_component, part_component, terminal);
            const terminal_2 = terminal_1.replace(terminal_1.slice(0, 1), power_terminal);
            board_connection(board_component, `${part_component.id}.${terminal}`, terminal_1, terminal_2, color);
            return [terminal_1, terminal_2];
        };

        for (const part of net_list.parts) {
            const board_id = part.anchor.split(/[@:]/)?.[1];
            const board_component = find_component_by_id(board_id);
            const part_component = find_component_by_id(part.id);
            if (part.type == "led") {
                power_part_connection(board_component, part_component, "Cathode", "#000", "Z");
            } else if (part.type.startsWith("ic")) {
                power_part_connection(board_component, part_component, "Vcc", "#F00", "Y");
                power_part_connection(board_component, part_component, "GND", "#000", "X");
            } else if (part.type.startsWith("switch")) {
                const terminal = power_part_connection(board_component, part_component, "1B", "#F00", "Y")[0];
                let max_column: number;
                let flag = true;
                if (part.type.endsWith("dip_4")) {
                    max_column = 3;
                } else if (part.type.endsWith("dip_6")) {
                    max_column = 5;
                } else throw new Error(`Unknown Switch Type ! [${part.type}]`);
                for (let column_offset = 0; column_offset < max_column; column_offset++) {
                    const current_column = Number(terminal.slice(1)) + column_offset;
                    const target_column = current_column + 1;
                    const current_row = flag ? "I" : "J";
                    board_connection(
                        board_component,
                        `${part.id}.${current_column}-${target_column}`,
                        `${current_row}${current_column}`,
                        `${current_row}${target_column}`,
                        "#F00",
                    );
                    flag = !flag;
                }
            }
        }

        const find_board_by_part_id = (part_id: string) => {
            for (const part of net_list.parts) {
                if (part_id == part.id) return find_component_by_id(part.anchor.split(/[@:]/)?.[1]);
            }
            throw new Error(`Can't Find Part ! [${part_id}]`);
        };
        const handle_terminal_points = (part_id: string, terminal: string, offset: number = 0): Point[] => {
            const part = find_component_by_id(part_id);
            const board = find_board_by_part_id(part.id);
            const terminal_1 = farthest_terminal(board, part, terminal);
            const point_1 = terminal_position(board, terminal_1);
            if (terminal_1.startsWith("J")) {
                offset = -1 * offset - 6;
            } else if (terminal_1.startsWith("A")) {
                offset = 1 * offset + 6;
            } else throw new Error(`Unknown Terminal To Handle ! [${terminal}]`);
            const point_2: Point = [point_1[0], point_1[1] + offset * 10];
            return [point_1, point_2];
        };

        for (const wire of net_list.wires) {
            const [part_id_1, terminal_1] = wire[0].split(".");
            const [part_id_2, terminal_2] = wire[1].split(".");
            const start_points = handle_terminal_points(part_id_1, terminal_1);
            const end_points = handle_terminal_points(part_id_2, terminal_2);
            const wire_connection: Connection = {
                id: `wire-${wire[0]}-${wire[1]}`,
                points: [...start_points, ...end_points.reverse()],
                terminals: wire.slice(0, 2),
                color: wire[2],
            };
            connections.push(wire_connection);
        }

        for (const connection of connections) {
            if (connection.points.length < 2) throw new Error("Wrong Connection !");
            const terminal_points = [connection.points.at(0), connection.points.at(-1)] as Point[];

            const path_strings: string[] = [];
            for (let index = 1; index < connection.points.length - 1; index++) {
                const current_point = connection.points[index];
                const backward_point = connection.points[index - 1];
                const forward_point = connection.points[index + 1];
                const default_radius = 15;

                const incoming_length = Math.hypot(
                    current_point[0] - backward_point[0],
                    current_point[1] - backward_point[1],
                );
                const outgoing_length = Math.hypot(
                    forward_point[0] - current_point[0],
                    forward_point[1] - current_point[1],
                );

                const radius = Math.min(default_radius, incoming_length / 2, outgoing_length / 2);

                const start_x = current_point[0] - ((current_point[0] - backward_point[0]) / incoming_length) * radius;
                const start_y = current_point[1] - ((current_point[1] - backward_point[1]) / incoming_length) * radius;

                const end_x = current_point[0] + ((forward_point[0] - current_point[0]) / outgoing_length) * radius;
                const end_y = current_point[1] + ((forward_point[1] - current_point[1]) / outgoing_length) * radius;

                path_strings.push(`L ${start_x} ${start_y}`);
                path_strings.push(`Q ${current_point[0]} ${current_point[1]} ${end_x} ${end_y}`);
            }
            path_strings.unshift(`M ${terminal_points[0][0]} ${terminal_points[0][1]}`);
            path_strings.push(`L ${terminal_points[1][0]} ${terminal_points[1][1]}`);

            const path = document.createElementNS(NS_URL, "path");
            path.setAttribute("d", path_strings.join(" "));
            path.setAttribute("stroke", connection.color);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-width", "2.5");
            path.setAttribute("stroke-linecap", "round");
            SVG.appendChild(path);
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
