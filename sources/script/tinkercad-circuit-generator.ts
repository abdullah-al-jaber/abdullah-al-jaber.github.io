const BREADBOARD_GRID_GAP = [20, 30];
const BACKGROUND_COLOR = "#efefef";

const NS_URL = "http://www.w3.org/2000/svg";
const RESOLUTION_FACTOR = 4;

const initialize_svg = () => {
    const container = document.querySelector<HTMLDivElement>("div#circuit");
    if (container == null) throw new Error("SVG Container Not Found !");
    container.childNodes.forEach((node) => node.remove());
    const SVG = document.createElementNS(NS_URL, "svg");
    container.append(SVG);
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
button.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    const svg = document.querySelector<SVGSVGElement>("svg#SVG");
    if (svg == null) throw new Error("SVG Not Found !");
    svg_to_canvas(svg, canvas);
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
    } catch (error) {
        status_bar.setAttribute("data-state", "error");
        console.error(error);
    } finally {
        status_bar.setAttribute("data-state", "success");
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

const metadata = await fetch_json("/assets/json/tinkercad-circuit-generator/metadata.json");

const fetch_svg = async (svg_url: string): Promise<SVGSVGElement> => {
    const response = await fetch(svg_url);
    if (!response.ok) throw new Error(`[HTTP ${response.status}] on ${svg_url}`);
    const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error(`Invalid SVG on ${svg_url}`);
    return doc.documentElement as unknown as SVGSVGElement;
};

const normalize_svg = (svg_element: SVGSVGElement, padding = 10) => {
    const bbox = svg_element.getBBox();
    let [x, y, w, h] = [bbox.x, bbox.y, bbox.width, bbox.height];
    [x, y] = [x, y].map((value) => value - padding);
    [w, h] = [w, h].map((value) => value + padding * 2);
    [x, y, w, h] = [x, y, w, h].map((value) => Math.round(value));
    svg_element.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    [w, h] = [w, h].map((value) => value * RESOLUTION_FACTOR);
    svg_element.setAttribute("width", w.toString());
    svg_element.setAttribute("height", h.toString());
    return svg_element;
};

type Breadboard = {
    stage: number;
};

type Part = {
    type: string;
    place: string;
};

type Wire = {
    color: string;
    nodes: [string, string][];
};

type Circuit = {
    breadboards: Record<string, Breadboard>;
    parts: Record<string, Part>;
    wires: Record<string, Wire>;
};

type Component = {
    type: string;
    x: number;
    y: number;
    id: string;
};

type Point = { x: number; y: number };

type Connection = {
    color: string;
    points: Point[];
};

type Rail = {
    terminal_1: string;
    terminal_2: string;
    color: string;
    shift_x: number;
    shift_y: number;
};

const circuit = {};

type Net_List = {
    boards: { id: string; at: [number, number] }[];
    parts: { id: string; type: string; anchor: string }[];
    wires: [string, string, string][];
};

const circuit_generator = async (net_list: Net_List) => {
    try {
        const SVG = initialize_svg();

        normalize_svg(SVG);
    } catch (error) {
        const error_stack = (error as Error).stack?.replace(String(error), "").trim();
        const show_alert = false,
            show_trace = false;
        if (show_alert) window.alert(`ERROR => ${(error as Error).message} ${show_trace ? `\n [${error_stack}]` : ""}`);
        status_bar.setAttribute("data-state", "error");
        throw error;
    }
};
