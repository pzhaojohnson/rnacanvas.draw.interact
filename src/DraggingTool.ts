import type { Nucleobase } from '@rnacanvas/layout';

import { shift } from '@rnacanvas/layout';

import { distance } from '@rnacanvas/points';

import { CoordinateSystem } from '@rnacanvas/draw.svg';

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
   * The index of the defining point to drag when dragging tertiary bonds.
   *
   * Default to the first control point (or the end point for linear tertiary bonds).
   */
  #tertiaryBondsIndex = 1;

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
    let selectedSVGElements = this.#targetApp.selectedSVGElements;

    let selectedTertiaryBonds = [...this.#targetApp.drawing.tertiaryBonds].filter(tb => selectedSVGElements.include(tb.domNode));

    if (!this.lastMouseDown) {
      return;
    } else if (!(this.lastMouseDown.target instanceof SVGGraphicsElement)) {
      return;
    }

    // just drag the tertiary bond that was clicked on (if a tertiary bond was clicked on)
    let draggedTertiaryBond = selectedTertiaryBonds.find(tb => tb.domNode === this.lastMouseDown?.target);

    // no tertiary bond is being dragged
    if (!draggedTertiaryBond) {
      return;
    }

    let dragX = mouseMove.movementX / this.#targetApp.drawing.horizontalClientScaling;
    let dragY = mouseMove.movementY / this.#targetApp.drawing.verticalClientScaling;

    // all other SVG elements being dragged
    let dragGroup = { has: (ele: SVGGraphicsElement) => selectedSVGElements.include(ele) };

    if (!this.dragged) {
      this.#updateTertiaryBondsIndex(draggedTertiaryBond, mouseMove);
    }

    draggedTertiaryBond.drag(dragX, dragY, {
      dragGroup,
      dragPoint: draggedTertiaryBond.definingPoints.toArray()[this.#tertiaryBondsIndex],
    });
  }

  #updateTertiaryBondsIndex(draggedTertiaryBond: TertiaryBond, mouseMove: MouseEvent) {
    let coordinateSystem = new CoordinateSystem(this.#targetApp.drawing.domNode);

    // the point that the user is dragging "from"
    let dragPoint = {
      x: coordinateSystem.fromClientX(mouseMove.clientX),
      y: coordinateSystem.fromClientY(mouseMove.clientY),
    };

    let precision = draggedTertiaryBond.length / 10;

    // anchored to the closest tertiary bond
    let anchoredDragPoint = draggedTertiaryBond.closestPoint(dragPoint, { precision });

    let anchoredDefiningPoints: [Point, Index][] = (
      draggedTertiaryBond
        .definingPoints
        .toArray()
        .map((p, i) => [draggedTertiaryBond.closestPoint(p, { precision }), i])
    );

    // sort in increasing order by distance to the anchored drag point
    anchoredDefiningPoints.sort(([p1, _], [p2, __]) => distance(p1, anchoredDragPoint) - distance(p2, anchoredDragPoint));

    if (anchoredDefiningPoints.length == 0) { return; }
    this.#tertiaryBondsIndex = anchoredDefiningPoints[0][1];
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

  readonly length: number;

  /**
   * Returns the closest point on a tertiary bond to a given point.
   *
   * The `precision` option corresponds to the margin for error in the calculation.
   */
  closestPoint(p: Point, options?: { precision?: number }): Point;

  /**
   * The points that define the path of a tertiary bond (in order).
   */
  readonly definingPoints: {
    toArray(): Point[];
  };

  drag(x: number, y: number, options?: { dragPoint?: Point, dragGroup?: Collection<SVGGraphicsElement> }): void;
}

type Point = {
  x: number;
  y: number;
};

interface Collection<T> {
  has(item: T): boolean;
}

type Index = number;
