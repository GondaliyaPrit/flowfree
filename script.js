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

        const orientation = (p, q, r) => {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (val === 0) return 0;
            return (val > 0) ? 1 : 2;
        };

        const o1 = orientation(a, b, c);
        const o2 = orientation(a, b, d);
        const o3 = orientation(c, d, a);
        const o4 = orientation(c, d, b);

        if (o1 !== o2 && o3 !== o4) return true;

        if (o1 === 0 && this.isOnSegment(a, c, b)) return true;
        if (o2 === 0 && this.isOnSegment(a, d, b)) return true;
        if (o3 === 0 && this.isOnSegment(c, a, d)) return true;
        if (o4 === 0 && this.isOnSegment(c, b, d)) return true;

        return false;
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
        // Mouse event listeners
        this.canvas.addEventListener('mousedown', e => this.handlePointerDown({ x: e.clientX - this.canvas.offsetLeft, y: e.clientY - this.canvas.offsetTop }));
        this.canvas.addEventListener('mousemove', e => this.handlePointerMove({ x: e.clientX - this.canvas.offsetLeft, y: e.clientY - this.canvas.offsetTop }));
        this.canvas.addEventListener('mouseup', () => this.handlePointerUp());
        this.canvas.addEventListener('mouseleave', () => this.handlePointerUp());

        // Touch event listeners
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault(); // Prevent scrolling on touch devices
            this.handlePointerDown({ x: e.touches[0].clientX - this.canvas.offsetLeft, y: e.touches[0].clientY - this.canvas.offsetTop })
        });
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault(); // Prevent scrolling on touch devices
            this.handlePointerMove({ x: e.touches[0].clientX - this.canvas.offsetLeft, y: e.touches[0].clientY - this.canvas.offsetTop })
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

            // Check if the selected dot has a connected line, and remove it
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
            this.highlightSameColorDots(this.selectedDot.color);
        }
    }

    removeIntersectingLine() {
        console.log("removeIntersectingLine");
        console.log("currentline length"+this.currentLinePoints.length);
        if (this.currentLinePoints.length < 2) return;

        const newLine = {
            start: this.currentLinePoints[0], 
            end: this.currentLinePoints[this.currentLinePoints.length - 1]
        };

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (Line.doLinesIntersect(newLine, line)) {
                console.log("removeIntersectingLine if Block");
                this.lines.splice(i, 1); // Remove the existing line if it intersects
                // this.currentLinePoints = []; // Clear the current line points
                this.clearCanvas(); // Clear the canvas to remove the drawn line
                this.drawDots(); // Redraw dots after clearing the canvas
                //    this.stopDrawingLine();

                return;
            }
        }
    }

    checkForColorTouch(x, y) {
        const lastPoint = this.currentLinePoints[this.currentLinePoints.length - 2];
        const startPoint = this.linePoints[0];

        for (const dot of this.dots) {
            if (dot.color !== this.selectedDotColor && this.isPointInsideDot({ x, y }, dot)) {
                // Remove the current line
                //this.lines.pop();
                this.currentLinePoints = []; // Clear the current line points
                this.stopDrawingLine();
                // Redraw the dots and lines
                this.drawDots();
                // this.drawFreeformLines();
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

    addDot(x, y, color) {
        this.dots.push(new Dot(x, y, color));
    }

    addLine(start, end, color, points) {
        const existingLineIndex = this.lines.findIndex(line =>
            (line.start === start && line.end === end) ||
            (line.start === end && line.end === start)
        );

        if (existingLineIndex !== -1) {
            this.lines.splice(existingLineIndex, 1); // Remove the existing line
        }

        this.lines.push(new Line(start, end, color, points)); // Add the new line
    }

    areSameColor(dot1, dot2) {
        return dot1.color === dot2.color;
    }

    generateRandomCoordinates() {
        const minX = this.canvas.width * 0.1; // 10% of canvas width from left edge
        const minY = this.canvas.height * 0.1; // 10% of canvas height from top edge
        const maxX = this.canvas.width * 0.9; // 10% of canvas width from right edge
        const maxY = this.canvas.height * 0.9; // 10% of canvas height from bottom edge

        const x = Math.random() * (maxX - minX) + minX;
        const y = Math.random() * (maxY - minY) + minY;

        return { x, y };
    }

    highlightSameColorDots(color) {
        this.dots.forEach(dot => {
            if (dot.color === color) {
                this.drawHighlightedDot(dot.x, dot.y, dot.color);
            }
        });
    }

    drawHighlightedDot(x, y, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.dotRadius + 2, 0, Math.PI * 2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    isPointInsideDot(point, dot) {
        const dx = point.x - dot.x;
        const dy = point.y - dot.y;
        return dx * dx + dy * dy <= this.dotRadius * this.dotRadius;
    }

    generateDots() {
    const dotsPerColor = {}; // Track the number of dots generated for each color
    const minDistance = 2 * this.dotRadius; // Minimum distance between dots

    this.dots = []; // Reset the dots array

    for (let i = 0; i < 5; i++) {
        let r, g, b;
        do {
            // Generate random RGB values
            r = Math.floor(Math.random() * 256);
            g = Math.floor(Math.random() * 256);
            b = Math.floor(Math.random() * 256);
        } while (!this.isColorFarFromOthers(r, g, b)); // Check if the generated color is visually distinct

        const color = `rgb(${r}, ${g}, ${b})`; // Generate color string
        
        dotsPerColor[color] = dotsPerColor[color] || 0;

        if (dotsPerColor[color] < 2) {
            let dot1, dot2;
            do {
                dot1 = this.generateRandomCoordinates();
            } while (this.isDotTooClose(dot1, minDistance)); // Check if the generated dot is too close to existing dots

            do {
                dot2 = this.generateRandomCoordinates();
            } while (this.isDotTooClose(dot2, minDistance) || this.areCoordinatesEqual(dot1, dot2)); // Check if the generated dot is too close to existing dots and not equal to the first dot

            this.addDot(dot1.x, dot1.y, color);
            this.addDot(dot2.x, dot2.y, color);

            dotsPerColor[color] += 2;
        }
    }

    this.drawDots();
}

isDotTooClose(newDot, minDistance) {
    // Check if the new dot is too close to any existing dot
    for (const dot of this.dots) {
        const distance = Math.sqrt((newDot.x - dot.x) ** 2 + (newDot.y - dot.y) ** 2);
        if (distance < minDistance) {
            return true; // Dot is too close
        }
    }
    return false; // Dot is not too close
}

areCoordinatesEqual(coord1, coord2) {
    // Check if the coordinates of two dots are equal
    return coord1.x === coord2.x && coord1.y === coord2.y;
}


isColorFarFromOthers(r, g, b) {
    // Minimum allowed separation between RGB components
    const minSeparation = 50;

    // Check if the generated color is far from existing dots in terms of RGB components
    for (const dot of this.dots) {
        const existingColor = dot.color.substring(4, dot.color.length - 1).split(',');
        const existingR = parseInt(existingColor[0].trim());
        const existingG = parseInt(existingColor[1].trim());
        const existingB = parseInt(existingColor[2].trim());

        const separation = Math.sqrt((r - existingR) ** 2 + (g - existingG) ** 2 + (b - existingB) ** 2);
        if (separation < minSeparation) {
            return false;
        }
    }

    return true;
}




    stopDrawingLine() {
        this.isDrawing = false;
        this.currentLinePoints = [];
        this.clearCanvas();
        this.drawDots();
        this.drawFreeformLines();
        if (this.selectedDot) {
            this.highlightSameColorDots(this.selectedDot.color);
        }
    }


}

const game = new Game('gameCanvas', 15, ['#FF0000', '#00FF00', '#0000FF'], 10);