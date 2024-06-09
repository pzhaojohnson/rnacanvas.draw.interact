interface Nucleobase {
  /**
   * The actual DOM node corresponding to the nucleobase.
   */
  domNode: SVGElement;
}

/**
 * An RNAcanvas structure drawing.
 */
interface Drawing<B extends Nucleobase> {
  /**
   * The bases in the drawing.
   */
  bases: Iterable<B>;
}

/**
 * A live set of items that may also be referenced and modified by outside code.
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
 * Represents the set of currently selected bases in a target drawing
 * given the set of currently selected SVG elements.
 */
export class SelectedBases<B extends Nucleobase> {
  constructor(private targetDrawing: Drawing<B>, private selectedSVGElements: LiveSet<SVGElement>) {}

  [Symbol.iterator]() {
    return [...this.targetDrawing.bases].filter(b => this.selectedSVGElements.include(b.domNode)).values();
  }

  /**
   * Returns true if the specified base is currently selected and returns false otherwise.
   */
  include(b: B): boolean {
    return this.selectedSVGElements.include(b.domNode);
  }

  /**
   * Adds all of the specified bases to the set of currently selected bases.
   */
  addAll(bs: Iterable<B>): void {
    this.selectedSVGElements.addAll([...bs].map(b => b.domNode));
  }
}
