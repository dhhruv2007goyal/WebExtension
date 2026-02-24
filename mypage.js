const toasts = [
  { btn: 'liveToast1Btn', toast: 'liveToast' },
  { btn: 'liveToast2Btn', toast: 'liveToast2' },
  { btn: 'liveToast3Btn', toast: 'liveToast3' },
  { btn: 'liveToast4Btn', toast: 'liveToast4' }
];

toasts.forEach(pair => {
  const trigger = document.getElementById(pair.btn);
  const toast = document.getElementById(pair.toast);
  
  if (trigger && toast) {
    const toastbs = bootstrap.Toast.getOrCreateInstance(toast);
    
    trigger.addEventListener('click', () => {
      toastbs.show();
    });
  }
});

const toasts2 = [
  { btn: 'takeinputbtn', toast: 'rec1' },
  { btn: 'takeinputbtn2', toast: 'rec2' },
  { btn: 'takeinputbtn3', toast: 'rec3' },
  { btn: 'takeinputbtn4', toast: 'rec4' }
];

toasts2.forEach(pair => {
  const trigger = document.getElementById(pair.btn);
  const toast = document.getElementById(pair.toast);
  
  if (trigger && toast) {
    const toastbs = bootstrap.Toast.getOrCreateInstance(toast);
    
    trigger.addEventListener('click', () => {
      toastbs.show();
    });
  }
});


var vid = document.querySelector("#vid");
if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
        vid.srcObject = stream;
    })
    .catch(function (error) {
        console.log("Something went wrong!", error);
    });
}

function detect(gesture){
  chrome.runtime.sendMessage({ action: "gesture_detected", command: gesture });
}

const canv = document.createElement('canvas');
canv.width = 128;
canv.height = 128;
const ctx = canv.getContext('2d');

async function pass() {
    if (vid.readyState !== 4) return;
    ctx.drawImage(vid, 0, 0, 128, 128);
    const base64Image = canv.toDataURL('image/jpeg').split(',')[1];

    try {
        const pred = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const result = await pred.json();

        if (result.confidence > 90) {
            detect(result.gesture);
        }

        console.log(`Gesture: ${result.gesture} — Confidence: ${result.confidence}%`);

    } catch (error) {
        console.log("Prediction error:", error);
    }
}

setInterval(pass, 500);

function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function disableGesture(className) {
    try {
        const response = await fetch('http://localhost:5000/disable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_name: className })
        });

        const result = await response.json();
        showToast(result.message);

    } catch (error) {
        showToast('Error: ' + error);
    }
}

async function enableGesture(className) {

    try {
        const response = await fetch('http://localhost:5000/enable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_name: className })
        });

        const result = await response.json();
        showToast(result.message);

    } catch (error) {
        showToast('Error: ' + error);
    }
}

async function editGesture(className, numFrames = 200) {
    showToast(`Capturing frames`);

    const f = [];
    const tempvid = document.createElement('canvas');
    tempvid.width = 128;
    tempvid.height = 128;
    const tempCtx = tempvid.getContext('2d');

    await new Promise((resolve) => {
        let count = 0;
        const interval = setInterval(() => {
            if (vid.readyState === 4) {
                tempCtx.drawImage(vid, 0, 0, 128, 128);
                f.push(tempvid.toDataURL('image/jpeg').split(',')[1]);
                count++;
            }
            if (count >= numFrames) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });

    showToast('Recording finished!');

    try {
        const response = await fetch('http://localhost:5000/recapture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_name: className, frames: f })
        });
        const result = await response.json();
        showToast(result.message);
    } catch (error) {
        console.log('Error:', error);
        showToast('Error: ' + error);
    }
}
function attachGestureListeners() {
    const gestureBtns = [
        { id: 'disable-scroll-up',    fn: () => disableGesture('up') },
        { id: 'disable-scroll-down',  fn: () => disableGesture('down') },
        { id: 'disable-scroll-left',  fn: () => disableGesture('left') },
        { id: 'disable-scroll-right', fn: () => disableGesture('right') },
        { id: 'disable-tab-left',     fn: () => disableGesture('tab left') },
        { id: 'disable-tab-right',    fn: () => disableGesture('tab right') },
        { id: 'disable-zoom-in',      fn: () => disableGesture('fist') },
        { id: 'disable-zoom-out',     fn: () => disableGesture('palm') },
        { id: 'enable-scroll-up',     fn: () => enableGesture('up') },
        { id: 'enable-scroll-down',   fn: () => enableGesture('down') },
        { id: 'enable-scroll-left',   fn: () => enableGesture('left') },
        { id: 'enable-scroll-right',  fn: () => enableGesture('right') },
        { id: 'enable-tab-left',      fn: () => enableGesture('tab left') },
        { id: 'enable-tab-right',     fn: () => enableGesture('tab right') },
        { id: 'enable-zoom-in',       fn: () => enableGesture('fist') },
        { id: 'enable-zoom-out',      fn: () => enableGesture('palm') },
        { id: 'edit-scroll-up',     fn: () => editGesture('up') },
        { id: 'edit-scroll-down',   fn: () => editGesture('down') },
        { id: 'edit-scroll-left',   fn: () => editGesture('left') },
        { id: 'edit-scroll-right',  fn: () => editGesture('right') },
        { id: 'edit-tab-left',      fn: () => editGesture('tab left') },
        { id: 'edit-tab-right',     fn: () => editGesture('tab right') },
        { id: 'edit-zoom-in',       fn: () => editGesture('fist') },
        { id: 'edit-zoom-out',      fn: () => editGesture('palm') },
    ];

    gestureBtns.forEach(({ id, fn }) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    });
}

attachGestureListeners();