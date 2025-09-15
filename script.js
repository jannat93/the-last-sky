const video = document.getElementById('cam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

const btnCamera = document.getElementById('btnCamera');
const btnMotion = document.getElementById('btnMotion');
const btnGeo = document.getElementById('btnGeo');
const statusEl = document.getElementById('status');
const hfovRange = document.getElementById('hfov');
const hfovLabel = document.getElementById('hfovLabel');

let lat = null, lon = null, heightMeters = 0;
let deviceAz = 0, deviceAlt = 0;
let selectedBodies = new Set(['Moon']);

document.querySelectorAll('.objChk').forEach(cb=>{
  cb.addEventListener('change', e=>{
    const body = e.target.dataset.body;
    if(e.target.checked) selectedBodies.add(body);
    else selectedBodies.delete(body);
  });
});

hfovRange.addEventListener('input', ()=> {
  hfovLabel.innerText = hfovRange.value;
});

function setStatus(s){ statusEl.innerText = "Status: " + s; }

// Camera
async function startCamera(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: { ideal: "environment" } } 
    });
    video.srcObject = stream;
    await video.play();
    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    setStatus("camera started");
    requestAnimationFrame(loop);
  } catch(err){
    setStatus("camera failed: " + err.message);
  }
}

function fitCanvas(){
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;
}

// Location
function getLocation(){
  if(!navigator.geolocation) {
    setStatus("geolocation not supported");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    heightMeters = pos.coords.altitude || 0;
    setStatus(`location ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  }, ()=>setStatus("geolocation denied"), { enableHighAccuracy: true });
}

// Orientation
function handleOrientation(e){
  if(e.webkitCompassHeading !== undefined){
    deviceAz = e.webkitCompassHeading;
  } else {
    deviceAz = 360 - (e.alpha || 0);
  }
  deviceAlt = (e.beta || 0) - 90;
  deviceAz = (deviceAz + 360) % 360;
}

async function requestMotionPermission(){
  if(typeof DeviceOrientationEvent !== "undefined" &&
     typeof DeviceOrientationEvent.requestPermission === "function"){
    const resp = await DeviceOrientationEvent.requestPermission();
    if(resp === "granted"){
      window.addEventListener("deviceorientation", handleOrientation);
      setStatus("motion granted");
    }
  } else {
    window.addEventListener("deviceorientation", handleOrientation);
    setStatus("motion enabled");
  }
}

// Astronomy
function getBodyAzAlt(bodyName){
  try {
    const date = Astronomy.MakeTime(new Date());
    const observer = new Astronomy.Observer(lat||0, lon||0, heightMeters||0);
    const body = Astronomy.Body[bodyName];
    const equ = Astronomy.Equator(body, date, observer, true, true);
    const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, "normal");
    return { az: hor.azimuth, alt: hor.altitude };
  } catch {
    return null;
  }
}

function projectToScreen(objAz, objAlt){
  let deltaAz = (objAz - deviceAz + 540) % 360 - 180;
  let deltaAlt = objAlt - deviceAlt;
  const hfov = Number(hfovRange.value) || 60;
  const vfov = hfov * (canvas.height / canvas.width);

  if(Math.abs(deltaAz) > hfov/2 || Math.abs(deltaAlt) > vfov/2) return null;

  const x = canvas.width/2 + (deltaAz / (hfov/2)) * (canvas.width/2);
  const y = canvas.height/2 - (deltaAlt / (vfov/2)) * (canvas.height/2);
  return {x,y};
}

function drawOverlay(objects){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "white";

  for(const o of objects){
    if(!o.screen) continue;
    ctx.beginPath();
    ctx.arc(o.screen.x, o.screen.y, 14,0,Math.PI*2);
    ctx.strokeStyle="white"; ctx.stroke();
    ctx.fillText(o.label, o.screen.x, o.screen.y-18);
  }
}

function loop(){
  if(video.readyState >= 2){
    if(canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) fitCanvas();
  }

  const now = new Date();
  const visible = [];
  for(const body of selectedBodies){
    const pos = getBodyAzAlt(body, now);
    if(!pos) continue;
    const screen = projectToScreen(pos.az, pos.alt);
    if(screen) visible.push({label: body, screen});
  }
  drawOverlay(visible);
  requestAnimationFrame(loop);
}

// Events
btnCamera.addEventListener('click', startCamera);
btnGeo.addEventListener('click', getLocation);
btnMotion.addEventListener('click', requestMotionPermission);

setStatus("ready — press Start Camera");
