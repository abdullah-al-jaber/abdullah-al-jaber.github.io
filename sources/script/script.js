const RESOLUTION_FACTOR = 1;
const MARGIN = 10;
const BACKGROUND_COLOR = "#efefef";

const power_supply_padding = 20;
const breadboard_horizontal_padding = 50;
const breadboard_vertical_padding = 50;

const svg_to_canvas = async (svg, canvas) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const blob_url = URL.createObjectURL(
        new Blob([xml], {
            type: "image/svg+xml;charset=utf-8",
        }),
    );
    const img = new Image();
    img.src = blob_url;
    await img.decode();
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(blob_url);
};

const [width, height] = [2000, 2000];
const NS_url = "http://www.w3.org/2000/svg";
const SVG = document.createElementNS(NS_url, "svg");
SVG.setAttribute("width", width);
SVG.setAttribute("height", height);
SVG.setAttribute("viewBox", `0 0 ${width} ${height}`);
SVG.id = "canvas_svg";

const canvas = document.createElement("canvas");
svg_to_canvas(SVG, canvas);

const download_file = (file_name, blob_url) => {
    const link = document.createElement("a");
    link.download = file_name;
    link.href = blob_url;
    link.click();
};

const button = document.querySelector("button#submit");
button.addEventListener("click", () => download_file("circuit.png", canvas.toDataURL("image/png")));

const download_svg = (filename, svg) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const blob_url = URL.createObjectURL(
        new Blob([xml], {
            type: "image/svg+xml;charset=utf-8",
        }),
    );
    download_file(filename, blob_url);
    URL.revokeObjectURL(blob_url);
};

const footer = document.querySelector("div#footer");
footer.click_count = 0;
footer.click_timer = null;

footer.addEventListener("click", () => {
    window.clearTimeout(footer.click_timer);
    footer.click_count += 1;
    if (footer.click_count >= 3) {
        footer.click_count = 0;
        download_svg("canvas.svg", SVG);
    } else {
        footer.click_timer = window.setTimeout(() => {
            footer.click_count = 0;
        }, 400);
    }
});

const fetch_json = async (json_url) => {
    const response = await fetch(json_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${json_url}`);
    return response.json();
};

const fetch_svg = async (svg_url) => {
    const response = await fetch(svg_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${svg_url}`);
    return new DOMParser().parseFromString(await response.text(), "image/svg+xml").documentElement;
};

const measurement_svg = document.createElementNS(NS_url, "svg");
measurement_svg.setAttribute("width", width);
measurement_svg.setAttribute("height", height);
measurement_svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
measurement_svg.style.position = "absolute";
measurement_svg.style.top = `-${height}px`;
measurement_svg.style.left = `-${width}px`;
measurement_svg.style.pointerEvents = "none";
measurement_svg.id = "measurement_svg";
document.body.appendChild(measurement_svg);

const normalize_svg = (svg_element, padding = 5) => {
    measurement_svg.appendChild(svg_element);
    const bbox = svg_element.getBBox();
    let [x, y, w, h] = [bbox.x, bbox.y, bbox.width, bbox.height];
    [x, y] = [x, y].map((value) => value - padding);
    [w, h] = [w, h].map((value) => value + padding * 2);
    [x, y, w, h] = [x, y, w, h].map((value) => Math.round(value));
    svg_element.setAttribute("width", w);
    svg_element.setAttribute("height", h);
    svg_element.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    measurement_svg.removeChild(svg_element);
    return svg_element;
};

const status_bar = document.querySelector("div#status");
const file_input = document.querySelector("input#json-file");
const drop_zone = document.querySelector("label#json-drop");

const handle_file = async (file) => {
    if (!file) return window.alert("No File Found !");
    if (!file.name.toLowerCase().endsWith(".json")) return window.alert("File isn't JSON FILE !");
    status_bar.setAttribute("data-state", "info");
    try {
        const circuit = JSON.parse(await file.text());
        await main(circuit);
    } catch (error) {
        status_bar.setAttribute("data-state", "error");
        console.error(error);
    } finally {
        file_input.value = "";
    }
};

file_input.addEventListener("change", () => handle_file(file_input.files[0]));

drop_zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop_zone.classList.add("dragover");
});
drop_zone.addEventListener("dragleave", () => drop_zone.classList.remove("dragover"));
drop_zone.addEventListener("drop", (event) => {
    event.preventDefault();
    drop_zone.classList.remove("dragover");
    handle_file(event.dataTransfer.files[0]);
});

