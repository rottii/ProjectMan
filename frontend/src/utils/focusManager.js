export function advanceFocus(direction = 1) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  const elements = Array.from(document.querySelectorAll(focusableSelectors))
    .filter(el => {
      // Check if visible
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
    });

  if (elements.length === 0) return;

  const activeElement = document.activeElement;
  let currentIndex = elements.indexOf(activeElement);

  if (currentIndex === -1) {
    elements[0].focus();
    return;
  }

  let nextIndex = currentIndex + direction;
  if (nextIndex >= elements.length) {
    nextIndex = 0;
  } else if (nextIndex < 0) {
    nextIndex = elements.length - 1;
  }

  elements[nextIndex].focus();
}
