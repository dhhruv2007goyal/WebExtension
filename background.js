// async function shiftTab(d) {
//     const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
//     const current = tabs.find(tab => tab.active);

//     if (!current) {
//         console.warn("No active tab found");
//         return;
//     }

//     const indx = current.index;
//     let next;
//     if (d === 'right') {
//         next = (indx + 1) % tabs.length;
//     } else {
//         next = (indx - 1 + tabs.length) % tabs.length;
//     }

//     await chrome.tabs.update(tabs[next].id, { active: true });
// }

async function zoom(d) {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tabs || tabs.length === 0) {
        console.warn("No active tab found");
        return;
    }

    const current = tabs[0];
    const z = await chrome.tabs.getZoom(current.id);

    if (d === 'in') {
        chrome.tabs.setZoom(current.id, z + 0.1);
    } else {
        chrome.tabs.setZoom(current.id, z - 0.1);
    }
}

async function scroll(d) {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    
    if (!tabs || tabs.length === 0) {
        console.warn("No active tab found");
        return;
    }

    const activeTab = tabs[0];

    chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (dir) => {
            switch(dir) {
                case 'up':
                    window.scrollBy({ top: -200, behavior: 'smooth' });
                    break;
                case 'down':
                    window.scrollBy({ top: 200, behavior: 'smooth' });
                    break;
                case 'left':
                    window.scrollBy({ left: -50, behavior: 'smooth' });
                    break;
                case 'right':
                    window.scrollBy({ left: 50, behavior: 'smooth' });
                    break;
            }
        },
        args: [d]
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in background.js:", request.command);

    switch (request.command) {
        case "down":
            scroll('down');
            break;
        case "up":
            scroll('up');
            break;
        case "left":
            scroll('left');
            break;
        case "right":
            scroll('right');
            break;
        case "fist":
            zoom('in');
            break;
        case "palm":
            zoom('out');
            break;
        // case "tab left":
        //     shiftTab("left");
        //     break;
        // case "tab right":
        //     shiftTab("right");
        //     break;
        default:
            console.warn("Unknown command received:", request.command);
    }
});

// Move sidePanel setup inside a proper event listener
chrome.action.onClicked.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error(error));
});
