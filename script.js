const video = document.getElementById("camera");
const canvas = document.getElementById("sky-overlay");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = []; // will load from stars.json

// Button → start AR
document.getElementById("start-btn").addEventListener("click", async () => {
  // Start Camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied!");
    return;
  }

  // Load star catalog
  const res = await fetch("stars.json");
  stars = await res.json();

  // Get location for astronomy-engine
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    drawSky(lat, lon);
  });
});

// 🌌 Draw stars + Moon
function drawSky(lat, lon) {
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Time + observer
    const time = Astronomy.MakeTime(new Date());
    const observer = new Astronomy.Observer(lat, lon, 0);

    // --- Draw Stars ---
    stars.forEach(star => {
      // Convert RA/Dec → horizontal coordinates
      const eq = new Astronomy.Equatorial(star.ra, star.dec, 1);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, "normal");

      if (hor.altitude > 0) { // only draw stars above horizon
        const x = canvas.width / 2 + hor.azimuth / 180 * (canvas.width / 2);
        const y = canvas.height / 2 - hor.altitude / 90 * (canvas.height / 2);

        const mag = Math.max(0.5, 4 - star.mag); // brightness by magnitude
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, mag, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // --- Draw Moon ---
    const moonEq = Astronomy.Equator("Moon", time, observer, true, true);
    const moonHor = Astronomy.Horizon(time, observer, moonEq.ra, moonEq.dec, "normal");

    if (moonHor.altitude > 0) {
      const moonX = canvas.width / 2 + moonHor.azimuth / 180 * (canvas.width / 2);
      const moonY = canvas.height / 2 - moonHor.altitude / 90 * (canvas.height / 2);

      ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }
  animate();
}
