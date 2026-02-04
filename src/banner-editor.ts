import type { User, ProfileWidget, BannerLayout, BannerPosition, Database, TextStyle } from './types';
import { StorageKeys, STICKERS, DEFAULT_BANNER_LAYOUT, BANNER_FONTS } from './types';

interface DragState {
  active: boolean;
  elementId: string | null;
  startPointer: { x: number; y: number };
  startPosition: BannerPosition;
  element: HTMLElement | null;
}

export class BannerEditor {
  private banner!: HTMLElement;
  private canvas!: HTMLElement;
  private user: User;

  private isEditMode = false;
  private layout!: BannerLayout;
  private widgets: ProfileWidget[] = [];

  private layoutSnapshot!: BannerLayout;
  private widgetsSnapshot: ProfileWidget[] = [];

  private dragState: DragState = {
    active: false,
    elementId: null,
    startPointer: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    element: null,
  };

  private selectedElementId: string | null = null;

  // Bound event handlers for cleanup
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;

  constructor(user: User) {
    this.user = user;
    this.boundPointerMove = (e: PointerEvent) => this.onPointerMove(e);
    this.boundPointerUp = (e: PointerEvent) => this.onPointerUp(e);
  }

  // ==================== PUBLIC API ====================

  public init(): void {
    this.banner = document.getElementById('profileBanner')!;
    this.canvas = document.getElementById('bannerCanvas')!;

    if (!this.banner || !this.canvas) return;

    // Load layout
    this.layout = this.loadLayout();
    this.widgets = this.user.profileWidgets ? [...this.user.profileWidgets] : [];

    // Apply positions
    this.applyLayout();
    this.renderAllWidgets();

    // Gear button
    document.getElementById('bannerEditToggle')?.addEventListener('click', () => this.toggleEditMode());

    // Toolbar buttons
    document.getElementById('toolbarAddText')?.addEventListener('click', () => this.showPopover('bannerTextInput'));
    document.getElementById('toolbarAddSticker')?.addEventListener('click', () => this.showPopover('bannerStickerPicker'));
    document.getElementById('toolbarAddGif')?.addEventListener('click', () => this.showPopover('bannerGifInput'));
    document.getElementById('toolbarDeleteSelected')?.addEventListener('click', () => this.deleteSelectedElement());
    document.getElementById('toolbarSave')?.addEventListener('click', () => this.exitEditMode(true));
    document.getElementById('toolbarCancel')?.addEventListener('click', () => this.exitEditMode(false));
    document.getElementById('toolbarReset')?.addEventListener('click', () => this.resetLayout());

    // Text input
    document.getElementById('bannerTextAdd')?.addEventListener('click', () => this.addTextWidget());
    document.getElementById('bannerTextValue')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTextWidget();
    });

    // GIF input
    document.getElementById('bannerGifAdd')?.addEventListener('click', () => this.addGifWidget());
    document.getElementById('bannerGifUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addGifWidget();
    });

    // Sticker grid
    this.populateStickerGrid();

    // Font selector
    this.populateFontSelector();

    // Resize controls
    document.getElementById('toolbarScaleUp')?.addEventListener('click', () => this.changeWidgetScale(0.1));
    document.getElementById('toolbarScaleDown')?.addEventListener('click', () => this.changeWidgetScale(-0.1));

    // Stretch controls
    document.getElementById('toolbarStretchXUp')?.addEventListener('click', () => this.changeWidgetStretch('x', 0.1));
    document.getElementById('toolbarStretchXDown')?.addEventListener('click', () => this.changeWidgetStretch('x', -0.1));
    document.getElementById('toolbarStretchYUp')?.addEventListener('click', () => this.changeWidgetStretch('y', 0.1));
    document.getElementById('toolbarStretchYDown')?.addEventListener('click', () => this.changeWidgetStretch('y', -0.1));

    // Text style controls
    document.getElementById('toolbarTextColor')?.addEventListener('input', (e) => {
      this.changeTextStyle({ color: (e.target as HTMLInputElement).value });
    });
    document.getElementById('toolbarFontFamily')?.addEventListener('change', (e) => {
      this.changeTextStyle({ fontFamily: (e.target as HTMLSelectElement).value || undefined });
    });
    document.getElementById('toolbarFontUp')?.addEventListener('click', () => this.changeTextFontSize(2));
    document.getElementById('toolbarFontDown')?.addEventListener('click', () => this.changeTextFontSize(-2));

    // Pointer events on canvas
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    document.addEventListener('pointermove', this.boundPointerMove);
    document.addEventListener('pointerup', this.boundPointerUp);

    // Prevent native drag-and-drop on images inside canvas
    this.canvas.addEventListener('dragstart', (e) => {
      if (this.isEditMode) {
        e.preventDefault();
      }
    });
  }

  // ==================== EDIT MODE ====================

  private toggleEditMode(): void {
    if (this.isEditMode) {
      this.exitEditMode(false);
    } else {
      this.enterEditMode();
    }
  }

  private enterEditMode(): void {
    this.isEditMode = true;
    this.banner.classList.add('edit-mode');
    this.layoutSnapshot = JSON.parse(JSON.stringify(this.layout));
    this.widgetsSnapshot = JSON.parse(JSON.stringify(this.widgets));
  }

  private exitEditMode(save: boolean): void {
    this.isEditMode = false;
    this.banner.classList.remove('edit-mode');
    this.selectedElementId = null;
    this.hideAllPopovers();
    this.deselectAll();

    if (save) {
      this.saveLayout();
    } else {
      // Revert
      this.layout = this.layoutSnapshot;
      this.widgets = this.widgetsSnapshot;
      this.removeWidgetElements();
      this.applyLayout();
      this.renderAllWidgets();
    }
  }

  // ==================== LAYOUT ====================

  private loadLayout(): BannerLayout {
    if (this.user.bannerLayout && this.user.bannerLayout.version) {
      return JSON.parse(JSON.stringify(this.user.bannerLayout));
    }
    return JSON.parse(JSON.stringify(DEFAULT_BANNER_LAYOUT));
  }

  private applyLayout(): void {
    for (const elDef of this.layout.elements) {
      const domEl = this.canvas.querySelector(
        `[data-element-id="${elDef.id}"]`
      ) as HTMLElement | null;
      if (!domEl) continue;

      domEl.style.display = elDef.visible ? '' : 'none';
      this.positionElement(domEl, elDef.position, elDef.zIndex);

      // Apply text styles for username/subtitle
      if ((elDef.type === 'username' || elDef.type === 'subtitle') && elDef.textStyle) {
        this.applyTextStyleToElement(domEl, elDef.textStyle, elDef.type);
      }
    }
  }

  private positionElement(el: HTMLElement, pos: BannerPosition, zIndex: number): void {
    el.style.left = `${pos.x}%`;
    el.style.top = `${pos.y}%`;
    el.style.zIndex = zIndex.toString();
  }

  // ==================== DRAG & DROP ====================

  private onPointerDown(e: PointerEvent): void {
    if (!this.isEditMode) return;

    const target = (e.target as HTMLElement).closest('.banner-element') as HTMLElement | null;
    if (!target) {
      this.deselectAll();
      this.hideAllPopovers();
      return;
    }

    // Make sure target is inside canvas
    if (!this.canvas.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();
    target.setPointerCapture(e.pointerId);

    const elementId = target.dataset.elementId!;
    this.selectElement(elementId);

    const currentPos = this.getElementPosition(elementId);

    this.dragState = {
      active: true,
      elementId,
      startPointer: { x: e.clientX, y: e.clientY },
      startPosition: { ...currentPos },
      element: target,
    };

    target.classList.add('dragging');
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragState.active || !this.dragState.element) return;

    e.preventDefault();
    e.stopPropagation();

    const canvasRect = this.canvas.getBoundingClientRect();

    // Calculate delta from start pointer position
    const dx = e.clientX - this.dragState.startPointer.x;
    const dy = e.clientY - this.dragState.startPointer.y;

    // Convert delta to percentage of canvas size
    const dxPercent = (dx / canvasRect.width) * 100;
    const dyPercent = (dy / canvasRect.height) * 100;

    // Apply delta to original position
    const newX = this.dragState.startPosition.x + dxPercent;
    const newY = this.dragState.startPosition.y + dyPercent;

    // Clamp to canvas bounds
    const newPos = this.clampPosition({ x: newX, y: newY });

    this.dragState.element.style.left = `${newPos.x}%`;
    this.dragState.element.style.top = `${newPos.y}%`;

    this.setElementPosition(this.dragState.elementId!, newPos);
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.dragState.active) return;

    if (this.dragState.element) {
      this.dragState.element.classList.remove('dragging');
      try {
        this.dragState.element.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if capture already released
      }
    }

    this.dragState = {
      active: false,
      elementId: null,
      startPointer: { x: 0, y: 0 },
      startPosition: { x: 0, y: 0 },
      element: null,
    };
  }

  private clampPosition(pos: BannerPosition): BannerPosition {
    return {
      x: Math.max(0, Math.min(90, pos.x)),
      y: Math.max(0, Math.min(85, pos.y)),
    };
  }

  // ==================== ELEMENT POSITION HELPERS ====================

  private getElementPosition(elementId: string): BannerPosition {
    // Check core elements
    const coreEl = this.layout.elements.find(e => e.id === elementId);
    if (coreEl) return { ...coreEl.position };

    // Check widgets
    if (elementId.startsWith('widget-')) {
      const widgetId = elementId.replace('widget-', '');
      const widget = this.widgets.find(w => w.id === widgetId);
      if (widget?.canvasPosition) return { ...widget.canvasPosition };
    }

    return { x: 50, y: 50 };
  }

  private setElementPosition(elementId: string, pos: BannerPosition): void {
    // Core element
    const coreEl = this.layout.elements.find(e => e.id === elementId);
    if (coreEl) {
      coreEl.position = { ...pos };
      return;
    }

    // Widget
    if (elementId.startsWith('widget-')) {
      const widgetId = elementId.replace('widget-', '');
      const widget = this.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.canvasPosition = { ...pos };
      }
    }
  }

  // ==================== SELECTION ====================

  private selectElement(elementId: string): void {
    this.deselectAll();
    this.selectedElementId = elementId;

    const el = this.canvas.querySelector(
      `[data-element-id="${elementId}"]`
    ) as HTMLElement | null;
    if (el) el.classList.add('selected');

    const deleteBtn = document.getElementById('toolbarDeleteSelected') as HTMLButtonElement | null;
    if (deleteBtn) {
      deleteBtn.disabled = !elementId.startsWith('widget-');
    }

    // Show resize controls for sticker/gif widgets
    const resizeSection = document.getElementById('toolbarResize');
    const textStyleSection = document.getElementById('toolbarTextStyle');

    if (elementId.startsWith('widget-')) {
      const widgetId = elementId.replace('widget-', '');
      const widget = this.widgets.find(w => w.id === widgetId);
      if (widget && (widget.type === 'sticker' || widget.type === 'gif')) {
        if (resizeSection) resizeSection.style.display = '';
        this.updateScaleDisplay(widget.scale || 1);
        this.updateStretchDisplay(widget.stretchX || 1, widget.stretchY || 1);
      } else {
        if (resizeSection) resizeSection.style.display = 'none';
      }
      if (textStyleSection) textStyleSection.style.display = 'none';
    } else if (elementId === 'username' || elementId === 'subtitle') {
      // Show text style controls
      if (textStyleSection) textStyleSection.style.display = '';
      if (resizeSection) resizeSection.style.display = 'none';
      this.updateTextStyleDisplay(elementId);
    } else {
      if (resizeSection) resizeSection.style.display = 'none';
      if (textStyleSection) textStyleSection.style.display = 'none';
    }
  }

  private deselectAll(): void {
    this.selectedElementId = null;
    this.canvas.querySelectorAll('.banner-element.selected')
      .forEach(el => el.classList.remove('selected'));

    const deleteBtn = document.getElementById('toolbarDeleteSelected') as HTMLButtonElement | null;
    if (deleteBtn) deleteBtn.disabled = true;

    // Hide resize and text style controls
    const resizeSection = document.getElementById('toolbarResize');
    const textStyleSection = document.getElementById('toolbarTextStyle');
    if (resizeSection) resizeSection.style.display = 'none';
    if (textStyleSection) textStyleSection.style.display = 'none';
  }

  // ==================== WIDGET MANAGEMENT ====================

  private addTextWidget(): void {
    const input = document.getElementById('bannerTextValue') as HTMLInputElement;
    const text = input?.value.trim();
    if (!text) return;

    if (this.widgets.length >= 6) {
      alert('Максимум 6 виджетов!');
      return;
    }

    const widget: ProfileWidget = {
      id: Date.now().toString(),
      type: 'text',
      content: text,
      position: 'left',
      canvasPosition: { x: 40, y: 45 },
      zIndex: 20,
    };

    this.widgets.push(widget);
    this.renderWidgetOnCanvas(widget);
    input.value = '';
    this.hideAllPopovers();
  }

  private addGifWidget(): void {
    const input = document.getElementById('bannerGifUrl') as HTMLInputElement;
    const url = input?.value.trim();
    if (!url) return;

    if (this.widgets.length >= 6) {
      alert('Максимум 6 виджетов!');
      return;
    }

    const widget: ProfileWidget = {
      id: Date.now().toString(),
      type: 'gif',
      content: url,
      position: 'left',
      canvasPosition: { x: 50, y: 40 },
      zIndex: 20,
    };

    this.widgets.push(widget);
    this.renderWidgetOnCanvas(widget);
    input.value = '';
    this.hideAllPopovers();
  }

  private addStickerWidget(stickerKey: string): void {
    if (this.widgets.length >= 6) {
      alert('Максимум 6 виджетов!');
      return;
    }

    const widget: ProfileWidget = {
      id: Date.now().toString(),
      type: 'sticker',
      content: stickerKey,
      position: 'left',
      canvasPosition: { x: 45, y: 45 },
      zIndex: 20,
    };

    this.widgets.push(widget);
    this.renderWidgetOnCanvas(widget);
    this.hideAllPopovers();
  }

  private deleteSelectedElement(): void {
    if (!this.selectedElementId || !this.selectedElementId.startsWith('widget-')) return;

    const widgetId = this.selectedElementId.replace('widget-', '');
    this.widgets = this.widgets.filter(w => w.id !== widgetId);

    const el = this.canvas.querySelector(`[data-element-id="${this.selectedElementId}"]`);
    if (el) el.remove();

    this.deselectAll();
  }

  private renderWidgetOnCanvas(widget: ProfileWidget): void {
    const el = document.createElement('div');
    el.className = 'banner-element';
    el.dataset.elementId = `widget-${widget.id}`;
    el.dataset.elementType = 'widget';

    const content = this.createWidgetContent(widget);
    el.appendChild(content);

    const pos = widget.canvasPosition || { x: 50, y: 50 };
    this.positionElement(el, pos, widget.zIndex || 20);

    // Apply scale and stretch
    this.applyWidgetTransform(content, widget);

    this.canvas.appendChild(el);
  }

  private createWidgetContent(widget: ProfileWidget): HTMLElement {
    const div = document.createElement('div');
    div.className = 'profile-widget';

    switch (widget.type) {
      case 'text':
        div.classList.add('widget-text');
        div.textContent = widget.content;
        break;
      case 'sticker':
        div.classList.add('widget-sticker');
        div.textContent = STICKERS[widget.content] || widget.content;
        break;
      case 'gif': {
        div.classList.add('widget-gif');
        const img = document.createElement('img');
        img.src = widget.content;
        img.alt = 'GIF';
        div.appendChild(img);
        break;
      }
    }

    return div;
  }

  private renderAllWidgets(): void {
    for (const widget of this.widgets) {
      this.renderWidgetOnCanvas(widget);
    }
  }

  private removeWidgetElements(): void {
    this.canvas.querySelectorAll('[data-element-type="widget"]')
      .forEach(el => el.remove());
  }

  // ==================== WIDGET RESIZE & STRETCH ====================

  private applyWidgetTransform(content: HTMLElement, widget: ProfileWidget): void {
    const scale = widget.scale || 1;
    const sx = widget.stretchX || 1;
    const sy = widget.stretchY || 1;

    if (scale !== 1 || sx !== 1 || sy !== 1) {
      content.style.transform = `scale(${scale * sx}, ${scale * sy})`;
      content.style.transformOrigin = 'center center';
    } else {
      content.style.transform = '';
    }
  }

  private changeWidgetScale(delta: number): void {
    if (!this.selectedElementId || !this.selectedElementId.startsWith('widget-')) return;

    const widgetId = this.selectedElementId.replace('widget-', '');
    const widget = this.widgets.find(w => w.id === widgetId);
    if (!widget || (widget.type !== 'sticker' && widget.type !== 'gif')) return;

    const currentScale = widget.scale || 1;
    const newScale = Math.max(0.3, Math.min(3, currentScale + delta));
    widget.scale = Math.round(newScale * 10) / 10;

    // Apply to DOM
    const el = this.canvas.querySelector(
      `[data-element-id="${this.selectedElementId}"]`
    ) as HTMLElement | null;
    if (el) {
      const content = el.querySelector('.profile-widget') as HTMLElement | null;
      if (content) this.applyWidgetTransform(content, widget);
    }

    this.updateScaleDisplay(widget.scale);
  }

  private changeWidgetStretch(axis: 'x' | 'y', delta: number): void {
    if (!this.selectedElementId || !this.selectedElementId.startsWith('widget-')) return;

    const widgetId = this.selectedElementId.replace('widget-', '');
    const widget = this.widgets.find(w => w.id === widgetId);
    if (!widget || (widget.type !== 'sticker' && widget.type !== 'gif')) return;

    if (axis === 'x') {
      const current = widget.stretchX || 1;
      widget.stretchX = Math.round(Math.max(0.3, Math.min(3, current + delta)) * 10) / 10;
    } else {
      const current = widget.stretchY || 1;
      widget.stretchY = Math.round(Math.max(0.3, Math.min(3, current + delta)) * 10) / 10;
    }

    // Apply to DOM
    const el = this.canvas.querySelector(
      `[data-element-id="${this.selectedElementId}"]`
    ) as HTMLElement | null;
    if (el) {
      const content = el.querySelector('.profile-widget') as HTMLElement | null;
      if (content) this.applyWidgetTransform(content, widget);
    }

    this.updateStretchDisplay(widget.stretchX || 1, widget.stretchY || 1);
  }

  private updateScaleDisplay(scale: number): void {
    const display = document.getElementById('toolbarScaleValue');
    if (display) display.textContent = `${Math.round(scale * 100)}%`;
  }

  private updateStretchDisplay(sx: number, sy: number): void {
    const xDisplay = document.getElementById('toolbarStretchXValue');
    const yDisplay = document.getElementById('toolbarStretchYValue');
    if (xDisplay) xDisplay.textContent = `${Math.round(sx * 100)}%`;
    if (yDisplay) yDisplay.textContent = `${Math.round(sy * 100)}%`;
  }

  // ==================== TEXT STYLE ====================

  private changeTextStyle(updates: Partial<TextStyle>): void {
    if (!this.selectedElementId) return;
    if (this.selectedElementId !== 'username' && this.selectedElementId !== 'subtitle') return;

    const elDef = this.layout.elements.find(e => e.id === this.selectedElementId);
    if (!elDef) return;

    if (!elDef.textStyle) elDef.textStyle = {};
    Object.assign(elDef.textStyle, updates);

    // Apply to DOM
    const domEl = this.canvas.querySelector(
      `[data-element-id="${this.selectedElementId}"]`
    ) as HTMLElement | null;
    if (domEl) {
      this.applyTextStyleToElement(domEl, elDef.textStyle, elDef.type);
    }
  }

  private changeTextFontSize(delta: number): void {
    if (!this.selectedElementId) return;
    if (this.selectedElementId !== 'username' && this.selectedElementId !== 'subtitle') return;

    const elDef = this.layout.elements.find(e => e.id === this.selectedElementId);
    if (!elDef) return;

    if (!elDef.textStyle) elDef.textStyle = {};
    const defaultSize = this.selectedElementId === 'username' ? 32 : 16;
    const current = elDef.textStyle.fontSize || defaultSize;
    elDef.textStyle.fontSize = Math.max(10, Math.min(72, current + delta));

    // Apply to DOM
    const domEl = this.canvas.querySelector(
      `[data-element-id="${this.selectedElementId}"]`
    ) as HTMLElement | null;
    if (domEl) {
      this.applyTextStyleToElement(domEl, elDef.textStyle, elDef.type);
    }

    this.updateTextStyleDisplay(this.selectedElementId);
  }

  private applyTextStyleToElement(el: HTMLElement, style: TextStyle, type: string): void {
    const textEl = type === 'username'
      ? el.querySelector('.profile-name') as HTMLElement | null
      : el.querySelector('.profile-subtitle') as HTMLElement | null;

    if (!textEl) return;

    if (style.color) {
      textEl.classList.add('custom-color');
      textEl.style.color = style.color;
    } else {
      textEl.classList.remove('custom-color');
      textEl.style.color = '';
    }

    if (style.fontFamily) {
      textEl.style.fontFamily = style.fontFamily;
    } else {
      textEl.style.fontFamily = '';
    }

    if (style.fontSize) {
      textEl.style.fontSize = `${style.fontSize}px`;
    } else {
      textEl.style.fontSize = '';
    }
  }

  private updateTextStyleDisplay(elementId: string): void {
    const elDef = this.layout.elements.find(e => e.id === elementId);
    if (!elDef) return;

    const style = elDef.textStyle || {};
    const defaultSize = elementId === 'username' ? 32 : 16;

    // Update color picker
    const colorPicker = document.getElementById('toolbarTextColor') as HTMLInputElement | null;
    if (colorPicker) {
      colorPicker.value = style.color || (elementId === 'username' ? '#f97316' : '#94a3b8');
    }

    // Update font selector
    const fontSelect = document.getElementById('toolbarFontFamily') as HTMLSelectElement | null;
    if (fontSelect) {
      fontSelect.value = style.fontFamily || '';
    }

    // Update font size display
    const sizeDisplay = document.getElementById('toolbarFontSizeValue');
    if (sizeDisplay) {
      sizeDisplay.textContent = `${style.fontSize || defaultSize}px`;
    }
  }

  // ==================== FONT SELECTOR ====================

  private populateFontSelector(): void {
    const select = document.getElementById('toolbarFontFamily') as HTMLSelectElement | null;
    if (!select) return;

    for (const font of BANNER_FONTS) {
      const option = document.createElement('option');
      option.value = font;
      option.textContent = font.split(',')[0].trim();
      option.style.fontFamily = font;
      select.appendChild(option);
    }
  }

  // ==================== STICKER GRID ====================

  private populateStickerGrid(): void {
    const grid = document.getElementById('bannerStickerGrid');
    if (!grid) return;

    for (const [key, emoji] of Object.entries(STICKERS)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sticker-btn';
      btn.textContent = emoji;

      btn.addEventListener('click', () => {
        this.addStickerWidget(key);
      });

      grid.appendChild(btn);
    }
  }

  // ==================== POPOVERS ====================

  private showPopover(id: string): void {
    this.hideAllPopovers();
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  private hideAllPopovers(): void {
    ['bannerStickerPicker', 'bannerGifInput', 'bannerTextInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  // ==================== RESET ====================

  private resetLayout(): void {
    if (!confirm('Сбросить расположение элементов до стандартного?')) return;

    this.layout = JSON.parse(JSON.stringify(DEFAULT_BANNER_LAYOUT));
    this.widgets = [];
    this.removeWidgetElements();
    this.applyLayout();
    this.deselectAll();
  }

  // ==================== PERSISTENCE ====================

  private saveLayout(): void {
    this.user.bannerLayout = JSON.parse(JSON.stringify(this.layout));
    this.user.profileWidgets = JSON.parse(JSON.stringify(this.widgets));

    localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(this.user));

    const dbStr = localStorage.getItem(StorageKeys.DATABASE);
    if (dbStr) {
      const db: Database = JSON.parse(dbStr);
      const idx = db.users.findIndex(u => u.id === this.user.id);
      if (idx !== -1) {
        db.users[idx] = this.user;
        localStorage.setItem(StorageKeys.DATABASE, JSON.stringify(db));
      }
    }
  }
}
