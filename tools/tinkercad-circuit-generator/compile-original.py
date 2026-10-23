#!/usr/bin/env python3
import re
import json
import shutil
import pathlib
import tempfile
import argparse
import subprocess
import svgelements
import xml.etree.ElementTree

import rich.console
import rich.traceback
import rich_argparse

DEFAULT_INPUT = "original"
DEFAULT_OUTPUT = "image"
DEFAULT_METADATA = "metadata.json"

SVGO_CONFIG = pathlib.Path(__file__).parent / "svgo.config.cjs"

SVG_NS = "http://www.w3.org/2000/svg"
SVG_TAG = f"{{{SVG_NS}}}svg"
G_TAG = f"{{{SVG_NS}}}g"
LINE_TAG = f"{{{SVG_NS}}}line"
DESC_TAG = f"{{{SVG_NS}}}desc"

console = rich.console.Console()
rich.traceback.install(console=console)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Extract the first nested SVG from each file, then optimize with SVGO.",
        formatter_class=rich_argparse.RichHelpFormatter,
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=pathlib.Path,
        default=pathlib.Path(DEFAULT_INPUT),
        help="input folder (default: %(default)s)",
    )
    parser.add_argument(
        "output",
        nargs="?",
        type=pathlib.Path,
        default=pathlib.Path(DEFAULT_OUTPUT),
        help="output folder (default: %(default)s)",
    )
    parser.add_argument(
        "metadata",
        nargs="?",
        type=pathlib.Path,
        default=pathlib.Path(DEFAULT_METADATA),
        help="metadata JSON file path (default: %(default)s)",
    )
    parser.add_argument(
        "--keep-temp",
        action="store_true",
        help="keep the temporary folder (./temp) after the run",
    )
    return parser.parse_args()


def get_svg_files(folder):
    return sorted(folder.glob("*.svg"))


def register_namespaces(path):
    for _, (prefix, uri) in xml.etree.ElementTree.iterparse(path, events=["start-ns"]):
        xml.etree.ElementTree.register_namespace(prefix, uri)


def extract_inner_svg(input_path, output_path):
    register_namespaces(input_path)
    root = xml.etree.ElementTree.parse(input_path).getroot()
    inner = next((el for el in root.iter(SVG_TAG) if el is not root), None)
    if inner is None:
        return False
    xml.etree.ElementTree.ElementTree(inner).write(output_path, encoding="utf-8", xml_declaration=True)
    return True


def run_svgo(input_dir, output_dir):
    args = ["npx", "svgo", "--config", str(SVGO_CONFIG), "-f", str(input_dir), "-o", str(output_dir)]
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def has_class(element, name):
    return name in element.get("class", "").split()


def get_body_box(svg_path, padding=5):
    svg = svgelements.SVG.parse(str(svg_path))
    x1, y1, x2, y2 = svg.bbox()
    [x1, y1] = [value - padding for value in [x1, y1]]
    [x2, y2] = [value + padding for value in [x2, y2]]
    return [round(value) for value in [x1, y1, x2 - x1, y2 - y1]]


def get_terminals(svg_path):
    root = xml.etree.ElementTree.parse(svg_path).getroot()
    terminals = {}
    for group in root.iter(G_TAG):
        if not has_class(group, "cgfx__terminal"):
            continue
        desc = next(child for child in group if child.tag == DESC_TAG and has_class(child, "cgfx__terminalname"))
        name = desc.text.strip()
        for child in group:
            if child.tag == LINE_TAG and has_class(child, "cgfx__origin"):
                if name in terminals and re.fullmatch(r"X\d+", name):
                    new_name = re.sub(r"X(\d+)", r"W\1", name)
                    terminals[new_name] = terminals[name]
                    del terminals[name]
                terminals[name] = [int(child.get("x1")), int(child.get("y1"))]
    return terminals


def write_metadata(svg_dir, temp_dir, optimized_dir, metadata_path):
    metadata = {
        file.stem: {
            "body_box": get_body_box(optimized_dir / file.name),
            "terminals": get_terminals(temp_dir / file.name),
        }
        for file in get_svg_files(svg_dir)
    }
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def process(args, temp_dir):
    for file in get_svg_files(args.input):
        extract_inner_svg(file, temp_dir / file.name)
    run_svgo(temp_dir, args.output)
    write_metadata(args.input, temp_dir, args.output, args.metadata)


def main():
    args = parse_args()
    if not args.input.is_dir():
        raise SystemExit(f"Input folder not found: {args.input}")
    args.output.mkdir(parents=True, exist_ok=True)

    if args.keep_temp:
        temp_dir = pathlib.Path("temp")
        shutil.rmtree(temp_dir, ignore_errors=True)
        temp_dir.mkdir()
        process(args, temp_dir)
    else:
        with tempfile.TemporaryDirectory() as temp:
            process(args, pathlib.Path(temp))


if __name__ == "__main__":
    main()
