document.addEventListener("DOMContentLoaded", () => {
    const stremio_info: {
        api_host: string;
        auth_key?: string;
    } = {
        api_host: "api.strem.io/api",
    };
    const post_json = async (url: string, body: any): Promise<any> => {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return await response.json();
    };

    const login_box = document.querySelector("div#login-box") as HTMLDivElement;
    const addon_box = document.querySelector("div#addon-box") as HTMLDivElement;

    login_box.classList.remove("hidden");
    addon_box.classList.add("hidden");

    const login_button = document.querySelector("button#login") as HTMLButtonElement;
    const save_button = document.querySelector("button#save") as HTMLButtonElement;

    const addon_textarea = document.querySelector("textarea#addon") as HTMLTextAreaElement;

    document.querySelectorAll("form").forEach((form) => {
        form.onsubmit = (event) => event.preventDefault();
    });

    login_button.onclick = async () => {
        const login_form = document.querySelector("div#login-box") as HTMLFormElement;
        let auth_key = (
            await post_json(`https://${stremio_info.api_host}/login`, {
                type: "Login",
                email: login_form.email,
                password: login_form.password,
            })
        ).result?.authKey;
        if (auth_key == undefined) return window.alert("Failure in [Login] !");
        let addon = (
            await post_json(`https://${stremio_info.api_host}/addonCollectionGet`, {
                type: "AddonCollectionGet",
                authKey: auth_key,
            })
        ).result?.addons;
        if (addon == undefined) return window.alert("Failure in [Load Addon] !");
        stremio_info.auth_key = auth_key;
        login_box.classList.add("hidden");
        addon_box.classList.remove("hidden");
    };

    save_button.onclick = async () => {
        if (stremio_info.auth_key == undefined) return window.alert("Failure in [Login] !");
        let success = (
            await post_json(`https://${stremio_info.api_host}/addonCollectionSet`, {
                type: "AddonCollectionSet",
                authKey: stremio_info.auth_key,
                addons: addon_textarea.value,
            })
        ).result?.success;
        if (success != true) return window.alert("Failure in [Save & Sync Addon] !");
    };
});
