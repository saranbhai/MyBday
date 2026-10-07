// Blazor controls the intro and message state; this script handles native dialog and visual effects.
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const initializedPopups = new WeakSet();
    let activeCard = null;
    let animationFrame = null;
    let pendingPointer = null;

    function resetCard() {
        if (animationFrame !== null) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (activeCard) {
            activeCard.style.removeProperty('--tilt-x');
            activeCard.style.removeProperty('--tilt-y');
            activeCard.style.removeProperty('--shine-x');
            activeCard.style.removeProperty('--shine-y');
        }

        activeCard = null;
        pendingPointer = null;
    }

    // Event delegation keeps the effect working when Blazor updates the page.
    document.addEventListener('pointermove', (event) => {
        if (reducedMotion.matches || event.pointerType === 'touch') {
            resetCard();
            return;
        }

        const card = event.target instanceof Element ? event.target.closest('[data-tilt]') : null;
        if (!card) {
            resetCard();
            return;
        }

        if (activeCard !== card) {
            resetCard();
            activeCard = card;
        }

        pendingPointer = { x: event.clientX, y: event.clientY };
        if (animationFrame !== null) return;

        // At most one style update per frame, even during fast pointer movement.
        animationFrame = window.requestAnimationFrame(() => {
            animationFrame = null;
            if (!activeCard || !pendingPointer) return;

            const bounds = activeCard.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;

            const x = Math.min(1, Math.max(0, (pendingPointer.x - bounds.left) / bounds.width));
            const y = Math.min(1, Math.max(0, (pendingPointer.y - bounds.top) / bounds.height));

            activeCard.style.setProperty('--tilt-x', `${(0.5 - y) * 12}deg`);
            activeCard.style.setProperty('--tilt-y', `${(x - 0.5) * 14}deg`);
            activeCard.style.setProperty('--shine-x', `${x * 100}%`);
            activeCard.style.setProperty('--shine-y', `${y * 100}%`);
        });
    }, { passive: true });

    document.addEventListener('pointerout', (event) => {
        if (activeCard && (!(event.relatedTarget instanceof Node) || !activeCard.contains(event.relatedTarget))) {
            resetCard();
        }
    }, { passive: true });

    window.addEventListener('blur', resetCard);
    reducedMotion.addEventListener('change', resetCard);

    function openPopup(popup) {
        if (!(popup instanceof HTMLDialogElement) || !popup.isConnected) return;

        if (!initializedPopups.has(popup)) {
            // Route Escape through the same Blazor handler as the popup's close icon.
            popup.addEventListener('cancel', (event) => {
                event.preventDefault();
                popup.querySelector('[data-intro-close], [data-farewell-close]')?.click();
            });
            initializedPopups.add(popup);
        }

        if (!popup.open) popup.showModal();
    }

    // Open the native modal after Blazor renders it, then focus newly revealed content.
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (!(node instanceof Element)) continue;

                const popup = node.matches('[data-intro-popup], [data-farewell-popup]')
                    ? node
                    : node.querySelector('[data-intro-popup], [data-farewell-popup]');

                openPopup(popup);

                const loveButton = node.matches('[data-love-button]')
                    ? node
                    : node.querySelector('[data-love-button]');

                if (loveButton && loveButton.isConnected) {
                    loveButton.focus({ preventScroll: true });
                    loveButton.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
                }

                const message = node.matches('[data-message-card]')
                    ? node
                    : node.querySelector('[data-message-card]');

                if (message) {
                    message.focus({ preventScroll: true });
                    message.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
                }
            }

            // The letter's close button is removed before the final popup opens.
            // Return to the surviving birthday button when that popup is dismissed.
            for (const node of record.removedNodes) {
                if (!(node instanceof Element)) continue;

                const farewell = node.matches('[data-farewell-popup]')
                    ? node
                    : node.querySelector('[data-farewell-popup]');

                if (farewell && !document.querySelector('dialog[open]')) {
                    const loveButton = document.querySelector('[data-love-button]');
                    if (loveButton) {
                        loveButton.focus({ preventScroll: true });
                        loveButton.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // An observer only sees future changes; also handle popups rendered before this script loaded.
    document.querySelectorAll('[data-intro-popup], [data-farewell-popup]').forEach(openPopup);
})();
