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
  private pencilBrush: fabric.PencilBrush;
  private highlighterBrush: fabric.PencilBrush;
  private redoStack: fabric.Object[] = [];
  private isRestoring = false; // guards redo()'s own canvas.add() from clearing redoStack

  constructor(canvasEl: HTMLCanvasElement, screenshotDataUrl: string) {
    this.canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: false,
      selection: true,
    });

    if (screenshotDataUrl) this.setBackgroundImage(screenshotDataUrl);

    // Two brush instances so switching tools doesn't lose the other's config.
    // Fabric's brush has no separate opacity channel, so the highlighter's
    // translucency is baked directly into its rgba color.
    this.pencilBrush = new fabric.PencilBrush(this.canvas);
    this.pencilBrush.width = 3;
    this.pencilBrush.color = this.color;

    this.highlighterBrush = new fabric.PencilBrush(this.canvas);
    this.highlighterBrush.width = 18;
    this.highlighterBrush.color = this.hexToRgba(this.color, 0.35);

    this.canvas.freeDrawingBrush = this.pencilBrush;

    this.bindMouseEvents();

    // Any genuinely new addition (draw, shape, text, image, emoji) invalidates
    // redo history — except redo() re-adding a previously undone object.
    this.canvas.on('object:added', () => {
      if (!this.isRestoring) this.redoStack = [];
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  // CONTAIN scaling: fit the full screenshot inside the canvas without
  // cropping. Any unused space shows the canvas background colour.
  private setBackgroundImage(dataUrl: string): Promise<void> {
    return new Promise((resolve) => {
      fabric.Image.fromURL(dataUrl, (img) => {
        // Scale screenshot to fill canvas width minus an 8px gutter on each side.
        // Any unused vertical space is split evenly above and below the image.
        const sidePadding = 8;
        const scale = (this.canvas.width! - sidePadding * 2) / (img.width || 1);
        const top = (this.canvas.height! - (img.height || 0) * scale) / 2;
        this.canvas.setBackgroundImage(img, () => { this.canvas.renderAll(); resolve(); }, {
          scaleX: scale,
          scaleY: scale,
          left: sidePadding,
          top,
          originX: 'left',
          originY: 'top',
        });
      });
    });
  }

  /** Swaps the background screenshot (e.g. after an "Entire page" re-capture) without discarding existing annotation objects. */
  replaceBackgroundImage(dataUrl: string): Promise<void> {
    return this.setBackgroundImage(dataUrl);
  }

  setTool(tool: AnnotationTool) {
    this.currentTool = tool;
    this.canvas.isDrawingMode = tool === 'freehand' || tool === 'highlighter';
    this.canvas.selection = tool === 'select';
    if (tool === 'highlighter') this.canvas.freeDrawingBrush = this.highlighterBrush;
    else if (tool === 'freehand') this.canvas.freeDrawingBrush = this.pencilBrush;
  }

  setColor(color: string) {
    this.color = color;
    this.pencilBrush.color = color;
    this.highlighterBrush.color = this.hexToRgba(color, 0.35);
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
      // Clicking/dragging an existing object (e.g. grabbing an inserted
      // image's resize handle) must move/scale it, not also start a new
      // shape underneath — otherwise a stray annotation gets drawn alongside
      // the resize.
      if (opt.target) return;
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
      const obj = objects[objects.length - 1];
      this.canvas.remove(obj);
      this.redoStack.push(obj);
    }
  }

  redo() {
    const obj = this.redoStack.pop();
    if (!obj) return;
    this.isRestoring = true;
    this.canvas.add(obj);
    this.isRestoring = false;
    this.canvas.renderAll();
  }

  /** Adds an uploaded image as a draggable/resizable object, centered and scaled to fit. */
  addImage(dataUrl: string): void {
    fabric.Image.fromURL(dataUrl, (img) => {
      const canvasW = this.canvas.width ?? 0;
      const canvasH = this.canvas.height ?? 0;
      const maxDim = Math.min(canvasW, canvasH) * 0.6;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      img.set({
        left: (canvasW - (img.width || 0) * scale) / 2,
        top: (canvasH - (img.height || 0) * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });
      this.canvas.add(img);
      this.canvas.setActiveObject(img);
      this.canvas.renderAll();
    });
  }

  /** Adds an emoji as a draggable/resizable text object, centered. */
  addEmoji(char: string): void {
    const fontSize = 48;
    const canvasW = this.canvas.width ?? 0;
    const canvasH = this.canvas.height ?? 0;
    const text = new fabric.IText(char, {
      left: (canvasW - fontSize) / 2,
      top: (canvasH - fontSize) / 2,
      fontSize,
      fontFamily: 'Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    });
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();
  }

  clear() {
    this.canvas.getObjects().forEach((obj) => this.canvas.remove(obj));
  }

  destroy() {
    this.canvas.dispose();
  }
}
