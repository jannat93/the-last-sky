const video = document.getElementById("camera");
const canvas = document.getElementById("sky-overlay");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Button to start camera + AR
document.getElementById("start-btn").addEventListener("click", async () => {
  // Start Camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied!");
    return;
  }

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

    // Draw twinkling stars
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const brightness = Math.random() * 1.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon position (approx)
    const time = Astronomy.MakeTime(new Date());
    const observer = new Astronomy.Observer(lat, lon, 0);
    const moon = Astronomy.Equator("Moon", time, observer, true, true);

    // Simple projection → center screen
    const moonX = canvas.width / 2 + Math.cos(moon.ra) * 150;
    const moonY = canvas.height / 2 - Math.sin(moon.dec) * 150;

    ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(animate);
  }
  animate();
}
