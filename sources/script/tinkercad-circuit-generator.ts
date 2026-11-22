const BOARD_GRID_GAP = [8, 8];
const BACKGROUND_COLOR = "#efefef";

const NS_URL = "http://www.w3.org/2000/svg";
const RESOLUTION_FACTOR = 4;

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

const status_bar = document.querySelector("section#status") as HTMLDivElement;
const file_input = document.querySelector("input#json-file") as HTMLInputElement;
const drop_zone = document.querySelector("label#json-drop") as HTMLLabelElement;

file_input.addEventListener("change", () => {
    if (file_input.files == null) return window.alert("No File Found !");
    handle_file(file_input.files[0]);
});

drop_zone.addEventListener("drop", (event) => {
    event.preventDefault();
    drop_zone.classList.remove("drag-over");
    if (event.dataTransfer == null) return window.alert("No File Found");
    handle_file(event.dataTransfer.files[0]);
});
drop_zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop_zone.classList.add("drag-over");
});
drop_zone.addEventListener("dragleave", () => drop_zone.classList.remove("drag-over"));

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

const download_file = (file_name: string, blob_url: string) => {
    const link = document.createElement("a");
    link.download = file_name;
    link.href = blob_url;
    link.click();
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
        const url = URL.createObjectURL(
            new Blob([localStorage.getItem("tinkercad-circuit") ?? ""], { type: "application/json" }),
        );
        download_file("circuit.json", url);
        URL.revokeObjectURL(url);
    }
});

