import { fabric } from 'fabric';
import type { AnnotationTool } from '../types';

export class AnnotationCanvas {
  private canvas: fabric.Canvas;
  private currentTool: AnnotationTool = 'select';
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private activeShape: fabric.Object | null = null;
  private color = '#FF6B35';

  constructor(canvasEl: HTMLCanvasElement, screenshotDataUrl: string) {
    this.canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: false,
      selection: true,
    });

    // Set screenshot as background
    fabric.Image.fromURL(screenshotDataUrl, (img) => {
      this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas), {
        scaleX: this.canvas.width! / (img.width || 1),
        scaleY: this.canvas.height! / (img.height || 1),
      });
    });

    // Configure freehand brush
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.width = 3;
    this.canvas.freeDrawingBrush.color = this.color;

    this.bindMouseEvents();
  }

  setTool(tool: AnnotationTool) {
    this.currentTool = tool;
    this.canvas.isDrawingMode = tool === 'freehand';
    this.canvas.selection = tool === 'select';
  }

  setColor(color: string) {
    this.color = color;
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
    }
  }

  /** Build an SVG path string for a line + arrowhead pointing from (x1,y1) to (x2,y2) */
  private arrowPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const headLen = 18;
    const headAngle = Math.PI / 6; // 30°
    // Two sides of the arrowhead
    const ax1 = x2 - headLen * Math.cos(angle - headAngle);
    const ay1 = y2 - headLen * Math.sin(angle - headAngle);
    const ax2 = x2 - headLen * Math.cos(angle + headAngle);
    const ay2 = y2 - headLen * Math.sin(angle + headAngle);
    return `M ${x1} ${y1} L ${x2} ${y2} M ${ax2} ${ay2} L ${x2} ${y2} L ${ax1} ${ay1}`;
  }

  private bindMouseEvents() {
    this.canvas.on('mouse:down', (opt) => {
      if (this.currentTool === 'select' || this.currentTool === 'freehand') return;
      const pointer = this.canvas.getPointer(opt.e);
      this.isDrawing = true;
      this.startX = pointer.x;
      this.startY = pointer.y;

      if (this.currentTool === 'text') {
        const text = new fabric.IText('Type here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 18,
          fill: this.color,
          fontFamily: 'Arial',
        });
        this.canvas.add(text);
        this.canvas.setActiveObject(text);
        text.enterEditing();
        this.isDrawing = false;
        return;
      }

      if (this.currentTool === 'arrow') {
        // Start with a zero-length arrow path; updated on mouse:move
        const path = new fabric.Path(this.arrowPath(pointer.x, pointer.y, pointer.x, pointer.y), {
          stroke: this.color, strokeWidth: 3, fill: '', selectable: false,
        });
        this.canvas.add(path);
        this.activeShape = path;
      }

      if (this.currentTool === 'rectangle') {
        const rect = new fabric.Rect({
          left: pointer.x, top: pointer.y,
          width: 0, height: 0,
          stroke: this.color, strokeWidth: 3,
          fill: 'transparent', selectable: false,
        });
        this.canvas.add(rect);
        this.activeShape = rect;
      }

      if (this.currentTool === 'circle') {
        const ellipse = new fabric.Ellipse({
          left: pointer.x, top: pointer.y,
          rx: 0, ry: 0,
          stroke: this.color, strokeWidth: 3,
          fill: 'transparent', selectable: false,
        });
        this.canvas.add(ellipse);
        this.activeShape = ellipse;
      }

      if (this.currentTool === 'blur') {
        const rect = new fabric.Rect({
          left: pointer.x, top: pointer.y,
          width: 0, height: 0,
          fill: 'rgba(0,0,0,0.35)',
          stroke: 'rgba(0,0,0,0.5)', strokeWidth: 1,
          selectable: false,
        });
        this.canvas.add(rect);
        this.activeShape = rect;
      }
    });

    this.canvas.on('mouse:move', (opt) => {
      if (!this.isDrawing || !this.activeShape) return;
      const pointer = this.canvas.getPointer(opt.e);

      if (this.currentTool === 'arrow' && this.activeShape instanceof fabric.Path) {
        // Remove and recreate with updated endpoints so the arrowhead follows the cursor
        this.canvas.remove(this.activeShape);
        const path = new fabric.Path(this.arrowPath(this.startX, this.startY, pointer.x, pointer.y), {
          stroke: this.color, strokeWidth: 3, fill: '', selectable: false,
        });
        this.canvas.add(path);
        this.activeShape = path;
      }

      if ((this.currentTool === 'rectangle' || this.currentTool === 'blur') && this.activeShape instanceof fabric.Rect) {
        const w = pointer.x - this.startX;
        const h = pointer.y - this.startY;
        this.activeShape.set({
          width: Math.abs(w), height: Math.abs(h),
          left: w < 0 ? pointer.x : this.startX,
          top: h < 0 ? pointer.y : this.startY,
        });
      }

      if (this.currentTool === 'circle' && this.activeShape instanceof fabric.Ellipse) {
        const rx = Math.abs(pointer.x - this.startX) / 2;
        const ry = Math.abs(pointer.y - this.startY) / 2;
        this.activeShape.set({
          rx, ry,
          left: Math.min(pointer.x, this.startX),
          top: Math.min(pointer.y, this.startY),
        });
      }

      this.canvas.renderAll();
    });

    this.canvas.on('mouse:up', () => {
      if (this.activeShape) {
        this.activeShape.set({ selectable: true });
        this.activeShape = null;
      }
      this.isDrawing = false;
    });
  }

  getAnnotatedDataUrl(): string {
    return this.canvas.toDataURL({ format: 'png', quality: 1 });
  }

  undo() {
    const objects = this.canvas.getObjects();
    if (objects.length > 0) {
      this.canvas.remove(objects[objects.length - 1]);
    }
  }

  clear() {
    this.canvas.getObjects().forEach((obj) => this.canvas.remove(obj));
  }

  destroy() {
    this.canvas.dispose();
  }
}
