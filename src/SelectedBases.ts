interface Nucleobase {
  /**
   * The actual DOM node corresponding to the nucleobase.
   */
  domNode: SVGGraphicsElement;
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

  /**
   * Change event listeners are to be called whenever the composition of items in the set changes.
   */
  addEventListener(name: 'change', listener: () => void): void;
}

/**
 * Represents the set of currently selected bases in a target drawing
 * given the set of currently selected SVG elements.
 */
export class SelectedBases<B extends Nucleobase> {
  #target;

  #eventListeners: EventListeners = {
    'change': [],
  };

  constructor(target: Drawing<B>, private selectedSVGElements: LiveSet<SVGGraphicsElement>) {
    this.#target = target;

    selectedSVGElements.addEventListener('change', () => this.#callEventListeners('change'));
  }

  /**
   * The target drawing.
   */
  get target() {
    return this.#target;
  }

  set target(target) {
    this.#target = target;

    this.#callEventListeners('change');
  }

  [Symbol.iterator]() {
    return [...this.target.bases].filter(b => this.selectedSVGElements.include(b.domNode)).values();
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

  /**
   * Change events are defined as occurring whenever the set of selected bases changes.
   *
   * At present, change event listeners will sometimes be called even when
   * the set of selected bases has not actually changed.
   */
  addEventListener(name: 'change', listener: () => void): void {
    this.#eventListeners[name].push(listener);
  }

  #callEventListeners(name: 'change'): void {
    this.#eventListeners[name].forEach(listener => listener());
  }
}

type EventListener = () => void;

type EventListeners = {
  'change': EventListener[],
};
