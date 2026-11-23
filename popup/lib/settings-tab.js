/**
 * Buddy for Zammad – Settings tab of the popup.
 *
 * Every toggle is declared in the HTML: `data-setting="<key>"` binds a checkbox
 * to a setting, `data-invert` stores the negated value, and
 * `data-depends-on="<key>"` dims a group while its master switch is off.
 * All boolean settings default to `true`.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const popup = (ns.popup = ns.popup || {});

  /** Checkbox state for a setting value (undefined counts as the default). */
  function isChecked(settings, input) {
    const value = settings[input.dataset.setting];
    return input.hasAttribute('data-invert') ? value !== true : value !== false;
  }

  /**
   * @param {Document} doc
   * @param {{ getSettings: () => object, save: (patch: object) => Promise<void> }} app
   */
  function createSettingsTab(doc, app) {
    const toggles = Array.from(doc.querySelectorAll('input[data-setting]'));
    const dependents = Array.from(doc.querySelectorAll('[data-depends-on]'));

    for (const input of toggles) {
      input.addEventListener('change', () => {
        const value = input.hasAttribute('data-invert') ? !input.checked : input.checked;
        app.save({ [input.dataset.setting]: value });
      });
    }

    function render() {
      const settings = app.getSettings();
      for (const input of toggles) input.checked = isChecked(settings, input);
      for (const group of dependents) {
        const enabled = settings[group.dataset.dependsOn] !== false;
        group.classList.toggle('is-disabled', !enabled);
        for (const input of group.querySelectorAll('input')) input.disabled = !enabled;
      }
    }

    return { render };
  }

  popup.createSettingsTab = createSettingsTab;
})(typeof globalThis !== 'undefined' ? globalThis : window);
