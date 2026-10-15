(function () {
    "use strict";

    var canvas = document.getElementById("network-bg");
    if (!canvas) return;
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var width = 0;
    var height = 0;
    var dpr = 1;
    var particles = [];
    var lastTime = 0;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var palette = [
        { stroke: "105, 225, 255", glow: "73, 199, 255" },
        { stroke: "107, 166, 255", glow: "92, 133, 255" },
        { stroke: "143, 150, 255", glow: "142, 105, 255" },
        { stroke: "116, 205, 255", glow: "88, 206, 255" }
    ];

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function polygonSides() {
        var roll = Math.random();
        return roll < 0.34 ? 3 : (roll < 0.68 ? 4 : 5);
    }

    function createParticle() {
        var angle = rand(0, Math.PI * 2);
        var speed = rand(7, 19);
        return {
            x: rand(0, width),
            y: rand(0, height),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            sides: polygonSides(),
            radius: rand(12, 27),
            rotation: rand(0, Math.PI * 2),
            rotationSpeed: rand(-0.22, 0.22),
            directionChange: rand(1.8, 5.5),
            directionTimer: rand(0, 4),
            color: palette[Math.floor(Math.random() * palette.length)]
        };
    }

    function resize() {
        width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
        height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
        dpr = Math.min(window.devicePixelRatio || 1, 1.6);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var target = Math.max(12, Math.min(30, Math.round((width * height) / 30000)));
        while (particles.length < target) particles.push(createParticle());
        while (particles.length > target) particles.pop();
        particles.forEach(function (p) {
            p.x = Math.min(Math.max(p.x, 0), width);
            p.y = Math.min(Math.max(p.y, 0), height);
        });
    }

    function drawPolygon(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        for (var i = 0; i < p.sides; i++) {
            var angle = (Math.PI * 2 * i / p.sides) - Math.PI / 2;
            var x = Math.cos(angle) * p.radius;
            var y = Math.sin(angle) * p.radius;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = "rgba(" + p.color.stroke + ", .69)";
        ctx.shadowColor = "rgba(" + p.color.glow + ", .26)";
        ctx.shadowBlur = 9;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(163, 234, 255, .88)";
        ctx.fill();
        ctx.restore();
    }

    function drawConnections() {
        var range = Math.max(105, Math.min(190, Math.min(width, height) * 0.31));
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var a = particles[i];
                var b = particles[j];
                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var distance = Math.sqrt(dx * dx + dy * dy);
                if (distance >= range) continue;

                // Linia łączy środki figur; jej alfa rośnie, gdy figury zbliżają się do siebie.
                var closeness = 1 - distance / range;
                var alpha = Math.min(0.58, closeness * 0.7);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.lineWidth = 0.55 + closeness * 0.45;
                ctx.strokeStyle = "rgba(98, 203, 255, " + alpha.toFixed(3) + ")";
                ctx.shadowColor = "rgba(75, 169, 255, " + (alpha * 0.7).toFixed(3) + ")";
                ctx.shadowBlur = closeness * 8;
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
    }

    function drawAmbientGlow() {
        var g1 = ctx.createRadialGradient(width * 0.18, height * 0.25, 0, width * 0.18, height * 0.25, Math.max(width, height) * 0.55);
        g1.addColorStop(0, "rgba(49, 83, 204, .075)");
        g1.addColorStop(1, "rgba(49, 83, 204, 0)");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        var g2 = ctx.createRadialGradient(width * 0.86, height * 0.76, 0, width * 0.86, height * 0.76, Math.max(width, height) * 0.48);
        g2.addColorStop(0, "rgba(170, 46, 197, .065)");
        g2.addColorStop(1, "rgba(170, 46, 197, 0)");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
    }

    function frame(now) {
        // Nie zużywaj CPU na animację tła, gdy gra Unity jest już uruchomiona.
        if (document.body.classList.contains("game-ready")) return;

        if (!document.hidden) {
            var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.04) : 0.016;
            lastTime = now;
            ctx.clearRect(0, 0, width, height);
            drawAmbientGlow();

            if (!reduceMotion) {
                particles.forEach(function (p) {
                    p.directionTimer -= dt;
                    if (p.directionTimer <= 0) {
                        var current = Math.atan2(p.vy, p.vx) + rand(-0.6, 0.6);
                        var speed = Math.max(7, Math.min(19, Math.sqrt(p.vx * p.vx + p.vy * p.vy) + rand(-1.8, 1.8)));
                        p.vx = Math.cos(current) * speed;
                        p.vy = Math.sin(current) * speed;
                        p.directionTimer = p.directionChange;
                        p.directionChange = rand(1.8, 5.5);
                    }

                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.rotation += p.rotationSpeed * dt;

                    var margin = p.radius + 4;
                    if (p.x < margin) { p.x = margin; p.vx = Math.abs(p.vx); }
                    if (p.x > width - margin) { p.x = width - margin; p.vx = -Math.abs(p.vx); }
                    if (p.y < margin) { p.y = margin; p.vy = Math.abs(p.vy); }
                    if (p.y > height - margin) { p.y = height - margin; p.vy = -Math.abs(p.vy); }
                });
            }

            drawConnections();
            particles.forEach(drawPolygon);
        }

        if (!reduceMotion) window.requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", function () { lastTime = 0; });
    resize();
    window.requestAnimationFrame(frame);
}());
