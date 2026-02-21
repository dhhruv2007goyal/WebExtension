const toasts = [
  { btn: 'liveToastBtn', toast: 'liveToast' },
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
canv.width = 224;
canv.height = 224;
const ctx = canv.getContext('2d');

async function pass() {
    if (vid.readyState !== 4) return;
    ctx.drawImage(vid, 0, 0, 224, 224);
    const base64Image = canv.toDataURL('image/jpeg').split(',')[1];

    try {
        const pred = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const result = await pred.json();

        if (result.confidence > 70) {
            detect(result.gesture);
        }

        console.log(`Gesture: ${result.gesture} — Confidence: ${result.confidence}%`);

    } catch (error) {
        console.log("Prediction error:", error);
    }
}

setInterval(pass, 500);