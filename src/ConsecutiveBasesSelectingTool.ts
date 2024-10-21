interface Nucleobase {
  /**
   * The actual DOM node comprising the nucleobase.
   */
  domNode: Node;
}

/**
 * An RNAcanvas structure drawing.
 */
interface Drawing<B extends Nucleobase> {
  /**
   * The actual DOM node comprising the drawing (e.g., an SVG document).
   */
  domNode: Node;

  /**
   * The bases in the drawing.
   *
   * The ordering of bases in this iterable is the ordering of bases in the drawing.
   */
  bases: Iterable<B>;
}

/**
 * A set of items that is also assumed to be referenced and used by outside code.
 */
interface LiveSet<T> {
  /**
   * Returns true if the set includes the specified item and returns false otherwise.
   */
  include(item: T): boolean;

  /**
   * Adds all of the specified items to the set.
   */
  addAll(items: T[]): void;
}

/**
 * A tool that allows users to select consecutive sequences of bases in a target drawing
 * by dragging the mouse over them while holding down the mouse and the `Shift` key.
 */
export class ConsecutiveBasesSelectingTool<B extends Nucleobase> {
  /**
   * The most recent mouse down event.
   */
  private lastMouseDown: MouseEvent | undefined;

  /**
   * Is to be set to true when the mouse is down.
   */
  private mouseIsDown = false;

  /**
   * The provided set of selected bases will be modified based on user interaction with the target drawing.
   *
   * @param target The drawing that the tool is for.
   * @param selectedBases A live set of the currently selected bases.
   */
  constructor(public target: Drawing<B>, private selectedBases: LiveSet<B>) {
    window.addEventListener('mousedown', event => this.handleMouseDown(event));

    window.addEventListener('mouseup', event => this.handleMouseUp(event));

    window.addEventListener('mouseover', event => this.handleMouseOver(event));
  }

  handleMouseDown(event: MouseEvent): void {
    this.lastMouseDown = event;

    this.mouseIsDown = true;
  }

  handleMouseUp(event: MouseEvent): void {
    this.mouseIsDown = false;
  }

  handleMouseOver(event: MouseEvent): void {
    if (!this.mouseIsDown) { return; }

    let lastMouseDown = this.lastMouseDown;
    if (!lastMouseDown) { return; }
    if (!lastMouseDown.shiftKey) { return; }

    if (!(event.target instanceof Node)) { return; }
    if (!this.target.domNode.contains(event.target)) { return; }

    let bases = [...this.target.bases];

    let mousedOverBaseIndex = bases.findIndex(b => b.domNode === event.target);
    if (mousedOverBaseIndex < 0) { return; }

    let mouseDownedBaseIndex = bases.findIndex(b => b.domNode === lastMouseDown.target);
    if (mouseDownedBaseIndex < 0) { return; }

    // enclose array indexing in try...catch statement just to be safe
    try {
      let mouseDownedBase = bases[mouseDownedBaseIndex];
      if (!this.selectedBases.include(mouseDownedBase)) { return; }
    } catch (error: unknown) {
      console.error(error);
    }

    let minIndex = Math.min(mouseDownedBaseIndex, mousedOverBaseIndex);
    let maxIndex = Math.max(mouseDownedBaseIndex, mousedOverBaseIndex);

    this.selectedBases.addAll(bases.slice(minIndex, maxIndex + 1));
  }
}
