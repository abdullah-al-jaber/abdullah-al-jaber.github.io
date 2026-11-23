// ==UserScript==
// @name         Tinkercad Tinkercad Circuit Loader
// @namespace    https://tampermonkey.net/
// @version      1.5
// @description  YAY, FUN TINKERCAD Tinkercad Circuit Loader THAT SOLVES THE PAINS
// @match        https://*.tinkercad.com/things/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const storage_key = "circuitClipboard";

    const ask_for_upload = () =>
        new Promise((resolve) => {
            const file_input = document.createElement("input");
            file_input.type = "file";
            file_input.accept = ".json,application/json";
            file_input.style.display = "none";

            file_input.addEventListener("change", () => {
                const uploaded_file = file_input.files && file_input.files[0];
                file_input.remove();
                if (!uploaded_file) return resolve(null);

                const file_reader = new FileReader();
                file_reader.onload = () => resolve(String(file_reader.result));
                file_reader.onerror = () => resolve(null);
                file_reader.readAsText(uploaded_file);
            });

            file_input.addEventListener("cancel", () => {
                file_input.remove();
                resolve(null);
            });

            document.body.appendChild(file_input);
            file_input.click();
        });

    const read_clipboard = async () => {
        try {
            return await navigator.clipboard.readText();
        } catch (error) {
            return console.warn("[Tinkercad Circuit Loader] CLIPBOARD PERMISSION DENIED OR FAILED!");
        }
    };

    async function load_circuit() {
        let json_string = await ask_for_upload();
        if (!json_string) json_string = await read_clipboard();
        if (!json_string || !json_string.trim()) return console.log("[Tinkercad Circuit Loader] NOTHING TO SAVE!");
        localStorage.setItem(storage_key, json_string);
        console.log("[Tinkercad Circuit Loader] SAVED TO LOCAL STORAGE KEY CLIPBOARD_CIRCUIT!");
    }

    const wants_to_upload = confirm("Wanna Give Circuit JSON Some Load ?");
    if (wants_to_upload) load_circuit();
})();
