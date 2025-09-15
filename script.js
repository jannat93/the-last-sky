const video = document.getElementById("camera");
const canvas = document.getElementById("sky-overlay");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stars = [];

// Load bright star catalog
fetch("stars.json")
  .then(res => res.json())
  .then(data => stars = data)
  .catch(err => console.error("Error loading stars.json:", err));

document.getElementById("start-btn").addEventListener("click", async () => {
  // Start camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied!");
    return;
  }

  // Get user location
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    drawSky(lat, lon);
  });
});

function drawSky(lat, lon) {
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const time = Astronomy.MakeTime(new Date());
    const observer = new Astronomy.Observer(lat, lon, 0);

    // --- Draw stars ---
    stars.forEach(star => {
      const eq = new Astronomy.Equatorial(star.ra, star.dec, 1);
      const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, "normal");

      if (hor.altitude > 0) { // visible
        const x = canvas.width / 2 + hor.azimuth / 360 * canvas.width;
        const y = canvas.height / 2 - hor.altitude / 90 * canvas.height;

        const size = Math.max(0.5, 4 - star.magnitude); // smaller for dim stars
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
      }
    });

    // --- Draw Moon ---
    const moonEq = Astronomy.Equator("Moon", time, observer, true, true);
    const moonHor = Astronomy.Horizon(time, observer, moonEq.ra, moonEq.dec, "normal");

    if (moonHor.altitude > 0) {
      const moonX = canvas.width / 2 + moonHor.azimuth / 360 * canvas.width;
      const moonY = canvas.height / 2 - moonHor.altitude / 90 * canvas.height;
      ctx.fillStyle = "rgba(255,255,200,0.9)";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }
  animate();
}
