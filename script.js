class Dot {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
    }
}

class Line {
    constructor(start, end, color, points) {
        this.start = start;
        this.end = end;
        this.color = color;
        this.points = points;
    }

    static doLinesIntersect(line1, line2) {
        const { start: a, end: b } = line1;
        const { start: c, end: d } = line2;

        const cross = (p, q, r) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);

        const o1 = cross(a, b, c);
        const o2 = cross(a, b, d);
        const o3 = cross(c, d, a);
        const o4 = cross(c, d, b);

        if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
            const onSegment = (p, q, r) => {
                return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
                    q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
            };
            return onSegment(a, c, b) || onSegment(a, d, b) || onSegment(c, a, d) || onSegment(c, b, d);
        }

        return (o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0);
    }

    static isOnSegment(p, q, r) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }
}

class Game {
    constructor(canvasId, dotRadius, dotColors, lineWidth) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.dotRadius = dotRadius;
        this.dotColors = dotColors;
        this.lineWidth = lineWidth;
        this.dots = [];
        this.lines = [];
        this.selectedDot = null;
        this.selectedDotColor = null;
        this.isDrawing = false;
        this.linePoints = [];
        this.currentLinePoints = [];

        this.initCanvas();
        this.initEventListeners();
        this.generateDots();
    }

    initCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initEventListeners() {
        this.canvas.addEventListener('mousedown', e => this.handlePointerDown({ x: e.clientX - this.canvas.offsetLeft, y: e.clientY - this.canvas.offsetTop }));
        this.canvas.addEventListener('mousemove', e => this.handlePointerMove({ x: e.clientX - this.canvas.offsetLeft, y: e.clientY - this.canvas.offsetTop }));
        this.canvas.addEventListener('mouseup', () => this.handlePointerUp());
        this.canvas.addEventListener('mouseleave', () => this.handlePointerUp());

        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            this.handlePointerDown({ x: e.touches[0].clientX - this.canvas.offsetLeft, y: e.touches[0].clientY - this.canvas.offsetTop });
        });
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            this.handlePointerMove({ x: e.touches[0].clientX - this.canvas.offsetLeft, y: e.touches[0].clientY - this.canvas.offsetTop });
        });
        this.canvas.addEventListener('touchend', () => this.handlePointerUp());
    }

    handlePointerDown(event) {
        const x = event.x;
        const y = event.y;
        const clickedDot = this.dots.find(dot => this.isPointInsideDot({ x, y }, dot));

        if (clickedDot) {
            this.selectedDot = clickedDot;
            this.selectedDotColor = clickedDot.color;
            this.isDrawing = true;
            this.linePoints = [];
            this.currentLinePoints = [];
            this.linePoints.push({ x, y });
            this.highlightSameColorDots(this.selectedDot.color);

            this.removeConnectedLine(clickedDot);
        }
    }

    removeConnectedLine(dot) {
        const connectedLineIndex = this.lines.findIndex(line =>
            (line.start === dot || line.end === dot)
        );
        if (connectedLineIndex !== -1) {
            this.lines.splice(connectedLineIndex, 1);
        }
    }

    handlePointerMove(event) {
        if (this.isDrawing) {
            const x = event.x;
            const y = event.y;
            this.currentLinePoints.push({ x, y });
            this.removeIntersectingLine();
            this.checkForColorTouch(x, y);
            this.drawFreeformLines();
        }
    }

    handlePointerUp() {
        if (this.isDrawing) {
            this.isDrawing = false;
            if (this.selectedDot && this.currentLinePoints.length > 1) {
                const startDot = this.selectedDot;
                const endDot = this.dots.find(dot => this.isPointInsideDot(this.currentLinePoints[this.currentLinePoints.length - 1], dot));

                if (endDot && this.areSameColor(startDot, endDot) && startDot !== endDot) {
                    const existingLineIndex = this.lines.findIndex(line =>
                        (line.start === startDot && line.end === endDot) ||
                        (line.start === endDot && line.end === startDot)
                    );
                    if (existingLineIndex !== -1) {
                        this.lines.splice(existingLineIndex, 1);
                    }
                    this.addLine(startDot, endDot, this.selectedDotColor, this.currentLinePoints);
                }
            }

            this.currentLinePoints = [];
            this.clearCanvas();
            this.drawDots();
            this.drawFreeformLines();
            if (this.selectedDot) {
                this.highlightSameColorDots(this.selectedDot.color);
            }
        }
    }

    removeIntersectingLine() {
        if (this.currentLinePoints.length < 2) return;

        const newLine = {
            start: this.currentLinePoints[this.currentLinePoints.length - 2],
            end: this.currentLinePoints[this.currentLinePoints.length - 1]
        };

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (Line.doLinesIntersect(newLine, line)) {
                this.lines.splice(i, 1);
                this.clearCanvas();
                this.drawDots();
                this.drawFreeformLines();
                return;
            }
        }
    }

    checkForColorTouch(x, y) {
        for (const dot of this.dots) {
            if (this.isPointInsideDot({ x, y }, dot) && dot.color !== this.selectedDotColor) {
                this.stopDrawingLine();
                return;
            }
        }
    }

    drawDots() {
        this.clearCanvas();
        this.dots.forEach(dot => this.drawDot(dot.x, dot.y, dot.color));
    }

    drawFreeformLines() {
        this.drawDots();
        this.lines.forEach(line => this.drawLine(line.start, line.end, line.color, line.points));
        if (this.isDrawing && this.currentLinePoints.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentLinePoints[0].x, this.currentLinePoints[0].y);
            for (let i = 1; i < this.currentLinePoints.length; i++) {
                this.ctx.lineTo(this.currentLinePoints[i].x, this.currentLinePoints[i].y);
            }
            this.ctx.strokeStyle = this.selectedDotColor;
            this.ctx.lineWidth = this.lineWidth;
            this.ctx.stroke();
        }
    }

    drawDot(x, y, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.dotRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawLine(start, end, color, points) {
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.stroke();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    generateDots() {
        const colors = this.dotColors;
        const numColors = colors.length;
        const dotCount = Math.floor(this.canvas.width * this.canvas.height / 25000);

        for (let i = 0; i < dotCount; i++) {
            const x = Math.random() * (this.canvas.width - 2 * this.dotRadius) + this.dotRadius;
            const y = Math.random() * (this.canvas.height - 2 * this.dotRadius) + this.dotRadius;
            const color = colors[Math.floor(Math.random() * numColors)];
            this.dots.push(new Dot(x, y, color));
        }

        this.drawDots();
    }

    highlightSameColorDots(color) {
        this.dots.forEach(dot => {
            if (dot.color === color) {
                this.drawDot(dot.x, dot.y, dot.color);
            }
        });
    }

    isPointInsideDot(point, dot) {
        const distance = Math.sqrt((point.x - dot.x) ** 2 + (point.y - dot.y) ** 2);
        return distance <= this.dotRadius;
    }

    areSameColor(dot1, dot2) {
        return dot1.color === dot2.color;
    }

    addLine(start, end, color, points) {
        this.lines.push(new Line(start, end, color, points));
    }

    stopDrawingLine() {
        this.isDrawing = false;
        this.linePoints = [];
        this.currentLinePoints = [];
        this.clearCanvas();
        this.drawDots();
        this.drawFreeformLines();
    }
}

const game = new Game('gameCanvas', 10, ['red', 'blue', 'green', 'yellow'], 5);
