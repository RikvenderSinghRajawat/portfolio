(() => {
    "use strict";

    const DOWNLOAD_TOKEN_MAP = Object.freeze({
        "resume-secure-rsr": {
            path: "Rikvender-resume-offsec.pdf",
            downloadName: "Rikvender-Singh-Rajawat-Resume.pdf"
        }
    });
    const DOWNLOAD_SESSION_KEY = "secure_download_access";

    function initRevealObserver() {
        const revealNodes = document.querySelectorAll(".reveal");
        if (!revealNodes.length) {
            return;
        }

        if (!("IntersectionObserver" in window)) {
            revealNodes.forEach((node) => node.classList.add("show"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.12 }
        );

        revealNodes.forEach((node) => observer.observe(node));
    }

    function initUnfoldCards() {
        const unfoldCards = document.querySelectorAll(".unfold-card");
        unfoldCards.forEach((card) => {
            const trigger = card.querySelector(".unfold-trigger");
            if (!trigger) {
                return;
            }

            trigger.addEventListener("click", () => {
                const open = card.classList.toggle("open");
                trigger.setAttribute("aria-expanded", String(open));
            });
        });
    }

    function initToolAccordions() {
        const toolItems = Array.from(document.querySelectorAll(".tool-item"));
        if (!toolItems.length) {
            return;
        }

        function setOpen(item, open) {
            const trigger = item.querySelector(".tool-trigger");
            const panel = item.querySelector(".tool-panel");
            if (!trigger || !panel) {
                return;
            }

            item.classList.toggle("open", open);
            trigger.setAttribute("aria-expanded", String(open));
            panel.style.maxHeight = open ? `${panel.scrollHeight}px` : "0px";
        }

        function openOnly(itemToOpen) {
            toolItems.forEach((item) => setOpen(item, item === itemToOpen));
        }

        toolItems.forEach((item) => {
            const trigger = item.querySelector(".tool-trigger");
            if (!trigger) {
                return;
            }

            trigger.addEventListener("click", () => {
                const isOpen = item.classList.contains("open");
                if (isOpen) {
                    setOpen(item, false);
                    return;
                }

                openOnly(item);
            });
        });

        window.addEventListener("resize", () => {
            toolItems.forEach((item) => {
                if (!item.classList.contains("open")) {
                    return;
                }

                const panel = item.querySelector(".tool-panel");
                if (panel) {
                    panel.style.maxHeight = `${panel.scrollHeight}px`;
                }
            });
        });

        const firstOpen = document.querySelector(".tool-item.open") || toolItems[0];
        if (firstOpen) {
            openOnly(firstOpen);
        }
    }

    function initSocialToggleButtons() {
        const buttons = document.querySelectorAll("[data-social-toggle]");
        buttons.forEach((button) => {
            const panelId = button.getAttribute("aria-controls");
            if (!panelId) {
                return;
            }

            const panel = document.getElementById(panelId);
            if (!panel) {
                return;
            }

            const showLabel = button.getAttribute("data-show-label") || "Show Links";
            const hideLabel = button.getAttribute("data-hide-label") || "Hide Links";

            const setState = (expanded) => {
                button.setAttribute("aria-expanded", String(expanded));
                button.textContent = expanded ? hideLabel : showLabel;
                panel.hidden = !expanded;
            };

            setState(button.getAttribute("aria-expanded") === "true");
            button.addEventListener("click", () => {
                const expanded = button.getAttribute("aria-expanded") === "true";
                setState(!expanded);
            });
        });
    }

    function stripSuspiciousQueryParams() {
        if (!window.location.search) {
            return;
        }

        const blockedKeys = new Set([
            "id",
            "userid",
            "user_id",
            "accountid",
            "account_id",
            "file",
            "filename",
            "path",
            "cmd",
            "command",
            "exec",
            "shell"
        ]);
        const valuePattern = /[;&|`$<>]/;
        const params = new URLSearchParams(window.location.search);
        let shouldStrip = false;

        for (const [key, value] of params.entries()) {
            if (blockedKeys.has(key.toLowerCase()) || valuePattern.test(value)) {
                shouldStrip = true;
                break;
            }
        }

        if (!shouldStrip) {
            return;
        }

        const cleanUrl = `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState({}, document.title, cleanUrl);
        console.warn("Suspicious query parameters were removed.");
    }

    function sanitizeUnsafeAnchors() {
        document.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) {
                return;
            }

            if (/^\s*javascript:/i.test(href)) {
                link.removeAttribute("href");
                link.setAttribute("role", "link");
                link.setAttribute("aria-disabled", "true");
            }
        });
    }

    function initSecurityMonitoring() {
        document.addEventListener("securitypolicyviolation", (event) => {
            console.warn("CSP violation:", event.violatedDirective, event.blockedURI);
        });

        window.addEventListener("error", () => {
            console.warn("Runtime error handled.");
        });

        console.info("Security controls active: query sanitization, CSP monitoring, safe link validation.");
    }

    function createNonce() {
        if (window.crypto && window.crypto.getRandomValues) {
            const bytes = new Uint8Array(8);
            window.crypto.getRandomValues(bytes);
            return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function initSecureDownloadLinks() {
        document.querySelectorAll("[data-download-token]").forEach((link) => {
            link.addEventListener("click", (event) => {
                const token = link.getAttribute("data-download-token");
                if (!token || !DOWNLOAD_TOKEN_MAP[token]) {
                    event.preventDefault();
                    return;
                }

                const accessPayload = {
                    token,
                    nonce: createNonce(),
                    expiresAt: Date.now() + 2 * 60 * 1000
                };

                try {
                    sessionStorage.setItem(DOWNLOAD_SESSION_KEY, JSON.stringify(accessPayload));
                } catch (error) {
                    // If session storage is blocked, keep normal navigation.
                }

                event.preventDefault();
                window.location.href = `/download/#${encodeURIComponent(token)}`;
            });
        });
    }

    function initTokenizedDownloadPage() {
        if (!/(^|\/)download(?:\.html)?\/?$/i.test(window.location.pathname)) {
            return;
        }

        const statusNode = document.querySelector("[data-download-status]");
        const fallbackLink = document.querySelector("[data-download-fallback]");
        let token = window.location.hash.replace(/^#/, "").trim();

        try {
            token = decodeURIComponent(token);
        } catch (error) {
            token = "";
        }

        if (!/^[a-z0-9-]+$/i.test(token)) {
            token = "";
        }

        const asset = DOWNLOAD_TOKEN_MAP[token];
        let hasAccess = false;

        try {
            const rawAccess = sessionStorage.getItem(DOWNLOAD_SESSION_KEY);
            if (rawAccess) {
                const parsedAccess = JSON.parse(rawAccess);
                const validWindow = Number(parsedAccess.expiresAt) > Date.now();
                hasAccess = parsedAccess.token === token && validWindow;
            }
            sessionStorage.removeItem(DOWNLOAD_SESSION_KEY);
        } catch (error) {
            hasAccess = false;
        }

        if (!asset || !hasAccess) {
            if (statusNode) {
                statusNode.textContent = "Access denied. Start the download from Experience or Education page.";
            }
            if (fallbackLink) {
                fallbackLink.hidden = true;
            }
            return;
        }

        if (statusNode) {
            statusNode.textContent = "Secure token verified. Download should start automatically.";
        }

        if (fallbackLink) {
            fallbackLink.href = asset.path;
            fallbackLink.download = asset.downloadName;
            fallbackLink.hidden = false;
        }

        const autoDownload = document.createElement("a");
        autoDownload.href = asset.path;
        autoDownload.download = asset.downloadName;
        autoDownload.hidden = true;
        document.body.appendChild(autoDownload);
        autoDownload.click();
        autoDownload.remove();
    }

    document.addEventListener("DOMContentLoaded", () => {
        stripSuspiciousQueryParams();
        sanitizeUnsafeAnchors();
        initRevealObserver();
        initUnfoldCards();
        initToolAccordions();
        initSocialToggleButtons();
        initSecureDownloadLinks();
        initTokenizedDownloadPage();
        initSecurityMonitoring();
    });
})();
