function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    let dragHandle = element.querySelector('.panel-header');
    if (!dragHandle) {
        dragHandle = element;
    }

    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;

        const targetTagName = e.target.tagName.toUpperCase();
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || targetTagName === 'BUTTON' || targetTagName === 'SELECT') {
            return;
        }
        
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// REMOVED: displayTextWithTypewriterEffect function as it is no longer needed.

function setupCanvas() {
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const desiredWidth = window.innerWidth;
    const desiredHeight = window.innerHeight;
    canvas.width = desiredWidth * dpr;
    canvas.height = desiredHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${desiredWidth}px`;
    canvas.style.height = `${desiredHeight}px`;
    return { canvas, ctx, dpr };
}

function initParticles(canvas, ctx, dpr, numberOfParticles) {
    const particlesArray = [];
    for (let i = 0; i < numberOfParticles; i++) {
        const size = (Math.random() * 2) + 1;
        const x = Math.random() * (canvas.width / dpr - size * 2) + size;
        const y = Math.random() * (canvas.height / dpr - size * 2) + size;
        const vx = (Math.random() - 0.5) * 0.4;
        const vy = (Math.random() - 0.5) * 0.4;
        particlesArray.push(new Particle(x, y, size, 'rgba(255, 255, 255, 0.8)', vx, vy));
    }
    return particlesArray;
}

function connectParticles(ctx, particlesArray, mouse, connectDistance) {
    const connectDistanceSq = connectDistance * connectDistance;
    const mouseRadiusSq = mouse.radius * mouse.radius;

    ctx.lineWidth = 0.5;

    for (const particle of particlesArray) {
        const dxMouse = mouse.x - particle.x;
        const dyMouse = mouse.y - particle.y;
        const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;

        if (mouse.x !== null && mouse.y !== null && distMouseSq < mouseRadiusSq) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - Math.sqrt(distMouseSq) / mouse.radius})`;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
        }

        for (const otherParticle of particlesArray) {
            if (particle !== otherParticle) {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq < connectDistanceSq) {
                    ctx.strokeStyle = `rgba(100, 181, 246, ${0.1 - distanceSq / (connectDistanceSq * 10)})`;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.stroke();
                }
            }
        }
    }
}


class Particle {
    constructor(x, y, size, color, vx, vy) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update(canvas, mouse) {
        this.x += this.vx;
        this.y += this.vy;
        
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

        if (this.x > canvasWidth || this.x < 0) this.vx = -this.vx;
        if (this.y > canvasHeight || this.y < 0) this.vy = -this.vy;
        
        const ctx = canvas.getContext('2d');
        this.draw(ctx);
    }
}
