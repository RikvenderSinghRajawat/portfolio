document.addEventListener("DOMContentLoaded", () => {
    const revealNodes = document.querySelectorAll(".reveal");
    const unfoldCards = document.querySelectorAll(".unfold-card");

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12 }
    );

    revealNodes.forEach((node) => observer.observe(node));

    unfoldCards.forEach((card) => {
        const trigger = card.querySelector(".unfold-trigger");
        if (!trigger) return;

        trigger.addEventListener("click", () => {
            const open = card.classList.toggle("open");
            trigger.setAttribute("aria-expanded", String(open));
        });
    });
});
