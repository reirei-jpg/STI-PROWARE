import "../css/app.css";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

import { initializeTheme } from "@/hooks/use-appearance";

const appName =
    import.meta.env.VITE_APP_NAME || "PROWARE";

createInertiaApp({
    title: (title) =>
        title
            ? `${title} - ${appName}`
            : appName,

    resolve: async (name) => {
        const pages = import.meta.glob("./pages/**/*.tsx");

        const page = await resolvePageComponent(
            `./pages/${name}.tsx`,
            pages,
        );

        return page as React.ComponentType;
    },

    setup({ el, App, props }) {
        createRoot(el).render(
            <App {...props} />
        );
    },

    progress: {
        color: "#0D6EFD",
    },
});

initializeTheme();