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

// --- Canvas Setup Functions ---
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
        const size = (Math.random() * 3) + 1;
        const x = Math.random() * (canvas.width / dpr - size * 2) + size;
        const y = Math.random() * (canvas.height / dpr - size * 2) + size;
        const vx = (Math.random() - 0.5) * 0.5;
        const vy = (Math.random() - 0.5) * 0.5;
        particlesArray.push(new Particle(x, y, size, 'rgba(255, 255, 255, 0.8)', vx, vy));
    }
    return particlesArray;
}

function connectParticles(ctx, particlesArray, mouse, connectDistance) {
    ctx.lineWidth = 1;
    for (const particle of particlesArray) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (mouse.x !== null && mouse.y !== null && distance < mouse.radius) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / mouse.radius})`;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();

            for (const otherParticle of particlesArray) {
                if (particle !== otherParticle) {
                    const dx2 = particle.x - otherParticle.x;
                    const dy2 = particle.y - otherParticle.y;
                    const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    if (distance2 < connectDistance / 2) {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - distance2 / (connectDistance * 2)})`;
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                    }
                }
            }
        } else {
            for (const otherParticle of particlesArray) {
                if (particle !== otherParticle) {
                    const dx2 = particle.x - otherParticle.x;
                    const dy2 = particle.y - otherParticle.y;
                    const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    if (distance2 < connectDistance) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    for (let i = 0; i < particlesArray.length; i++) {
        for (let j = i + 1; j < particlesArray.length; j++) {
            const distance = Math.sqrt(
                (particlesArray[i].x - particlesArray[j].x) * (particlesArray[i].x - particlesArray[j].x) +
                (particlesArray[i].y - particlesArray[j].y) * (particlesArray[i].y - particlesArray[j].y)
            );
            if (distance < connectDistance && !particlesArray[i].closeToMouse && !particlesArray[j].closeToMouse) {
                ctx.strokeStyle = 'rgba(100, 181, 246, 0.1)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                ctx.stroke();
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
        this.closeToMouse = false; // proximity
    }
    draw() {
        const canvas = document.getElementById('backgroundCanvas');
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update(canvas, mouse) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x > canvas.width || this.x < 0) this.vx = -this.vx;
        if (this.y > canvas.height || this.y < 0) this.vy = -this.vy;

        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        this.closeToMouse = distance < mouse.radius; // update status

        this.draw();
    }
}