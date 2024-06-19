import { SelectedBases } from './SelectedBases';

class SVGElementMock {
  key = Math.random();
}

class NucleobaseMock {
  domNode = new SVGElementMock();
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
  }

  addEventListener(name, listener) {
    this.eventListeners[name].push(listener);
  }
}

describe('SelectedBases class', () => {
  it('is iterable', () => {
    let targetDrawing = new DrawingMock();

    let bases = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => new NucleobaseMock());
    targetDrawing.bases = bases;

    let selectedSVGElements = new LiveSetMock();
    selectedSVGElements.addAll([bases[2].domNode, bases[6].domNode, new SVGElementMock(), bases[3].domNode, new SVGElementMock()]);

    let selectedBases = new SelectedBases(targetDrawing, selectedSVGElements);

    // only includes the selected bases
    expect([...selectedBases].length).toBe(3);
    expect([...selectedBases].includes(bases[2])).toBeTruthy();
    expect([...selectedBases].includes(bases[6])).toBeTruthy();
    expect([...selectedBases].includes(bases[3])).toBeTruthy();
  });

  test('include method', () => {
    let targetDrawing = new DrawingMock();

    let bases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new NucleobaseMock());
    targetDrawing.bases = bases;

    let selectedSVGElements = new LiveSetMock();
    selectedSVGElements.addAll([new SVGElementMock(), bases[5].domNode, bases[1].domNode, new SVGElementMock(), new SVGElementMock()]);

    let selectedBases = new SelectedBases(targetDrawing, selectedSVGElements);

    expect(selectedBases.include(bases[1])).toBe(true);
    expect(selectedBases.include(bases[5])).toBe(true);

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

  it('supports change event listeners', () => {
    let targetDrawing = new DrawingMock();
    let selectedSVGElements = new LiveSetMock();

    let selectedBases = new SelectedBases(targetDrawing, selectedSVGElements);

    let listener = jest.fn();
    expect(selectedSVGElements.eventListeners['change'].includes(listener)).toBeFalsy();

    selectedBases.addEventListener('change', listener);
    expect(selectedSVGElements.eventListeners['change'].includes(listener)).toBeTruthy();
  });
});
