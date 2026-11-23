#!/usr/bin/env python3
import json
import pathlib
import argparse

import rich.console
import rich.traceback
import rich_argparse

DEFAULT_INPUT = "devices"
DEFAULT_OUTPUT = "sorted"
DEFAULT_FIELD = "pmid"

console = rich.console.Console()
rich.traceback.install(console=console)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Sort the terminals of each device JSON file by a terminal field.",
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
        "--field",
        default=DEFAULT_FIELD,
        help="terminal field to sort by (default: %(default)s)",
    )
    return parser.parse_args()


def get_json_files(folder):
    return sorted(folder.glob("*.json"))


def sort_terminals(terminals, field):
    return dict(sorted(terminals.items(), key=lambda item: item[1][field]))


def process(args):
    for file in get_json_files(args.input):
        data = json.loads(file.read_text(encoding="utf-8"))
        terminals = data.get("terminals")
        if not terminals:
            console.print(f"[yellow]skipped[/yellow] {file.name} (no terminals)")
            continue

        data["terminals"] = sort_terminals(terminals, args.field)
        (args.output / file.name).write_text(json.dumps(data, indent=4), encoding="utf-8")
        console.print(f"[green]sorted[/green] {file.name} by {args.field}")


def main():
    args = parse_args()
    if not args.input.is_dir():
        raise SystemExit(f"Input folder not found: {args.input}")
    args.output.mkdir(parents=True, exist_ok=True)
    process(args)


if __name__ == "__main__":
    main()
