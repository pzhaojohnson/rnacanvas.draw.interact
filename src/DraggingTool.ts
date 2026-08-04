import type { Nucleobase as Nucleobase_ } from '@rnacanvas/layout';

import { shift } from '@rnacanvas/layout';

import { CoordinateSystem } from '@rnacanvas/draw.svg';

import { distance } from '@rnacanvas/math';

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

  /**
   * The index of the defining point to drag for tertiary bonds.
   *
   * (Drag the first control point by default, or the end point.)
   */
  #tertiaryBondsDragIndex = 1;

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
    if (!selectedSVGElements.include(this.lastMouseDown.target) && !selectedElementHighlightings.domNode.contains(this.lastMouseDown.target)) {
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

    this.#dragTertiaryBonds(event);

    this.dragged = true;
  }

  #dragTertiaryBonds(mouseMove: MouseEvent) {
    if (!this.lastMouseDown) {
      return;
    } else if (!(this.lastMouseDown.target instanceof SVGGraphicsElement)) {
      return;
    }

    let coordinateSystem = new CoordinateSystem(this.#targetApp.drawing.domNode);

    // the point in the drawing that dragging is happening from
    let dragPoint = {
      x: coordinateSystem.fromClientX(mouseMove.clientX),
      y: coordinateSystem.fromClientY(mouseMove.clientY),
    };

    let dragVector = {
      x: mouseMove.movementX / this.#targetApp.drawing.horizontalClientScaling,
      y: mouseMove.movementY / this.#targetApp.drawing.verticalClientScaling,
    };

    let selectedSVGElements = this.#targetApp.selectedSVGElements;

    let selectedTertiaryBonds = [...this.#targetApp.selectedTertiaryBonds];

    // only drag a tertiary bond if it was directly clicked on
    let draggedTertiaryBond = selectedTertiaryBonds.find(tb => tb.domNode === this.lastMouseDown?.target);

    // no tertiary bond is being dragged
    if (!draggedTertiaryBond) {
      return;
    }

    // don't change which defining point is being dragged mid-dragging
    if (!this.dragged) {
      let length = draggedTertiaryBond.closestPoint(dragPoint).length;

      let ps = draggedTertiaryBond.definingPoints.toArray();

      // don't need to calculate for start and end points
      let anchored = [
        { length: 0 },
        ps.slice(1, -1).map(p => draggedTertiaryBond.closestPoint(p, { precision: 1 })),
        { length: draggedTertiaryBond.length },
      ];

      // sort by length distance
      let sorted = [...anchored].sort((p1, p2) => distance(p1.length, length) - distance(p2.length, length));

      this.#tertiaryBondsDragIndex = anchored.indexOf(sorted[0]);

      // just in case couldn't find the closest defining point (shouldn't happen)
      this.#tertiaryBondsDragIndex = this.#tertiaryBondsDragIndex ?? 1;
    }

    draggedTertiaryBond.drag(dragVector.x, dragVector.y, {
      dragGroup: { has: ele => selectedSVGElements.include(ele) },

      // ensure that the desired defining point is dragged
      dragPoint: draggedTertiaryBond.definingPoints.toArray()[this.#tertiaryBondsDragIndex],
    });
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

    include(ele: SVGGraphicsElement): boolean;
  };

  readonly selectedBases: Iterable<Nucleobase>;

  readonly selectedOutlines: Iterable<Outline>;

  readonly selectedNumberings: Iterable<Numbering>;

  selectedTertiaryBonds: Iterable<TertiaryBond>;

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
   * The SVG document corresponding to the drawing.
   */
  readonly domNode: SVGSVGElement;

  /**
   * The horizontal scaling factor from the drawing coordinate system to the client coodinate system.
   */
  readonly horizontalClientScaling: number;

  /**
   * The vertical scaling factor from the drawing coordinate system to the client coordinate system.
   */
  readonly verticalClientScaling: number;

  readonly tertiaryBonds: Iterable<TertiaryBond>;
}

interface Nucleobase extends Nucleobase_ {
  readonly domNode: SVGTextElement;
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

interface TertiaryBond {
  readonly domNode: SVGGraphicsElement;

  readonly base1: Nucleobase;
  readonly base2: Nucleobase;

  readonly length: number;

  /**
   * Returns the closest point on a tertiary bond to a given point.
   *
   * The `precision` option corresponds to the margin for error in the calculation.
   */
  closestPoint(p: Point, options?: { precision?: number }): {
    x: number;
    y: number;

    /**
     * The length along the tertiary bond that the closest point is at.
     */
    length: number;
  };

  /**
   * The points that define the path of a tertiary bond (in order).
   */
  readonly definingPoints: {
    toArray(): Point[];
  };

  drag(x: number, y: number, options?: { dragGroup?: Collection<SVGGraphicsElement>, dragPoint?: Point}): void;
}

type Point = {
  x: number;
  y: number;
};

interface Collection<T> {
  has(item: T): boolean;
}
