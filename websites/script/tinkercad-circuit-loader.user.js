// ==UserScript==
// @name         Tinkercad Circuit Loader
// @namespace    https://tampermonkey.net/
// @version      2.4
// @description  YAY, FUN TINKERCAD CIRCUIT LOADER THAT SOLVES THE PAINS
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
    async function load_circuit() {
        const json_string = await ask_for_upload();
        if (!json_string || !json_string.trim()) {
            console.log("[Tinkercad Circuit Loader] NOTHING TO SAVE!");
            return false;
        }
        localStorage.setItem(storage_key, json_string);
        console.log(`[Tinkercad Circuit Loader] SAVED TO LOCAL STORAGE KEY ${storage_key.toUpperCase()}!`);
        return true;
    }
    const add_upload_button = () => {
        const upload_button = document.createElement("button");
        const default_text = "Load Circuit JSON";
        const themes = {
            idle: {
                background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                boxShadow: "0 0 0 3px #1e3a8a, 0 8px 20px rgba(30, 64, 175, 0.45)",
            },
            success: {
                background: "linear-gradient(135deg, #15803d, #22c55e)",
                boxShadow: "0 0 0 3px #14532d, 0 8px 20px rgba(21, 128, 61, 0.45)",
            },
            fail: {
                background: "linear-gradient(135deg, #b91c1c, #ef4444)",
                boxShadow: "0 0 0 3px #7f1d1d, 0 8px 20px rgba(185, 28, 28, 0.45)",
            },
        };
        Object.assign(upload_button.style, {
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: "999999",
            padding: "12px 24px",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', Consolas, monospace",
            fontSize: "15px",
            fontWeight: "bold",
            letterSpacing: "0.5px",
            color: "#ffffff",
            border: "2px solid #ffffff",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "transform 0.15s ease, filter 0.15s ease",
            ...themes.idle,
        });
        upload_button.textContent = default_text;

        const show_result = (is_success) => {
            upload_button.textContent = is_success ? "Circuit Loaded!" : "Load Failed!";
            Object.assign(upload_button.style, is_success ? themes.success : themes.fail);
            upload_button.animate(
                is_success
                    ? [{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }]
                    : [
                          { transform: "translateX(0)" },
                          { transform: "translateX(-8px)" },
                          { transform: "translateX(8px)" },
                          { transform: "translateX(-8px)" },
                          { transform: "translateX(8px)" },
                          { transform: "translateX(0)" },
                      ],
                { duration: 400, easing: "ease-in-out" },
            );
            setTimeout(() => {
                upload_button.textContent = default_text;
                Object.assign(upload_button.style, themes.idle);
            }, 1800);
        };
        upload_button.addEventListener("mouseenter", () =>
            Object.assign(upload_button.style, { transform: "translateY(-3px)", filter: "brightness(1.1)" }),
        );
        upload_button.addEventListener("mouseleave", () =>
            Object.assign(upload_button.style, { transform: "none", filter: "none" }),
        );
        upload_button.addEventListener("mousedown", () =>
            Object.assign(upload_button.style, { transform: "translateY(1px) scale(0.97)" }),
        );
        upload_button.addEventListener("mouseup", () =>
            Object.assign(upload_button.style, { transform: "translateY(-3px)" }),
        );
        upload_button.addEventListener("click", async () => show_result(await load_circuit()));
        document.body.appendChild(upload_button);
    };
    if (confirm("Do You Wanna Give Some Circuit Load?")) add_upload_button();
})();
