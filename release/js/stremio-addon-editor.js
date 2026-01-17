const stremio_info = {
    api_host: "api.strem.io/api",
};
const post_json = async (url, body) => {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return await response.json();
};
const login_box = document.querySelector("div#login-box");
const addon_box = document.querySelector("div#addon-box");
login_box.classList.remove("hidden");
addon_box.classList.add("hidden");
const login_button = document.querySelector("button#login");
const save_button = document.querySelector("button#save");
const addon_textarea = document.querySelector("textarea#addon");
document.querySelectorAll("form").forEach((form) => {
    form.onsubmit = (event) => event.preventDefault();
});
login_button.onclick = async () => {
    const email_input = document.querySelector("input#email");
    const password_input = document.querySelector("input#password");
    let auth_key = (
        await post_json(`https://${stremio_info.api_host}/login`, {
            type: "Login",
            email: email_input.value,
            password: password_input.value,
        })
    ).result?.authKey;
    if (auth_key == undefined) return window.alert("Failure in [Login] !");
    let addons = (
        await post_json(`https://${stremio_info.api_host}/addonCollectionGet`, {
            type: "AddonCollectionGet",
            authKey: auth_key,
        })
    ).result?.addons;
    if (addons == undefined) return window.alert("Failure in [Load Addon] !");
    stremio_info.auth_key = auth_key;
    addon_textarea.value = JSON.stringify(addons, null, 4);
    login_box.classList.add("hidden");
    addon_box.classList.remove("hidden");
};
save_button.onclick = async () => {
    if (stremio_info.auth_key == undefined) return window.alert("Failure in [Login] !");
    try {
        JSON.parse(addon_textarea.value);
    } catch {
        return window.alert("Error in [ADDON JSON DATA] !");
    }
    if (!window.confirm("Confirm [Save & Sync Addon] ?")) return null;
    let success = (
        await post_json(`https://${stremio_info.api_host}/addonCollectionSet`, {
            type: "AddonCollectionSet",
            authKey: stremio_info.auth_key,
            addons: JSON.parse(addon_textarea.value),
        })
    ).result?.success;
    if (success != true) window.alert("Failure in [Save & Sync Addon] !");
    else window.alert("Success in [Save & Sync Addon]");
};
