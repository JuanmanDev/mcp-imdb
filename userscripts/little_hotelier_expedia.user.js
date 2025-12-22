// ==UserScript==
// @name         Little Hotelier Expedia Tools
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add Expedia search and copy buttons
// @author       You
// @match        https://app.littlehotelier.com/extranet/properties/*/reservations*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const EXPEDIA_CHANNEL_ID = '287';

    // Spanish month names for display format
    const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    function init() {
        // Find the "Exportar" button to anchor our new buttons
        // Selector provided by user: <a class="export outside-border pull-left" ...>Exportar</a>
        const exportBtn = document.querySelector('a.export.outside-border.pull-left');

        // If not found, retry after a short delay (in case of dynamic loading)
        if (!exportBtn) {
            setTimeout(init, 1000);
            return;
        }

        // Prevent duplicate buttons if script runs multiple times
        if (document.getElementById('lh-expedia-search-btn')) return;

        // 1. Add "Last 3 Months Expedia" button
        addExpediaSearchButton(exportBtn);

        // 2. Add "Copy Refs" button if currently filtered by Expedia
        if (isExpediaFilterActive()) {
            addCopyRefsButton(exportBtn);
        }
    }

    function isExpediaFilterActive() {
        const urlParams = new URLSearchParams(window.location.search);
        // Check standard param
        if (urlParams.get('reservation_filter[channel_id]') === EXPEDIA_CHANNEL_ID) return true;

        // Check encoded param just in case
        // URLSearchParams handles decoding, so the above should work.
        return false;
    }

    function addExpediaSearchButton(targetElement) {
        const btn = document.createElement('a');
        btn.id = 'lh-expedia-search-btn';
        // Reuse classes
        btn.className = 'export outside-border pull-left';
        btn.style.marginLeft = '10px';
        btn.style.cursor = 'pointer';
        // Add a search icon (unicode)
        btn.innerHTML = '🔍 Expedia (Ultimos 3 meses)';

        // Calculate dates
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        const formatDateISO = (date) => {
            return date.toISOString().split('T')[0];
        };

        const formatDateDisplay = (date) => {
             // Format: "30 sep 2025"
             const d = date.getDate();
             const m = MONTHS_ES[date.getMonth()];
             const y = date.getFullYear();
             return `${d}+${m}+${y}`;
        };

        // Extract UUID from current URL
        // URL: /extranet/properties/UUID/reservations
        const pathParts = window.location.pathname.split('/');
        const propertyIndex = pathParts.indexOf('properties');
        let uuid = '';
        if (propertyIndex !== -1 && pathParts.length > propertyIndex + 1) {
            uuid = pathParts[propertyIndex + 1];
        } else {
            console.error('UUID not found in URL');
            return;
        }

        const dateFromISO = formatDateISO(threeMonthsAgo);
        const dateToISO = formatDateISO(today);
        const dateFromDisplay = formatDateDisplay(threeMonthsAgo);
        const dateToDisplay = formatDateDisplay(today);

        // Construct URL
        const params = new URLSearchParams();
        params.set('utf8', '✓');
        params.set('reservation_filter[date_type]', 'CheckIn');
        params.set('reservation_filter[status]', '');
        params.set('reservation_filter[date_from]', dateFromISO);
        params.set('reservation_filter[date_from_display]', dateFromDisplay.replace(/\+/g, ' ')); // The browser will encode spaces as + or %20
        params.set('reservation_filter[date_to]', dateToISO);
        params.set('reservation_filter[date_to_display]', dateToDisplay.replace(/\+/g, ' '));
        params.set('reservation_filter[channel_id]', EXPEDIA_CHANNEL_ID);
        // Empty fields from example
        params.set('reservation_filter[guest_last_name]', '');
        params.set('reservation_filter[booking_reference_id]', '');
        params.set('reservation_filter[invoice_number]', '');

        // Manually construct string to ensure '+' for spaces if needed, although URLSearchParams usually does %20 or +.
        // Little Hotelier uses + in the example: 30+sep+2025.
        // We will stick to the constructed href.

        const baseUrl = `/extranet/properties/${uuid}/reservations`;
        // We need to force '+' for display dates if the standard encoding doesn't match, but let's try standard first.

        btn.href = `${baseUrl}?${params.toString()}`;

        // Place on the "other side" -> assuming right of the export button since it's pull-left
        targetElement.parentNode.insertBefore(btn, targetElement.nextSibling);
    }

    function addCopyRefsButton(targetElement) {
        const btn = document.createElement('a');
        btn.id = 'lh-expedia-copy-btn';
        btn.className = 'export outside-border pull-left';
        btn.style.marginLeft = '10px';
        btn.style.cursor = 'pointer';
        btn.innerHTML = '📋 Copiar Refs';

        btn.onclick = (e) => {
            e.preventDefault();
            showModal();
        };

        // Insert after the search button if it exists, or after export button
        const searchBtn = document.getElementById('lh-expedia-search-btn');
        const insertPoint = searchBtn || targetElement;
        insertPoint.parentNode.insertBefore(btn, insertPoint.nextSibling);
    }

    function showModal() {
        // Extract refs using user's logic
        // $$(".booking-reference").map(e => e.innerText.substr(4)).join("\n")
        const refsElements = document.querySelectorAll(".booking-reference");
        if (!refsElements.length) {
            alert('No se encontraron referencias de reserva (class .booking-reference).');
            return;
        }

        const refs = Array.from(refsElements)
            .map(e => e.innerText.trim().substring(4))
            .join("\n");

        // Create Modal
        const modalId = 'lh-copy-modal';
        let modal = document.getElementById(modalId);
        if (modal) document.body.removeChild(modal);

        modal = document.createElement('div');
        modal.id = modalId;
        Object.assign(modal.style, {
            position: 'fixed',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: '9999',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });

        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '5px',
            width: '400px',
            maxWidth: '90%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        });

        const title = document.createElement('h3');
        title.innerText = 'Referencias Expedia';
        title.style.marginTop = '0';

        const textarea = document.createElement('textarea');
        textarea.value = refs;
        Object.assign(textarea.style, {
            height: '200px',
            width: '100%',
            fontFamily: 'monospace',
            padding: '8px',
            boxSizing: 'border-box'
        });

        const btnContainer = document.createElement('div');
        Object.assign(btnContainer.style, {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
        });

        const copyBtn = document.createElement('button');
        copyBtn.innerText = 'Copiar';
        copyBtn.className = 'btn btn-primary'; // assuming bootstrap
        copyBtn.onclick = () => {
            textarea.select();
            document.execCommand('copy');
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copiado!';
            setTimeout(() => copyBtn.innerText = originalText, 2000);
        };

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Cerrar';
        closeBtn.className = 'btn btn-default';
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };

        btnContainer.appendChild(closeBtn);
        btnContainer.appendChild(copyBtn);

        content.appendChild(title);
        content.appendChild(textarea);
        content.appendChild(btnContainer);
        modal.appendChild(content);

        document.body.appendChild(modal);
    }

    // Run init
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    // Also observe changes in case of SPA navigation or dynamic reloads
    const observer = new MutationObserver((mutations) => {
         if (!document.getElementById('lh-expedia-search-btn')) {
             init();
         }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
