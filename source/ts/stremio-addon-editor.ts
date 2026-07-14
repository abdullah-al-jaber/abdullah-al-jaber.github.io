const stremio_info: {
    api_host: string;
    auth_key?: string;
} = {
    api_host: "api.strem.io/api",
};

const post_json = async (url: string, body: any): Promise<any> => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    return await response.json();
};

const login_load_form = document.querySelector("div#login-load.content-box > form") as HTMLFormElement;
const sync_save_form = document.querySelector("div#sync-save.content-box > form") as HTMLFormElement;

const addon_json_textarea = document.querySelector("textarea#addon-json") as HTMLTextAreaElement;
const local_login_info = localStorage.getItem("stremio-login");

if (local_login_info) {
    const { email, password } = JSON.parse(local_login_info);
    (login_load_form.elements.namedItem("email") as HTMLInputElement).value = email;
    (login_load_form.elements.namedItem("password") as HTMLInputElement).value = password;
}

document.addEventListener("submit", (event) => {
    event.preventDefault();
});

login_load_form.onsubmit = async () => {
    try {
        const data = new FormData(login_load_form);
        const auth_key = (
            await post_json(`https://${stremio_info.api_host}/login`, {
                type: "Login",
                email: data.get("email"),
                password: data.get("password"),
            })
        ).result?.authKey;
        if (auth_key == undefined) throw new Error("Auth Key wasn't sent by Stremio Server !");
        let addons = (
            await post_json(`https://${stremio_info.api_host}/addonCollectionGet`, {
                type: "AddonCollectionGet",
                authKey: auth_key,
            })
        ).result?.addons;
        if (addons == undefined) throw new Error("Addon Collection wasn't sent by Stremio Server !");
        stremio_info.auth_key = auth_key;
        addon_json_textarea.value = JSON.stringify(addons, null, 4);
        localStorage.setItem(
            "stremio-login",
            JSON.stringify({
                email: data.get("email"),
                password: data.get("password"),
            }),
        );
    } catch (error) {
        alert("Failure in [Login & Load] !\n" + (error instanceof Error ? `${error.name}: ${error.message}` : String(error)));
    }
};

sync_save_form.onsubmit = async () => {
    try {
        if (stremio_info.auth_key == undefined) throw new Error("Please [Login & Load] before [Sync & Save] !");
        if (!window.confirm("Confirm [Sync & Save] ?")) return null;
        let success = (
            await post_json(`https://${stremio_info.api_host}/addonCollectionSet`, {
                type: "AddonCollectionSet",
                authKey: stremio_info.auth_key,
                addons: JSON.parse(addon_json_textarea.value),
            })
        ).result?.success;
        if (success == true) window.alert("Success in [Sync & Save]");
        else window.alert("Failure in [Sync & Save] !");
    } catch (error) {
        alert("Failure in [Sync & Save] !\n" + (error instanceof Error ? `${error.name}: ${error.message}` : String(error)));
    }
};
