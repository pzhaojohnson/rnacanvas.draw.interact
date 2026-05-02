import type { Nucleobase } from '@rnacanvas/layout';

import { shift } from '@rnacanvas/layout';

export class DraggingTool {
  readonly #targetApp;

  /**
   * The most recent mouse down event.
   */
  private lastMouseDown: MouseEvent | undefined;

  /**
   * To be set to true when the mouse is down.
   */
  private mouseIsDown = false;

  /**
   * To be set to true immediately after a mouse move event that initiates dragging of the selected elements.
   *
   * To be set to false after the next mouse up event.
   */
  private dragged = false;

  constructor(targetApp: App) {
    this.#targetApp = targetApp;

    window.addEventListener('mousedown', event => this.handleMouseDown(event));

    window.addEventListener('mousemove', event => this.handleMouseMove(event));

    window.addEventListener('mouseup', event => this.handleMouseUp(event));
  }

  private handleMouseDown(event: MouseEvent): void {
    this.lastMouseDown = event;

    this.mouseIsDown = true;

    this.dragged = false;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.mouseIsDown) {
      return;
    } else if (!this.lastMouseDown) {
      return;
    }

    // elements aren't supposed to be dragged when the `Shift` key is held down
    if (this.lastMouseDown.shiftKey) {
      return;
    }

    if (!(this.lastMouseDown.target instanceof SVGGraphicsElement)) {
      return;
    }

    let selectedSVGElements = this.#targetApp.selectedSVGElements;

    let selectedElementHighlightings = this.#targetApp.selectedElementHighlightings;

    // the last mouse down event must have been on a selected element (or a selected element highlighting) for dragging to occur
    if (!selectedSVGElements.has(this.lastMouseDown.target) && !selectedElementHighlightings.domNode.contains(this.lastMouseDown.target)) {
      return;
    }

    let dragX = event.movementX / this.#targetApp.drawing.horizontalClientScaling;
    let dragY = event.movementY / this.#targetApp.drawing.verticalClientScaling;

    !this.dragged ? this.#targetApp.beforeDragging() : {};

    let selectedBases = [...this.#targetApp.selectedBases];

    let selectedBasesSet = new Set(selectedBases);

    shift(selectedBases, { x: dragX, y: dragY });

    // don't shift any outlines whose bases were already shifted (since outlines follow their owner bases)
    [...this.#targetApp.selectedOutlines]
      .filter(o => !selectedBasesSet.has(o.owner))
      .forEach(o => shift([o.owner], { x: dragX, y: dragY }));

    // don't shift any numberings whose bases were already shifted (since numberings follow their owner bases)
    [...this.#targetApp.selectedNumberings]
      .filter(n => !selectedBasesSet.has(n.owner))
      .forEach(n => {
        // just shift the numbering here (not the owner base)
        n.displacement.x += dragX;
        n.displacement.y += dragY;
      });

    this.dragged = true;
  }

  private handleMouseUp(event: MouseEvent): void {
    this.mouseIsDown = false;

    this.dragged ? this.#targetApp.afterDragging() : {};

    this.dragged = false;
  }
}

interface App {
  readonly drawing: Drawing;

  readonly selectedSVGElements: {
    [Symbol.iterator](): Iterator<SVGGraphicsElement>;

    has(ele: SVGGraphicsElement): boolean;
  };

  readonly selectedBases: Iterable<Nucleobase>;

  readonly selectedOutlines: Iterable<Outline>;

  readonly selectedNumberings: Iterable<Numbering>;

  readonly selectedElementHighlightings: {
    /**
     * The DOM node containing all selected element highlightings.
     */
    readonly domNode: SVGGraphicsElement;
  };

  /**
   * Operations to be done before dragging elements (e.g., hiding element highlightings).
   */
  beforeDragging(): void;

  /**
   * Operations to be done after dragging elements (e.g., reshowing element highlightings).
   */
  afterDragging(): void;
}

/**
 * An RNAcanvas structure drawing.
 */
interface Drawing {
  /**
   * The horizontal scaling factor from the drawing coordinate system to the client coodinate system.
   */
  readonly horizontalClientScaling: number;

  /**
   * The vertical scaling factor from the drawing coordinate system to the client coordinate system.
   */
  readonly verticalClientScaling: number;
}

interface Outline {
  readonly owner: Nucleobase;
}

interface Numbering {
  readonly owner: Nucleobase;

  displacement: {
    /**
     * Can be set to control displacement X component.
     */
    x: number;

    /**
     * Can be set to control displacement Y component.
     */
    y: number;
  }
}
