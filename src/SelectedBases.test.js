/**
 * @jest-environment jsdom
 */

import { SelectedBases } from './SelectedBases';

class SVGElementMock {
  key = Math.random();
}

class NucleobaseMock {
  domNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
}

class DrawingMock {
  bases = [];
}

class LiveSetMock {
  #items = new Set();

  eventListeners = {
    'change': [],
  };

  [Symbol.iterator]() {
    return this.#items.values();
  }

  include(item) {
    return this.#items.has(item);
  }

  addAll(items) {
    items.forEach(item => this.#items.add(item));

    this.#callEventListeners('change');
  }

  addEventListener(name, listener) {
    this.eventListeners[name].push(listener);
  }

  #callEventListeners(name) {
    this.eventListeners[name].forEach(listener => listener());
  }
}

beforeAll(() => {
  // needed for instance-of operations to work
  globalThis.SVGGraphicsElement = SVGElement;
});

describe('SelectedBases class', () => {
  test('`get target()`', () => {
    let target = new DrawingMock();

    let selectedBases = new SelectedBases(target, new LiveSetMock());

    expect(selectedBases.target).toBe(target);
  });

  test('`set target()`', () => {
    let target1 = new DrawingMock();

    let selectedBases = new SelectedBases(target1, new LiveSetMock());

    let listener = jest.fn();
    selectedBases.addEventListener('change', listener);

    let target2 = new DrawingMock();

    expect(listener).not.toHaveBeenCalled();

    selectedBases.target = target2;
    expect(selectedBases.target).toBe(target2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('is iterable', () => {
    let targetDrawing = new DrawingMock();

    let bases = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => new NucleobaseMock());
    targetDrawing.bases = bases;

    let selectedSVGElements = new LiveSetMock();
    selectedSVGElements.addAll([bases[2].domNode, bases[6].domNode, new SVGElementMock(), bases[3].domNode, new SVGElementMock()]);

    // add some tspans to bases
    [4, 8].forEach(i => bases[i].domNode.append(...[1, 2, 3].map(() => document.createElementNS('http://www.w3.org/2000/svg', 'tspan'))));

    // select some tspans within bases
    selectedSVGElements.addAll([4, 8].map(i => bases[i].domNode.childNodes[1]));

    let selectedBases = new SelectedBases(targetDrawing, selectedSVGElements);

    // only includes the selected bases
    expect([...selectedBases].length).toBe(5);
    expect([...selectedBases].includes(bases[2])).toBeTruthy();
    expect([...selectedBases].includes(bases[6])).toBeTruthy();
    expect([...selectedBases].includes(bases[3])).toBeTruthy();

    // check bases selected by tspans
    [4, 8].forEach(i => expect([...selectedBases].includes(bases[i])).toBeTruthy());
  });

  test('include method', () => {
    let targetDrawing = new DrawingMock();

    let bases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new NucleobaseMock());
    targetDrawing.bases = bases;

    let selectedSVGElements = new LiveSetMock();
    selectedSVGElements.addAll([new SVGElementMock(), bases[5].domNode, bases[1].domNode, new SVGElementMock(), new SVGElementMock()]);

    // give some bases tspans
    [2, 7, 9].forEach(i => bases[i].domNode.append(...[1, 2].map(() => document.createElementNS('http://www.w3.org/2000/svg', 'tspan'))));

    // select tspans within some bases
    selectedSVGElements.addAll([7, 9].map(i => bases[i].domNode.childNodes[0]));

    let selectedBases = new SelectedBases(targetDrawing, selectedSVGElements);

    expect(selectedBases.include(bases[1])).toBe(true);
    expect(selectedBases.include(bases[5])).toBe(true);

    // bases selected by their tspans
    [7, 9].forEach(i => expect(selectedBases.include(bases[i])).toBe(true));

    expect(selectedBases.include(bases[0])).toBe(false);
    expect(selectedBases.include(bases[2])).toBe(false);
    expect(selectedBases.include(bases[10])).toBe(false);
  });

  test('addAll method', () => {
    let targetDrawing = new DrawingMock();

    let bases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new NucleobaseMock());
    targetDrawing.bases = bases;

    let selectedSVGElements = new LiveSetMock();

    let selectedBases = new SelectedBases(targetDrawing, selectedSVGElements);
    selectedBases.addAll([bases[3], bases[0], bases[8], bases[5]]);

    expect([...selectedSVGElements].length).toBe(4);
    expect(selectedSVGElements.include(bases[0].domNode)).toBeTruthy();
    expect(selectedSVGElements.include(bases[3].domNode)).toBeTruthy();
    expect(selectedSVGElements.include(bases[5].domNode)).toBeTruthy();
    expect(selectedSVGElements.include(bases[8].domNode)).toBeTruthy();
  });

  test('`addEventListener()`', () => {
    let selectedSVGElements = new LiveSetMock();

    let selectedBases = new SelectedBases(new DrawingMock(), selectedSVGElements);

    let listeners = [jest.fn(), jest.fn(), jest.fn()];
    listeners.forEach(li => selectedBases.addEventListener('change', li));

    listeners.forEach(li => expect(li).not.toHaveBeenCalled());

    selectedSVGElements.addAll([1, 2, 3, 4, 5]);

    listeners.forEach(li => expect(li).toHaveBeenCalledTimes(1));
  });
});