const fetch_svg = async (svg_url: string): Promise<SVGSVGElement> => {
    const response = await fetch(svg_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${svg_url}`);
    const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error(`Invalid SVG on ${svg_url}`);
    return doc.documentElement as unknown as SVGSVGElement;
};

const fetch_json = async (json_url: string) => {
    const response = await fetch(json_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${json_url}`);
    return response.json();
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

type Terminal = [number, number];
type Body_Box = [number, number, number, number];
type Component_Metadata = {
    body_box: Body_Box;
    terminals: Record<string, Terminal>;
};
type Metadata = Record<string, Component_Metadata>;
const metadata: Metadata = await fetch_json("/assets/json/tinkercad-circuit-generator/metadata.json");

const initialize_circuit_svg = () => {
    const container = document.querySelector<HTMLDivElement>("div#circuit");
    if (container == null) throw new Error("SVG Container Not Found !");
    container.querySelector(":scope > svg")?.remove();
    const circuit_svg = document.createElementNS(NS_URL, "svg");
    container.appendChild(circuit_svg);
    circuit_svg.id = "SVG";
    return circuit_svg;
};

type PosJSON = {
    x: number;
    y: number;
};
type BreadboardJSON = {
    $id: string;
    $local_id: string;
    pos: PosJSON;
};
type WireRefJSON = {
    $idref: string;
    $class: string;
};
type TerminalJSON = {
    $id: string;
    bbid: number;
    wires: Record<string, WireRefJSON>;
};
type DeviceJSON = {
    $id: string;
    $local_id: string;
    name: string;
    did: number;
    breadboard: BreadboardJSON;
    terminals: Record<string, TerminalJSON>;
};
type PathObjectJSON = {
    $id: string;
    endpoint: PosJSON;
    tan_0: PosJSON;
    tan_1: PosJSON;
};
type WireJSON = {
    $id: string;
    insert: boolean;
    begin: WireRefJSON;
    end: WireRefJSON;
    color: string;
    objects: PathObjectJSON[];
};
type CircuitJSON = {
    devices: Record<string, DeviceJSON>;
    wires: Record<string, WireJSON>;
    center: PosJSON;
};
const initialize_circuit_json = (): CircuitJSON => {
    const circuit = {} as CircuitJSON;
    if (localStorage.getItem("tinkercad-circuit") !== null) localStorage.removeItem("tinkercad-circuit");
    localStorage.setItem("tinkercad-circuit", JSON.stringify(circuit));
    const handler: ProxyHandler<object> = {
        get(obj, property) {
            const value = Reflect.get(obj, property);
            return value !== null && typeof value === "object" ? new Proxy(value, handler) : value;
        },
        set(obj, property, value) {
            const success = Reflect.set(obj, property, value);
            localStorage.setItem("tinkercad-circuit", JSON.stringify(circuit));
            return success;
        },
        deleteProperty(obj, property) {
            const success = Reflect.deleteProperty(obj, property);
            localStorage.setItem("tinkercad-circuit", JSON.stringify(circuit));
            return success;
        },
    };
    return new Proxy(circuit, handler) as CircuitJSON;
};

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
        const circuit_svg = initialize_circuit_svg();
        const circuit_json = initialize_circuit_json();

        type Component = {
            id: string;
            pos: Terminal;
            type: string;
            jsd?: string;
        };
        const components: Component[] = [
            {
                id: "ps#1",
                pos: [0, 0],
                type: "power_supply",
            },
        ];
        type Connection = {
            id: string;
            terminals: Terminal[];
            terminal_names: string[];
            color: string;
        };
        const connections: Connection[] = [];

        net_list.boards = [...net_list.boards].sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1]);

        const board_grid = new Map<number, Map<number, Board>>();
        for (const board of net_list.boards) {
            const [x, y] = board.at;
            if (board_grid.get(x)?.has(y)) throw new Error("Duplicate Board Position !");
            if (x > 0 && !board_grid.get(x - 1)?.has(0)) throw new Error("Column Gap Found !");
            if (y > 0 && (!board_grid.has(x) || !board_grid.get(x)?.has(y - 1))) throw new Error("Row Gap Found !");
            if (!board_grid.has(x)) board_grid.set(x, new Map());
            board_grid.get(x)!.set(y, board);
        }

        for (const [x, temp] of board_grid)
            for (const [y, board] of temp) {
                const pos: Terminal = [
                    x * (metadata.breadboard.body_box[2] + BOARD_GRID_GAP[0] * 10 + 20),
                    y * (metadata.breadboard.body_box[3] + BOARD_GRID_GAP[1] * 10 + 0),
                ];
                pos[0] += metadata.power_supply.body_box[2] + 40;
                const board_component: Component = {
                    id: board.id,
                    type: "breadboard",
                    pos: pos,
                };
                components.push(board_component);
            }

        const _terminal_equal = (terminal_1: Terminal, terminal_2: Terminal) =>
            terminal_1[0] == terminal_2[0] && terminal_1[1] == terminal_2[1];

        const _component_by_id = (id: string) => {
            for (const component of components) if (component.id == id) return component;
            throw new Error(`Can't Find Component By ID ! [${id}]`);
        };

        const _component_metadata = (component_type: string) => {
            const component_metadata = metadata[component_type];
            if (!component_metadata) throw new Error(`Component Type Not Found ! [${component_type}]`);
            return component_metadata;
        };

        const _terminal = (component: Component, terminal_name: string): Terminal => {
            const component_metadata = _component_metadata(component.type);
            const terminal = component_metadata.terminals[terminal_name];
            if (!terminal) throw new Error(`Terminal Not Found ! [${component.id}.${terminal_name}]`);
            return [
                terminal[0] + component.pos[0] - component_metadata.body_box[0],
                terminal[1] + component.pos[1] - component_metadata.body_box[1],
            ];
        };

        type Part_Anchor = [terminal_name: string, board_id: string, column_number: number];
        const _part_anchor = (part_anchor: string): Part_Anchor => {
            const [terminal_name, board_id, column_number] = part_anchor.split(/[@:]/);
            if (terminal_name && board_id && column_number) return [terminal_name, board_id, Number(column_number)];
            throw new Error(`Invalid Part Anchor [${part_anchor}]`);
        };

        const _row_string = (terminal_name: string, part_type: string) => {
            const [UP, DOWN] = ["F", "E"];
            if (part_type == "led") return UP;
            else if (part_type.startsWith("switch")) return terminal_name.endsWith("B") ? UP : DOWN;
            else if (part_type.startsWith("ic") || part_type == "resistor") {
                const component_metadata = metadata[part_type];
                return component_metadata.terminals[terminal_name][1] > 0 ? DOWN : UP;
            } else throw new Error("Can't Determine Polarity");
        };

        for (const part of net_list.parts) {
            if (part.type == "led") {
                const [terminal_name, board_id, column_number] = _part_anchor(part.anchor);
                const resistor_part: Part = {
                    id: `${part.id}_res`,
                    type: "resistor",
                    anchor: `Terminal 2@${board_id}:${column_number + (terminal_name == "Anode" ? 0 : 1)}`,
                };
                net_list.parts.push(resistor_part);
            }
        }

        for (const part of net_list.parts) {
            const [terminal_name, board_id, column_number] = _part_anchor(part.anchor);
            const row_string = _row_string(terminal_name, part.type);
            const component: Component = {
                id: part.id,
                type: part.type,
                pos: [0, 0],
            };
            const board_terminal = _terminal(_component_by_id(board_id), `${row_string}${column_number}`);
            const part_terminal = _terminal(component, terminal_name);
            component.pos = [board_terminal[0] - part_terminal[0], board_terminal[1] - part_terminal[1]];
            components.push(component);
        }

        for (const component of components) {
            const svg = normalize_svg(
                await fetch_svg(`/assets/image/tinkercad-circuit-generator/${component.type}.svg`),
            );
            svg.setAttribute("x", `${component.pos[0]}`);
            svg.setAttribute("y", `${component.pos[1]}`);
            circuit_svg.appendChild(svg);
        }

        const _board_connection = (
            component_1: Component,
            component_2: Component,
            terminal_name_1: string,
            terminal_name_2: string,
            color: string,
            offset: number = 0,
        ) => {
            const terminal_1 = _terminal(component_1, terminal_name_1);
            const terminal_2 = _terminal(component_2, terminal_name_2);
            const board_connection: Connection = {
                id: `${component_1.id}.${terminal_name_1}-${component_2.id}.${terminal_name_2}`,
                terminals: [],
                terminal_names: [`${component_1.id}.${terminal_name_1}`, `${component_2.id}.${terminal_name_2}`],
                color: color,
            };
            if (_terminal_equal(terminal_1, terminal_2)) {
                throw new Error(`Power Terminal Are Equal ! [${component_1.id}.${terminal_name_2}]`);
            } else if (terminal_1[0] == terminal_2[0]) {
                const terminals: Terminal[] = [terminal_1, terminal_2];
                if (offset != 0) {
                    const _terminals: Terminal[] = [
                        [terminal_1[0] + offset, terminal_1[1]],
                        [terminal_2[0] + offset, terminal_2[1]],
                    ];
                    terminals.splice(1, 0, ..._terminals);
                }
                board_connection.terminals = terminals;
            } else if (terminal_1[1] == terminal_2[1]) {
                const terminals: Terminal[] = [terminal_1, terminal_2];
                if (offset != 0) {
                    const _terminals: Terminal[] = [
                        [terminal_1[0], terminal_1[1] + offset],
                        [terminal_2[0], terminal_2[1] + offset],
                    ];
                    terminals.splice(1, 0, ..._terminals);
                }
                board_connection.terminals = terminals;
            } else {
                board_connection.terminals = [terminal_1, [terminal_1[0], terminal_2[1]], terminal_2];
            }
            connections.push(board_connection);
        };

        for (const [x, temp] of board_grid)
            for (const [y, board] of temp) {
                const current_board_component = _component_by_id(board.id);
                _board_connection(current_board_component, current_board_component, "X30", "Z30", "#000", 40);
                if (x == 0 && y == 0) {
                    const power_component = components[0];
                    _board_connection(power_component, current_board_component, "Negative", "X1", "#000");
                } else if (x != 0 && y == 0) {
                    const target_board_component = _component_by_id(board_grid.get(x - 1)?.get(0)?.id as string);
                    _board_connection(current_board_component, target_board_component, "Z1", "Z30", "#000", 0);
                } else {
                    const target_board_component = _component_by_id(board_grid.get(x)?.get(y - 1)?.id as string);
                    _board_connection(current_board_component, target_board_component, "Z30", "X30", "#000", 40);
                }
            }

        for (const [x, temp] of board_grid)
            for (const [y, board] of temp) {
                const current_board_component = _component_by_id(board.id);
                _board_connection(current_board_component, current_board_component, "W30", "Y30", "#F00", 30);
                if (x == 0 && y == 0) {
                    const power_component = components[0];
                    _board_connection(power_component, current_board_component, "Positive", "W1", "#F00");
                } else if (x != 0 && y == 0) {
                    const target_board_component = _component_by_id(board_grid.get(x - 1)?.get(0)?.id as string);
                    _board_connection(current_board_component, target_board_component, "Y1", "Y30", "#F00", 0);
                } else {
                    const target_board_component = _component_by_id(board_grid.get(x)?.get(y - 1)?.id as string);
                    _board_connection(current_board_component, target_board_component, "Y30", "W30", "#F00", 30);
                }
            }

        const _board_terminal_name = (board_component: Component, query_terminal: Terminal) => {
            const board_terminals = _component_metadata(board_component.type).terminals;
            for (const board_terminal_name in board_terminals) {
                const board_terminal = _terminal(board_component, board_terminal_name);
                if (_terminal_equal(board_terminal, query_terminal)) return board_terminal_name;
            }
            throw new Error(`Board Terminal Name Not Found ! [${board_component.id}, (${query_terminal}])`);
        };

        const _edge_board_terminal_name = (
            board_component: Component,
            part_component: Component,
            part_terminal_name: string,
        ) => {
            const part_terminal = _terminal(part_component, part_terminal_name);
            const board_terminal_name = _board_terminal_name(board_component, part_terminal);
            if (part_component.type == "led" && part_terminal_name == "Anode")
                return board_terminal_name.replace("F", "A");
            if (board_terminal_name.startsWith("F")) {
                return board_terminal_name.replace("F", "J");
            } else if (board_terminal_name.startsWith("E")) {
                return board_terminal_name.replace("E", "A");
            } else {
                throw new Error(`Unknown Direction Terminal ! [${board_terminal_name}]`);
            }
        };

        const power_part_connection = (
            board_component: Component,
            part_component: Component,
            terminal: string,
            color: string,
            power_string: string,
        ) => {
            const terminal_name_1 = _edge_board_terminal_name(board_component, part_component, terminal);
            const terminal_name_2 = terminal_name_1.replace(terminal_name_1.slice(0, 1), power_string);
            _board_connection(board_component, board_component, terminal_name_1, terminal_name_2, color);
            return [terminal_name_1, terminal_name_2];
        };

        for (const part of net_list.parts) {
            const board_component = _component_by_id(_part_anchor(part.anchor)[1]);
            const part_component = _component_by_id(part.id);
            if (part.type == "led") {
                power_part_connection(board_component, part_component, "Cathode", "#000", "Z");
            } else if (part.type.startsWith("ic")) {
                power_part_connection(board_component, part_component, "GND", "#000", "X");
                power_part_connection(board_component, part_component, "Vcc", "#F00", "Y");
            } else if (part.type.startsWith("switch")) {
                const terminal = power_part_connection(board_component, part_component, "1B", "#F00", "Y")[0];
                const switch_size = part.type.match(/dip_\d+$/)?.[0];
                const switch_span = { dip_4: 3, dip_6: 5 }[switch_size ?? ""];
                if (switch_span === undefined) throw new Error(`Unknown Switch Type ! [${part.type}]`);
                const column_number = Number(terminal.slice(1));
                Array.from({ length: switch_span }, (_, offset) => {
                    const row_string = offset % 2 === 0 ? "I" : "J";
                    const terminal_name_1 = `${row_string}${column_number + offset}`;
                    const terminal_name_2 = `${row_string}${column_number + offset + 1}`;
                    _board_connection(board_component, board_component, terminal_name_1, terminal_name_2, "#F00");
                });
            }
        }

        const _board_by_part_id = (part_id: string) => {
            for (const part of net_list.parts)
                if (part_id == part.id) return _component_by_id(_part_anchor(part.anchor)?.[1]);
            throw new Error(`Can't Find Part ! [${part_id}]`);
        };

        const compute_edge_terminal_points = (
            part_id: string,
            part_terminal_name: string,
            offset: number = 0,
        ): Terminal[] => {
            const part = _component_by_id(part_id);
            const board = _board_by_part_id(part.id);
            const terminal_name_1 = _edge_board_terminal_name(board, part, part_terminal_name);
            const terminal_1 = _terminal(board, terminal_name_1);
            if (terminal_name_1.startsWith("J")) {
                offset = -1 * offset - 6;
            } else if (terminal_name_1.startsWith("A")) {
                offset = 1 * offset + 6;
            } else throw new Error(`Unknown Terminal To Handle ! [${part_terminal_name}]`);
            const terminal_2: Terminal = [terminal_1[0], terminal_1[1] + offset * 10];
            return [terminal_1, terminal_2];
        };

        for (const wire of net_list.wires) {
            const [part_id_1, terminal_1] = wire[0].split(".");
            const [part_id_2, terminal_2] = wire[1].split(".");
            const start_points = compute_edge_terminal_points(part_id_1, terminal_1);
            const end_points = compute_edge_terminal_points(part_id_2, terminal_2);
            const wire_connection: Connection = {
                id: `wire-${wire[0]}-${wire[1]}`,
                terminals: [...start_points, ...end_points.reverse()],
                terminal_names: wire.slice(0, 2),
                color: wire[2],
            };
            connections.push(wire_connection);
        }

        for (const connection of connections) {
            if (connection.terminals.length < 2) throw new Error("Wrong Connection !");
            const terminal_points = [connection.terminals.at(0), connection.terminals.at(-1)] as Terminal[];

            const path_strings: string[] = [];
            for (let index = 1; index < connection.terminals.length - 1; index++) {
                const current_point = connection.terminals[index];
                const backward_point = connection.terminals[index - 1];
                const forward_point = connection.terminals[index + 1];
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
            circuit_svg.appendChild(path);
        }

        Object.assign(circuit_json, await fetch_json("/assets/json/tinkercad-circuit-generator/template.json"));
        circuit_json.center.x = Math.round(circuit_svg.getBBox().x + circuit_svg.getBBox().width / 2);
        circuit_json.center.y = Math.round(circuit_svg.getBBox().y + circuit_svg.getBBox().height / 2);

        let _jsd_counter = 0;
        const _compute_jsd = () =>
            `${Date.now().toString(16)}-${(_jsd_counter++).toString(16)}-${Math.random().toString(16).slice(2)}`;

        for (let index = 0; index < components.length; index++) {
            const component = components[index];
            component.jsd = _compute_jsd();
            const component_json: DeviceJSON = await fetch_json(
                `/assets/json/tinkercad-circuit-generator/${component.type}.json`,
            );
            const component_metadata = _component_metadata(component.type);
            component_json.breadboard.pos.x = component.pos[0] - component_metadata.body_box[0];
            component_json.breadboard.pos.y = component.pos[1] - component_metadata.body_box[1];
            component_json.$id = component.jsd;
            component_json.$local_id = `Device_${index}`;
            component_json.name = `${index}`;
            for (const terminal_json_name in component_json.terminals) {
                const terminal_json = component_json.terminals[terminal_json_name];
                terminal_json.$id = _compute_jsd();
            }
            circuit_json.devices[component.jsd] = component_json;
        }

        const _part_by_part_id = (part_id: string) => {
            for (const part of net_list.parts) if (part.id == part_id) return part;
            throw new Error(`Unknown Part ID ! [${part_id}]`);
        };

        const terminal_json_index = (component_type: string, terminal_name: string) => {
            const component_metadata = _component_metadata(component_type);
            return Object.keys(component_metadata.terminals).indexOf(terminal_name);
        };

        const wire_json_template: WireJSON = await fetch_json("/assets/json/tinkercad-circuit-generator/wire.json");
        const path_object_json_template = structuredClone(wire_json_template.objects[0]);
        wire_json_template.objects = [];

        const create_write_json = (
            terminal_json_1: TerminalJSON,
            terminal_json_2: TerminalJSON,
            terminals: Terminal[] = [],
            insert: boolean = true,
            color: string = "green",
        ) => {
            const wire_json = structuredClone(wire_json_template);
            wire_json.$id = _compute_jsd();
            wire_json.begin.$idref = terminal_json_1.$id;
            wire_json.end.$idref = terminal_json_2.$id;
            wire_json.insert = insert;
            wire_json.color = color;
            for (const terminal of terminals) {
                const path_object_json = structuredClone(path_object_json_template);
                path_object_json.$id = _compute_jsd();
                path_object_json.endpoint.x = path_object_json.tan_0.x = path_object_json.tan_1.x = terminal[0];
                path_object_json.endpoint.y = path_object_json.tan_0.y = path_object_json.tan_1.y = terminal[1];
                wire_json.objects.push(path_object_json);
            }
            circuit_json.wires[wire_json.$id] = wire_json;
        };

        for (let index = 0; index < components.length; index++) {
            const component = components[index];
            if (component.type == "breadboard" || component.type == "power_supply") continue;
            const terminal_names = Object.keys(_component_metadata(component.type).terminals);
            const part_component = components[index];
            const board_component = _component_by_id(_part_anchor(_part_by_part_id(component.id).anchor)[1]);
            const part_json = circuit_json.devices[part_component.jsd as string];
            const board_json = circuit_json.devices[board_component.jsd as string];
            for (const terminal_name of terminal_names) {
                const part_index = terminal_json_index(part_component.type, terminal_name);
                const board_index = terminal_json_index(
                    board_component.type,
                    _board_terminal_name(board_component, _terminal(part_component, terminal_name)),
                );
                const part_terminal_json = part_json.terminals[Object.keys(part_json.terminals)[part_index]];
                const board_terminal_json = board_json.terminals[Object.keys(board_json.terminals)[board_index]];
                if (part_terminal_json == undefined || board_terminal_json == undefined)
                    throw new Error("Undefined Terminal Json !");
                create_write_json(part_terminal_json, board_terminal_json);
            }
        }

        async function read() {
            await navigator.clipboard.writeText(JSON.stringify(circuit_json));
            console.log("Read");
        }

        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === "r") {
                e.preventDefault();
                read();
            }
        });
        console.log(circuit_json);
        normalize_svg(circuit_svg, 10, true);
    } catch (error) {
        const error_stack = (error as Error).stack?.replace(String(error), "").trim();
        const show_alert = false,
            show_trace = false;
        if (show_alert) window.alert(`ERROR => ${(error as Error).message} ${show_trace ? `\n [${error_stack}]` : ""}`);
        throw error;
    }
};