const main = async (circuit) => {
    try {
        const metadata = await fetch_json("/metadata.json");

        const find_component_by_id = (component_id) => {
            for (const component of components) {
                if (component.id === component_id) return component;
            }
            throw new Error(`Component with id "${component_id}" not found`);
        };

        const compute_terminal_position = (component, terminal_name) => {
            const terminal = metadata[component.type]?.terminals[terminal_name];
            const body_box = metadata[component.type]?.body_box;
            if (!terminal) throw new Error(`Unknown terminal "${terminal_name}" on ${component.type}`);
            if (!body_box) throw new Error(`No body box for ${component.type}`);

            return {
                x: component.x + (terminal[0] - body_box[0]),
                y: component.y + (terminal[1] - body_box[1]),
            };
        };

        const components = [];
        const connections = [
            // {
            //     color: "red",
            //     points: [
            //         compute_terminal_position(components[0], "Positive"),
            //         compute_terminal_position(components[2], "B1"),
            //     ],
            // },
        ];

        components.push({
            type: "power_supply",
            x: 0,
            y: 0,
            id: "ps#1",
        });

        const breadboard_stages = {};
        for (const breadboard_id in circuit.breadboards) {
            const breadboard = circuit.breadboards[breadboard_id];
            breadboard_stages[breadboard.stage] = breadboard_stages[breadboard.stage] || {};
            breadboard_stages[breadboard.stage][breadboard_id] = breadboard;
        }

        const breadboard_power_connection = (
            [breadboard_1, terminal_1],
            [breadboard_2, terminal_2],
            color,
            shift = 0,
        ) => {
            const breadboard_component_1 = find_component_by_id(breadboard_1);
            const breadboard_component_2 = find_component_by_id(breadboard_2);
            const terminal_position_1 = compute_terminal_position(breadboard_component_1, terminal_1);
            const terminal_position_2 = compute_terminal_position(breadboard_component_2, terminal_2);
            const points = [terminal_position_1];
            if (shift !== 0)
                points.push(
                    { x: terminal_position_1.x + shift, y: terminal_position_1.y },
                    { x: terminal_position_2.x + shift, y: terminal_position_2.y },
                );
            points.push(terminal_position_2);
            connections.push({ color, points });
        };

        const breadboard_offset = { x: metadata.power_supply.body_box[2] + power_supply_padding, y: 0 };
        for (const breadboard_stage in breadboard_stages) {
            breadboard_offset.max = 0;
            Object.entries(breadboard_stages[breadboard_stage]).forEach(([breadboard_id, breadboard], index) => {
                const breadboard_component = {
                    type: "breadboard",
                    x: breadboard_offset.x,
                    y: breadboard_offset.y,
                    id: breadboard_id,
                };
                breadboard_offset.y += metadata.breadboard.body_box[3] + breadboard_vertical_padding;
                components.push(breadboard_component);
                breadboard_power_connection([breadboard_id, "W30"], [breadboard_id, "Y30"], "red", 25);
                breadboard_power_connection([breadboard_id, "X30"], [breadboard_id, "Z30"], "black", 35);
                if (index == 0 && breadboard_stage == 1) {
                    const power_supply_component = find_component_by_id("ps#1");
                    const shift = power_supply_padding / 2;
                    [
                        ["Positive", "Y1", "red", shift + 10, shift + 5],
                        ["Negative", "Z1", "black", shift - 10, shift - 5],
                    ].forEach(([terminal_1, terminal_2, color, shift_x, shift_y]) => {
                        const terminal_position_1 = compute_terminal_position(power_supply_component, terminal_1);
                        const terminal_position_2 = compute_terminal_position(breadboard_component, terminal_2);
                        const power_supply_body_box = metadata.power_supply.body_box;
                        const horizontal_shift = power_supply_body_box[0] + power_supply_body_box[2] + shift_x;
                        const vertical_shift = power_supply_body_box[1] + power_supply_body_box[3] + shift_y;
                        const points = [terminal_position_1];
                        points.push({ x: terminal_position_1.x, y: terminal_position_1.y + vertical_shift });
                        points.push({
                            x: terminal_position_1.x + horizontal_shift,
                            y: terminal_position_1.y + vertical_shift,
                        });
                        points.push({ x: terminal_position_1.x + horizontal_shift, y: terminal_position_2.y });
                        points.push(terminal_position_2);
                        connections.push({
                            color: color,
                            points: points,
                        });
                    });
                } else if (index == 0) {
                    const previous_breadboard_id = Object.keys(breadboard_stages[breadboard_stage - 1])[0];
                    breadboard_power_connection([previous_breadboard_id, "Y30"], [breadboard_id, "Y1"], "red");
                    breadboard_power_connection([previous_breadboard_id, "Z30"], [breadboard_id, "Z1"], "black");
                } else {
                    const previous_breadboard_id = Object.keys(breadboard_stages[breadboard_stage])[index - 1];
                    breadboard_power_connection([previous_breadboard_id, "W30"], [breadboard_id, "Y30"], "red", 25);
                    breadboard_power_connection([previous_breadboard_id, "X30"], [breadboard_id, "Z30"], "black", 35);
                }
            });

            breadboard_offset.x += metadata.breadboard.body_box[2] + breadboard_horizontal_padding;
            breadboard_offset.y = 0;
        }

        const terminal_proxy = {};
        window.terminal = terminal_proxy;

        const terminal_names = (breadboard_component, part_component, terminal_column) => {
            terminal_column = Number(terminal_column);
            if (part_component.type.startsWith("ic")) {
                connections.push({
                    color: "red",
                    points: [
                        compute_terminal_position(breadboard_component, `Y${terminal_column - 6}`),
                        compute_terminal_position(breadboard_component, `J${terminal_column - 6}`),
                    ],
                });
                connections.push({
                    color: "black",
                    points: [
                        compute_terminal_position(breadboard_component, `X${terminal_column}`),
                        compute_terminal_position(breadboard_component, `A${terminal_column}`),
                    ],
                });
                return ["GND", `E${terminal_column}`];
            }
            if (part_component.type.startsWith("switch")) {
                return ["1A", `E${terminal_column}`];
            }
            if (part_component.type === "led") {
                connections.push({
                    color: "black",
                    points: [
                        compute_terminal_position(breadboard_component, `Z${terminal_column}`),
                        compute_terminal_position(breadboard_component, `J${terminal_column}`),
                    ],
                });
                terminal_proxy[`${part_component.id}.Anode`] = {
                    breadboard_id: breadboard_component.id,
                    breadboard_terminal_name: `A${terminal_column + 1}`,
                };
                return ["Cathode", `G${terminal_column}`];
            }
            if (part_component.type == "resistor") {
                return ["Terminal 2", `F${terminal_column + 1}`];
            }
            throw new Error(`Unsupported part type ${part_component.type}`);
        };

        for (const part_id in circuit.parts) {
            const part = circuit.parts[part_id];
            if (part.type === "led") {
                circuit.parts[`${part.id}_res`] = { type: "resistor", place: part.place };
            }
        }
        for (const part_id in circuit.parts) {
            const part = circuit.parts[part_id];
            const [breadboard_id, terminal_column] = part.place.split(/[:.]/);

            const breadboard_component = find_component_by_id(breadboard_id);
            const part_component = {
                type: part.type,
                x: 0,
                y: 0,
                id: part_id,
            };
            const [terminal_name_1, terminal_name_2] = terminal_names(
                breadboard_component,
                part_component,
                terminal_column,
            );
            const part_terminal_position = compute_terminal_position(part_component, terminal_name_1);
            const breadboard_terminal_position = compute_terminal_position(breadboard_component, terminal_name_2);
            part_component.x = breadboard_terminal_position.x - part_terminal_position.x;
            part_component.y = breadboard_terminal_position.y - part_terminal_position.y;
            components.push(part_component);
        }

        SVG.replaceChildren();
        SVG.setAttribute("width", width);
        SVG.setAttribute("height", height);
        SVG.setAttribute("viewBox", `0 0 ${width} ${height}`);

        for (const component of components) {
            const svg_component = normalize_svg(await fetch_svg(`assets/${component.type}.svg`));
            svg_component.setAttribute("x", component.x);
            svg_component.setAttribute("y", component.y);
            SVG.appendChild(svg_component);
        }

        const compute_connection = (points, radius = 5) => {
            const points_distance = (point_1, point_2) => Math.hypot(point_2.x - point_1.x, point_2.y - point_1.y);
            const point_between = (point_1, point_2, distance) => {
                const total_distance = points_distance(point_1, point_2);
                const ratio = distance / total_distance;
                return {
                    x: point_1.x + (point_2.x - point_1.x) * ratio,
                    y: point_1.y + (point_2.y - point_1.y) * ratio,
                };
            };

            const segments = [];
            segments.push(`M${points[0].x},${points[0].y}`);
            for (let i = 1; i < points.length - 1; i++) {
                const backward_point = points[i - 1];
                const current_point = points[i];
                const forward_point = points[i + 1];
                const curve_radius = Math.min(
                    points_distance(backward_point, current_point) / 2,
                    points_distance(current_point, forward_point) / 2,
                    radius,
                );
                const curve_start = point_between(current_point, backward_point, curve_radius);
                const curve_end = point_between(current_point, forward_point, curve_radius);
                segments.push(
                    `L${curve_start.x},${curve_start.y} Q${current_point.x},${current_point.y} ${curve_end.x},${curve_end.y}`,
                );
            }
            segments.push(`L${points.at(-1).x},${points.at(-1).y}`);
            return segments.join(" ");
        };

        const svg_connection = document.createElementNS(NS_url, "g");
        for (const connection of connections) {
            const path = document.createElementNS(NS_url, "path");
            path.setAttribute("d", compute_connection(connection.points));
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", connection.color);
            path.setAttribute("stroke-width", 2);
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            svg_connection.setAttribute("class", "connection");
            svg_connection.appendChild(path);
        }
        SVG.appendChild(svg_connection);

        normalize_svg(SVG, MARGIN);
        SVG.setAttribute("width", SVG.viewBox.baseVal.width * RESOLUTION_FACTOR);
        SVG.setAttribute("height", SVG.viewBox.baseVal.height * RESOLUTION_FACTOR);
        document.querySelector("div#circuit").append(SVG);
        svg_to_canvas(SVG, canvas);

        status_bar.setAttribute("data-state", "success");
    } catch (error) {
        const stack_trace = true;
        let error_stack = error.stack;
        error_stack = error_stack.replace(error.toString(), "").trim();
        // window.alert(`ERROR => ${error.message} ${stack_trace ? `\n [${error_stack}]` : ""}`);
        status_bar.setAttribute("data-state", "error");
        throw error;
    }
};
