import type { Nucleobase } from '@rnacanvas/bases-layout';

import { shift } from '@rnacanvas/bases-layout';

/**
 * An RNAcanvas structure drawing.
 */
interface Drawing {
  /**
   * The horizontal scaling factor going from the coordinate system of the drawing
   * to the client coordinate system (i.e., the coordinate system used by methods such as `getBoundingClientRect`).
   */
  horizontalClientScaling: number;

  /**
   * The vertical scaling factor going from the coordinate system of the drawing
   * to the client coordinate system (i.e., the coordinate system used by methods such as `getBoundingClientRect`).
   */
  verticalClientScaling: number;
}

/**
 * A live set of the currently selected elements.
 *
 * Its contents are expected to change as the set of currently selected elements changes.
 */
interface SelectedElements {
  /**
   * The currently selected SVG elements.
   *
   * The DOM nodes within this set are expected to encompass
   * the DOM nodes underlying all other selected elements.
   */
  svgElements: {
    /**
     * Returns true if the currently selected SVG elements include the specified element
     * and returns false otherwise.
     */
    include(ele: SVGGraphicsElement): boolean;
  }

  /**
   * The currently selected bases.
   */
  bases: Iterable<Nucleobase>;
}

type Options = {
  /**
   * A callback function to be called right before dragging anything.
   */
  beforeDragging?: () => void;

  /**
   * A callback function to be called right after dragging something.
   */
  afterDragging?: () => void;
};

export class DraggingTool {
  /**
   * The most recent mouse down event.
   */
  private lastMouseDown: MouseEvent | undefined;

  /**
   * To be set to true when the mouse is down.
   */
  private mouseIsDown = false;

  /**
   * Indicates if the selected elements have been dragged
   * during the current mouse down-move-up sequence.
   *
   * To be set to true after a mouse move event that causes the selected elements to be dragged.
   *
   * To be set to false afterwards upon mouse up.
   */
  private dragged = false;

  constructor(private targetDrawing: Drawing, private selectedElements: SelectedElements, private options?: Options) {
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
    if (!this.mouseIsDown) { return; }
    if (!this.lastMouseDown) { return; }

    // this tool is not supposed to respond when the `Shift` key is held down
    if (this.lastMouseDown.shiftKey) { return; }

    // check if the last mouse down event was on a selected element
    if (!(this.lastMouseDown.target instanceof SVGGraphicsElement)) { return; }
    if (!this.selectedElements.svgElements.include(this.lastMouseDown.target)) { return; }

    let dragX = event.movementX / this.targetDrawing.horizontalClientScaling;
    let dragY = event.movementY / this.targetDrawing.verticalClientScaling;

    !this.dragged ? this.options?.beforeDragging ? this.options.beforeDragging() : {} : {};

    // right now this tool is only able to handle dragging bases
    shift([...this.selectedElements.bases], { x: dragX, y: dragY });

    this.dragged = true;
  }

  private handleMouseUp(event: MouseEvent): void {
    this.mouseIsDown = false;

    this.dragged ? this.options?.afterDragging ? this.options.afterDragging() : {} : {};
    this.dragged = false;
  }
}
