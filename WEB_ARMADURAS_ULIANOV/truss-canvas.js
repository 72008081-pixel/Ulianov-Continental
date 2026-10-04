/**
 * truss-canvas.js
 * Visualizador Interactivo en Canvas 2D en Tiempo Real para Armaduras
 * Cátedra: Ing. Ulianov Cuba Valencia - Análisis Estructural II
 * Grafica en vivo coordenadas, direcciones de barras con flechas de inicio a fin,
 * apoyos estructurales, cargas aplicadas, deformaciones y mapa de esfuerzos.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TrussCanvas = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    class TrussCanvasRenderer {
        constructor(canvasElement, options = {}) {
            this.canvas = canvasElement;
            this.ctx = canvasElement.getContext('2d');
            this.options = Object.assign({
                showGrid: true,
                showNodeLabels: true,
                showBarLabels: true,
                showArrows: true,
                showLoads: true,
                showReactions: true,
                showDeformed: false,
                colorByForce: true,
                deformScale: 100, // Factor de escala para deformada
                paddingPercent: 0.20
            }, options);

            // Estado de vista (Transformación mundo -> pantalla)
            this.view = {
                scale: 1,
                offsetX: 0,
                offsetY: 0,
                isDragging: false,
                dragStartX: 0,
                dragStartY: 0
            };

            // Datos actuales
            this.nodes = [];
            this.bars = [];
            this.solution = null;

            // Enlazar eventos de interacción
            this._initEvents();
            this.resize();
        }

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.resetTransform ? this.ctx.resetTransform() : this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);
            this.displayWidth = rect.width;
            this.displayHeight = rect.height;
            this.render();
        }

        _initEvents() {
            const c = this.canvas;

            c.addEventListener('mousedown', (e) => {
                this.view.isDragging = true;
                this.view.dragStartX = e.clientX - this.view.offsetX;
                this.view.dragStartY = e.clientY - this.view.offsetY;
                c.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (this.view.isDragging) {
                    this.view.offsetX = e.clientX - this.view.dragStartX;
                    this.view.offsetY = e.clientY - this.view.dragStartY;
                    this.render();
                }
            });

            window.addEventListener('mouseup', () => {
                if (this.view.isDragging) {
                    this.view.isDragging = false;
                    c.style.cursor = 'crosshair';
                }
            });

            c.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
                const rect = c.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Zoom centrado en el puntero del mouse
                this.view.offsetX = mouseX - (mouseX - this.view.offsetX) * zoomFactor;
                this.view.offsetY = mouseY - (mouseY - this.view.offsetY) * zoomFactor;
                this.view.scale *= zoomFactor;

                this.render();
            }, { passive: false });

            // Soporte para gestos táctiles en pantallas táctiles y móviles
            let initialTouchDist = 0;
            c.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.view.isDragging = true;
                    this.view.dragStartX = e.touches[0].clientX - this.view.offsetX;
                    this.view.dragStartY = e.touches[0].clientY - this.view.offsetY;
                } else if (e.touches.length === 2) {
                    initialTouchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                }
            });

            c.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (e.touches.length === 1 && this.view.isDragging) {
                    this.view.offsetX = e.touches[0].clientX - this.view.dragStartX;
                    this.view.offsetY = e.touches[0].clientY - this.view.dragStartY;
                    this.render();
                } else if (e.touches.length === 2 && initialTouchDist > 0) {
                    const currentDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const zoomFactor = currentDist / initialTouchDist;
                    initialTouchDist = currentDist;
                    this.view.scale *= zoomFactor;
                    this.render();
                }
            }, { passive: false });

            c.addEventListener('touchend', () => {
                this.view.isDragging = false;
                initialTouchDist = 0;
            });
        }

        setData(nodes, bars, solution = null) {
            this.nodes = nodes || [];
            this.bars = bars || [];
            this.solution = solution;
            this.render();
        }

        fitView() {
            const validNodes = this.nodes.filter(n => n.x !== null && n.x !== "" && n.y !== null && n.y !== "");
            if (validNodes.length === 0) {
                this.view.scale = 1;
                this.view.offsetX = this.displayWidth / 2;
                this.view.offsetY = this.displayHeight / 2;
                this.render();
                return;
            }

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const n of validNodes) {
                const x = parseFloat(n.x);
                const y = parseFloat(n.y);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }

            // Margen si todos los nodos están alineados o es un solo nodo
            const spanX = Math.max(maxX - minX, 100);
            const spanY = Math.max(maxY - minY, 100);

            const padW = this.displayWidth * (1 - this.options.paddingPercent * 2);
            const padH = this.displayHeight * (1 - this.options.paddingPercent * 2);

            const scaleX = padW / spanX;
            const scaleY = padH / spanY;
            const targetScale = Math.min(scaleX, scaleY);

            this.view.scale = targetScale;

            const midX = (minX + maxX) / 2;
            const midY = (minY + maxY) / 2;

            // En canvas Y crece hacia abajo, en coordenadas estructurales Y crece hacia arriba
            this.view.offsetX = this.displayWidth / 2 - midX * targetScale;
            this.view.offsetY = this.displayHeight / 2 + midY * targetScale;

            this.render();
        }

        worldToScreen(x, y) {
            return {
                x: this.view.offsetX + x * this.view.scale,
                y: this.view.offsetY - y * this.view.scale // Inversión de eje Y
            };
        }

        screenToWorld(sx, sy) {
            return {
                x: (sx - this.view.offsetX) / this.view.scale,
                y: -(sy - this.view.offsetY) / this.view.scale
            };
        }

        render() {
            const ctx = this.ctx;
            const w = this.displayWidth || this.canvas.width;
            const h = this.displayHeight || this.canvas.height;

            ctx.clearRect(0, 0, w, h);

            // 1. Dibujar Cuadrícula y Ejes
            if (this.options.showGrid) {
                this._drawGrid(ctx, w, h);
            }

            const validNodesMap = new Map();
            for (const n of this.nodes) {
                if (n && n.id && n.x !== null && n.x !== "" && n.y !== null && n.y !== "") {
                    validNodesMap.set(parseInt(n.id), {
                        id: parseInt(n.id),
                        x: parseFloat(n.x),
                        y: parseFloat(n.y),
                        support: n.support || 'Libre',
                        px: parseFloat(n.px) || 0,
                        py: parseFloat(n.py) || 0
                    });
                }
            }

            // Si hay deformada activa, calcular posiciones desplazadas
            const deformedMap = new Map();
            if (this.options.showDeformed && this.solution && this.solution.success) {
                const defScale = this.options.deformScale || 100;
                for (const [id, nd] of validNodesMap.entries()) {
                    const dofX = (id - 1) * 2;
                    const dofY = (id - 1) * 2 + 1;
                    const uX = (this.solution.totalDisplacements[dofX] || 0) * defScale;
                    const uY = (this.solution.totalDisplacements[dofY] || 0) * defScale;
                    deformedMap.set(id, {
                        x: nd.x + uX,
                        y: nd.y + uY
                    });
                }
            }

            // 2. Dibujar estructura indeformada fantasma (si la deformada está activa)
            if (this.options.showDeformed && deformedMap.size > 0) {
                this._drawGhostTruss(ctx, validNodesMap);
            }

            // 3. Dibujar Barras
            this._drawBars(ctx, validNodesMap, deformedMap);

            // 4. Dibujar Apoyos
            this._drawSupports(ctx, validNodesMap);

            // 5. Dibujar Reacciones (si se resolvieron)
            if (this.options.showReactions && this.solution && this.solution.reactions) {
                this._drawReactions(ctx, validNodesMap);
            }

            // 6. Dibujar Cargas Nodales Aplicadas
            if (this.options.showLoads) {
                this._drawAppliedLoads(ctx, validNodesMap);
            }

            // 7. Dibujar Nodos
            this._drawNodes(ctx, validNodesMap, deformedMap);

            // 8. Dibujar HUD / Leyenda en vivo
            this._drawHUD(ctx, w, h, validNodesMap);
        }

        _drawGrid(ctx, w, h) {
            ctx.save();
            ctx.fillStyle = '#0F172A'; // Fondo oscuro pizarra profundo
            ctx.fillRect(0, 0, w, h);

            // Calcular paso de cuadrícula según escala
            const baseStepWorld = 100; // cm
            let stepWorld = baseStepWorld;
            while (stepWorld * this.view.scale < 35) stepWorld *= 2;
            while (stepWorld * this.view.scale > 140) stepWorld /= 2;

            const topLeft = this.screenToWorld(0, 0);
            const bottomRight = this.screenToWorld(w, h);

            const startX = Math.floor(topLeft.x / stepWorld) * stepWorld;
            const endX = Math.ceil(bottomRight.x / stepWorld) * stepWorld;
            const startY = Math.floor(bottomRight.y / stepWorld) * stepWorld;
            const endY = Math.ceil(topLeft.y / stepWorld) * stepWorld;

            // Líneas de cuadrícula secundarias
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#1E293B';
            ctx.beginPath();
            for (let x = startX; x <= endX; x += stepWorld) {
                const s = this.worldToScreen(x, 0);
                ctx.moveTo(s.x, 0);
                ctx.lineTo(s.x, h);
            }
            for (let y = startY; y <= endY; y += stepWorld) {
                const s = this.worldToScreen(0, y);
                ctx.moveTo(0, s.y);
                ctx.lineTo(w, s.y);
            }
            ctx.stroke();

            // Ejes Principales X = 0 e Y = 0
            const originScreen = this.worldToScreen(0, 0);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            // Eje Y
            ctx.moveTo(originScreen.x, 0);
            ctx.lineTo(originScreen.x, h);
            // Eje X
            ctx.moveTo(0, originScreen.y);
            ctx.lineTo(w, originScreen.y);
            ctx.stroke();

            // Ticks y Etiquetas de Coordenadas
            ctx.font = '10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#64748B';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            for (let x = startX; x <= endX; x += stepWorld) {
                if (Math.abs(x) > 1e-4) {
                    const s = this.worldToScreen(x, 0);
                    if (s.x >= 20 && s.x <= w - 20) {
                        ctx.fillText(`${x} cm`, s.x, Math.min(Math.max(originScreen.y + 4, 10), h - 20));
                    }
                }
            }

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let y = startY; y <= endY; y += stepWorld) {
                if (Math.abs(y) > 1e-4) {
                    const s = this.worldToScreen(0, y);
                    if (s.y >= 20 && s.y <= h - 20) {
                        ctx.fillText(`${y} cm`, Math.min(Math.max(originScreen.x - 6, 45), w - 10), s.y);
                    }
                }
            }

            ctx.restore();
        }

        _drawGhostTruss(ctx, validNodesMap) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;

            for (const b of this.bars) {
                if (b && b.start && b.end && validNodesMap.has(parseInt(b.start)) && validNodesMap.has(parseInt(b.end))) {
                    const sN = validNodesMap.get(parseInt(b.start));
                    const eN = validNodesMap.get(parseInt(b.end));
                    const p1 = this.worldToScreen(sN.x, sN.y);
                    const p2 = this.worldToScreen(eN.x, eN.y);

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        _drawBars(ctx, validNodesMap, deformedMap) {
            const hasDeformed = this.options.showDeformed && deformedMap.size > 0;
            const BAR_COLORS = [
                { border: "#38BDF8", text: "#0284C7" }, // Azul Cielo
                { border: "#4ADE80", text: "#16A34A" }, // Menta Suave
                { border: "#F87171", text: "#DC2626" }, // Rosa Coral
                { border: "#FBBF24", text: "#D97706" }, // Melocotón
                { border: "#C084FC", text: "#9333EA" }, // Lavanda
                { border: "#2DD4BF", text: "#0D9488" }, // Turquesa
                { border: "#FACC15", text: "#CA8A04" }, // Mantequilla
                { border: "#A78BFA", text: "#7C3AED" }  // Lila Pastel
            ];

            for (let i = 0; i < this.bars.length; i++) {
                const b = this.bars[i];
                if (!b || !b.start || !b.end) continue;

                const startId = parseInt(b.start);
                const endId = parseInt(b.end);
                if (!validNodesMap.has(startId) || !validNodesMap.has(endId)) continue;

                const sNode = validNodesMap.get(startId);
                const eNode = validNodesMap.get(endId);

                const posStart = hasDeformed ? deformedMap.get(startId) : { x: sNode.x, y: sNode.y };
                const posEnd = hasDeformed ? deformedMap.get(endId) : { x: eNode.x, y: eNode.y };

                const p1 = this.worldToScreen(posStart.x, posStart.y);
                const p2 = this.worldToScreen(posEnd.x, posEnd.y);

                const barNum = b.id || (i + 1);
                const defaultColor = BAR_COLORS[(barNum - 1) % BAR_COLORS.length];

                // Determinar color según estado de fuerzas si la solución está disponible
                let strokeColor = defaultColor.border;
                let lineWidth = 3.5;
                let forceText = "";
                let isTension = false;
                let isCompression = false;

                if (this.options.colorByForce && this.solution && this.solution.memberForces) {
                    const mForce = this.solution.memberForces.find(f => f.barId === barNum);
                    if (mForce) {
                        forceText = `${mForce.axialForce >= 0 ? '+' : ''}${mForce.axialForce.toFixed(1)} Kgf`;
                        if (mForce.axialForce > 0.01) {
                            strokeColor = "#06B6D4"; // Cian brillante para tracción
                            isTension = true;
                            lineWidth = 4.0;
                        } else if (mForce.axialForce < -0.01) {
                            strokeColor = "#EF4444"; // Rojo brillante para compresión
                            isCompression = true;
                            lineWidth = 4.0;
                        } else {
                            strokeColor = "#94A3B8"; // Gris neutro para fuerza nula
                            lineWidth = 2.5;
                        }
                    }
                }

                // Dibujar línea de barra
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Flecha direccional en el centro de la barra (Inicio -> Fin)
                if (this.options.showArrows) {
                    this._drawBarArrow(ctx, p1, p2, strokeColor);
                }

                // Etiqueta de la barra (#Barra y Longitud o Fuerza)
                if (this.options.showBarLabels) {
                    this._drawBarBadge(ctx, p1, p2, barNum, strokeColor, forceText);
                }

                ctx.restore();
            }
        }

        _drawBarArrow(ctx, p1, p2, color) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len < 25) return;

            // Punto medio ligeramente desplazado hacia el fin (60% del camino)
            const mx = p1.x + dx * 0.58;
            const my = p1.y + dy * 0.58;

            const angle = Math.atan2(dy, dx);
            const arrowSize = 8;

            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(
                mx - arrowSize * Math.cos(angle - Math.PI / 6),
                my - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                mx - (arrowSize * 0.6) * Math.cos(angle),
                my - (arrowSize * 0.6) * Math.sin(angle)
            );
            ctx.lineTo(
                mx - arrowSize * Math.cos(angle + Math.PI / 6),
                my - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        _drawBarBadge(ctx, p1, p2, barNum, color, forceText) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            // Desplazar perpendicularmente la etiqueta para no tapar la flecha
            const perpX = -dy / (Math.hypot(dx, dy) || 1);
            const perpY = dx / (Math.hypot(dx, dy) || 1);
            const offsetDist = 16;

            const badgeX = midX + perpX * offsetDist;
            const badgeY = midY + perpY * offsetDist;

            const badgeLabel = forceText ? `B${barNum} (${forceText})` : `Barra ${barNum}`;

            ctx.save();
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            const metrics = ctx.measureText(badgeLabel);
            const padX = 6;
            const padY = 3;
            const bw = metrics.width + padX * 2;
            const bh = 18;

            // Fondo del badge con borde
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            this._roundRect(ctx, badgeX - bw / 2, badgeY - bh / 2, bw, bh, 4, true, true);

            // Texto del badge
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeLabel, badgeX, badgeY + 1);
            ctx.restore();
        }

        _drawSupports(ctx, validNodesMap) {
            for (const nd of validNodesMap.values()) {
                if (nd.support === 'Libre' || !nd.support) continue;

                const p = this.worldToScreen(nd.x, nd.y);
                const supp = nd.support.toUpperCase();

                ctx.save();
                if (supp.includes('FIJO')) {
                    this._drawPinnedSupport(ctx, p.x, p.y);
                } else if (supp.includes('MOVIL_Y') || supp.includes('MÓVIL Y') || supp.includes('RODILLO Y')) {
                    // Apoyo en Y (Restringe vertical, rueda horizontal)
                    this._drawRollerSupportY(ctx, p.x, p.y);
                } else if (supp.includes('MOVIL_X') || supp.includes('MÓVIL X') || supp.includes('RODILLO X')) {
                    // Apoyo en X (Restringe horizontal, rueda vertical)
                    this._drawRollerSupportX(ctx, p.x, p.y);
                }
                ctx.restore();
            }
        }

        _drawPinnedSupport(ctx, x, y) {
            const h = 20;
            const w = 24;

            ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 2;

            // Triángulo del pin
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - w / 2, y + h);
            ctx.lineTo(x + w / 2, y + h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Línea de base de suelo
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - w / 2 - 6, y + h);
            ctx.lineTo(x + w / 2 + 6, y + h);
            ctx.stroke();

            // Rayado de suelo empotrado
            ctx.lineWidth = 1.2;
            for (let i = -w / 2 - 4; i <= w / 2 + 4; i += 6) {
                ctx.beginPath();
                ctx.moveTo(x + i, y + h);
                ctx.lineTo(x + i - 4, y + h + 6);
                ctx.stroke();
            }
        }

        _drawRollerSupportY(ctx, x, y) {
            const h = 14;
            const w = 22;
            const r = 3.5;

            ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
            ctx.strokeStyle = '#FBBF24'; // Amarillo ámbar
            ctx.lineWidth = 2;

            // Triángulo superior
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - w / 2, y + h);
            ctx.lineTo(x + w / 2, y + h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Rodillos circulares debajo del triángulo
            ctx.fillStyle = '#FBBF24';
            const rollerY = y + h + r;
            for (const rx of [x - w / 3, x, x + w / 3]) {
                ctx.beginPath();
                ctx.arc(rx, rollerY, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Placa de suelo horizontal
            const groundY = rollerY + r + 1;
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - w / 2 - 6, groundY);
            ctx.lineTo(x + w / 2 + 6, groundY);
            ctx.stroke();
        }

        _drawRollerSupportX(ctx, x, y) {
            const h = 22;
            const w = 14;
            const r = 3.5;

            ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 2;

            // Triángulo apuntando hacia la izquierda al nodo
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - w, y - h / 2);
            ctx.lineTo(x - w, y + h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Rodillos circulares verticales
            ctx.fillStyle = '#FBBF24';
            const rollerX = x - w - r;
            for (const ry of [y - h / 3, y, y + h / 3]) {
                ctx.beginPath();
                ctx.arc(rollerX, ry, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Placa de pared vertical
            const groundX = rollerX - r - 1;
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(groundX, y - h / 2 - 6);
            ctx.lineTo(groundX, y + h / 2 + 6);
            ctx.stroke();
        }

        _drawAppliedLoads(ctx, validNodesMap) {
            for (const nd of validNodesMap.values()) {
                const px = nd.px;
                const py = nd.py;
                if (Math.abs(px) < 1e-4 && Math.abs(py) < 1e-4) continue;

                const p = this.worldToScreen(nd.x, nd.y);
                const arrowLen = 50;

                // Carga en X
                if (Math.abs(px) > 1e-4) {
                    const dir = px > 0 ? 1 : -1;
                    const fromX = p.x - dir * arrowLen;
                    const toX = p.x;
                    this._drawVectorArrow(ctx, fromX, p.y, toX, p.y, '#F97316', `Px = ${px} Kgf`);
                }

                // Carga en Y
                if (Math.abs(py) > 1e-4) {
                    // py > 0 va hacia arriba (en pantalla Y disminuye)
                    const dir = py > 0 ? -1 : 1;
                    const fromY = p.y - dir * arrowLen;
                    const toY = p.y;
                    this._drawVectorArrow(ctx, p.x, fromY, p.x, toY, '#F97316', `Py = ${py} Kgf`);
                }
            }
        }

        _drawReactions(ctx, validNodesMap) {
            for (const r of this.solution.reactions) {
                if (Math.abs(r.value) < 1e-3) continue;
                if (!validNodesMap.has(r.nodeId)) continue;

                const nd = validNodesMap.get(r.nodeId);
                const p = this.worldToScreen(nd.x, nd.y);
                const arrowLen = 45;

                ctx.save();
                if (r.direction === 'X') {
                    const dir = r.value > 0 ? 1 : -1;
                    const fromX = p.x;
                    const toX = p.x + dir * arrowLen;
                    this._drawVectorArrow(ctx, fromX, p.y, toX, p.y, '#10B981', `${r.label} = ${r.value.toFixed(1)} Kgf`, true);
                } else if (r.direction === 'Y') {
                    // Valor positivo empuja hacia arriba
                    const dir = r.value > 0 ? -1 : 1;
                    const fromY = p.y;
                    const toY = p.y + dir * arrowLen;
                    this._drawVectorArrow(ctx, p.x, fromY, p.x, toY, '#10B981', `${r.label} = ${r.value.toFixed(1)} Kgf`, true);
                }
                ctx.restore();
            }
        }

        _drawVectorArrow(ctx, x1, y1, x2, y2, color, label, isReaction = false) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2.5;

            // Línea del vector
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Cabeza de la flecha en (x2, y2)
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLen = 10;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();

            // Etiqueta del vector
            ctx.font = 'bold 10px "Segoe UI", sans-serif';
            ctx.fillStyle = color;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            if (Math.abs(y2 - y1) < 5) {
                // Vector horizontal
                ctx.textAlign = 'center';
                ctx.textBaseline = isReaction ? 'top' : 'bottom';
                ctx.fillText(label, midX, midY + (isReaction ? 6 : -6));
            } else {
                // Vector vertical
                ctx.textAlign = isReaction ? 'left' : 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, midX + (isReaction ? 6 : -6), midY);
            }

            ctx.restore();
        }

        _drawNodes(ctx, validNodesMap, deformedMap) {
            const hasDeformed = this.options.showDeformed && deformedMap.size > 0;

            for (const nd of validNodesMap.values()) {
                const pos = hasDeformed ? deformedMap.get(nd.id) : { x: nd.x, y: nd.y };
                const p = this.worldToScreen(pos.x, pos.y);

                ctx.save();
                // Halo de brillo alrededor del nodo
                ctx.shadowColor = '#38BDF8';
                ctx.shadowBlur = 10;

                // Círculo exterior
                ctx.beginPath();
                ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
                ctx.fillStyle = '#0F172A';
                ctx.fill();
                ctx.strokeStyle = '#38BDF8';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.shadowBlur = 0; // Desactivar sombra para el texto

                // Texto del ID del nodo
                ctx.font = 'bold 11px "Segoe UI", sans-serif';
                ctx.fillStyle = '#F8FAFC';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${nd.id}`, p.x, p.y + 0.5);

                // Etiqueta de coordenadas (X, Y)
                if (this.options.showNodeLabels) {
                    const coordTxt = `N${nd.id} (${nd.x}, ${nd.y})`;
                    ctx.font = '9px "Segoe UI", sans-serif';
                    ctx.fillStyle = '#94A3B8';
                    ctx.fillText(coordTxt, p.x, p.y - 18);
                }

                ctx.restore();
            }
        }

        _drawHUD(ctx, w, h, validNodesMap) {
            ctx.save();
            // Información en esquina superior izquierda
            const hudX = 14;
            const hudY = 14;
            const activeNodesCount = validNodesMap.size;
            const activeBarsCount = this.bars.filter(b => b.start && b.end).length;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            this._roundRect(ctx, hudX, hudY, 210, 80, 8, true, true);

            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.fillStyle = '#38BDF8';
            ctx.textAlign = 'left';
            ctx.fillText("GEOMETRÍA EN VIVO (2D)", hudX + 12, hudY + 20);

            ctx.font = '10px "Segoe UI", sans-serif';
            ctx.fillStyle = '#CBD5E1';
            ctx.fillText(`• Nodos Activos: ${activeNodesCount} / 6`, hudX + 12, hudY + 38);
            ctx.fillText(`• Barras Conectadas: ${activeBarsCount} / 8`, hudX + 12, hudY + 54);

            const statusTxt = this.solution && this.solution.success
                ? `• Estado: ${this.solution.structuralType}`
                : "• Estado: Editando geometría...";
            ctx.fillStyle = this.solution && this.solution.success ? '#34D399' : '#FBBF24';
            ctx.fillText(statusTxt, hudX + 12, hudY + 70);

            // Leyenda de Esfuerzos en esquina inferior derecha si está activada
            if (this.options.colorByForce && this.solution && this.solution.success) {
                const legW = 190;
                const legH = 75;
                const legX = w - legW - 14;
                const legY = h - legH - 14;

                ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                ctx.strokeStyle = '#334155';
                this._roundRect(ctx, legX, legY, legW, legH, 8, true, true);

                ctx.font = 'bold 10px "Segoe UI", sans-serif';
                ctx.fillStyle = '#F8FAFC';
                ctx.fillText("MAPA DE ESFUERZOS AXIALES", legX + 10, legY + 18);

                // Tracción
                ctx.fillStyle = '#06B6D4';
                ctx.fillRect(legX + 10, legY + 28, 14, 6);
                ctx.font = '9px "Segoe UI", sans-serif';
                ctx.fillStyle = '#E2E8F0';
                ctx.fillText("Tracción (+) [Azul / Cian]", legX + 32, legY + 34);

                // Compresión
                ctx.fillStyle = '#EF4444';
                ctx.fillRect(legX + 10, legY + 44, 14, 6);
                ctx.fillText("Compresión (-) [Rojo Coral]", legX + 32, legY + 50);

                // Fuerza Nula
                ctx.fillStyle = '#94A3B8';
                ctx.fillRect(legX + 10, legY + 60, 14, 6);
                ctx.fillText("Fuerza Nula (0) [Gris Neutro]", legX + 32, legY + 66);
            }

            ctx.restore();
        }

        _roundRect(ctx, x, y, width, height, radius, fill, stroke) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            if (fill) ctx.fill();
            if (stroke) ctx.stroke();
        }

        exportImage() {
            return this.canvas.toDataURL('image/png');
        }
    }

    return TrussCanvasRenderer;
}));
