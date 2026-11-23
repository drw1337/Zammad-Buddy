/**
 * Buddy for Zammad – Curated emoji catalog for support replies.
 *
 * Each entry carries English and German search keywords so the picker can be
 * filtered in both UI languages.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const editor = (ns.editor = ns.editor || {});
  const isNode = typeof module !== 'undefined' && module.exports;

  const EMOJI_CATALOG = Object.freeze([
    Object.freeze({ ch: '😊', kw: 'smile happy freundlich lächeln danke' }),
    Object.freeze({ ch: '👍', kw: 'thumbs up daumen gut ok ja super' }),
    Object.freeze({ ch: '🙏', kw: 'thanks please danke bitte' }),
    Object.freeze({ ch: '👋', kw: 'wave hi hello hallo winken gruß' }),
    Object.freeze({ ch: '🎉', kw: 'party celebrate fertig feier glückwunsch' }),
    Object.freeze({ ch: '🤝', kw: 'handshake deal partner handschlag vereinbarung' }),
    Object.freeze({ ch: '😉', kw: 'wink zwinkern' }),
    Object.freeze({ ch: '😄', kw: 'grin laugh lachen Freude' }),
    Object.freeze({ ch: '✅', kw: 'check done ok erledigt haken grün ja' }),
    Object.freeze({ ch: '☑️', kw: 'check box haken auswahl' }),
    Object.freeze({ ch: '❌', kw: 'cross error no kreuz fehler nein abgelehnt' }),
    Object.freeze({ ch: '⚠️', kw: 'warning alert warnung achtung vorsicht' }),
    Object.freeze({ ch: 'ℹ️', kw: 'info information hinweis' }),
    Object.freeze({ ch: '❓', kw: 'question frage unklar' }),
    Object.freeze({ ch: '❗', kw: 'exclamation important wichtig dringend' }),
    Object.freeze({ ch: '⏳', kw: 'hourglass wait pending warten sanduhr' }),
    Object.freeze({ ch: '🔄', kw: 'reload sync update aktualisieren neu' }),
    Object.freeze({ ch: '🔍', kw: 'search lupe suche prüfen' }),
    Object.freeze({ ch: '📌', kw: 'pin wichtig anpinnen merken' }),
    Object.freeze({ ch: '📎', kw: 'attachment clip anhang datei' }),
    Object.freeze({ ch: '📧', kw: 'email mail nachricht brief' }),
    Object.freeze({ ch: '📞', kw: 'phone call telefon anruf rückruf' }),
    Object.freeze({ ch: '📅', kw: 'calendar date kalender termin datum' }),
    Object.freeze({ ch: '🕒', kw: 'clock time uhr zeit uhrzeit' }),
    Object.freeze({ ch: '🔒', kw: 'lock secure ssl schloss intern sicher' }),
    Object.freeze({ ch: '🔓', kw: 'unlock open offen entsperrt' }),
    Object.freeze({ ch: '🔑', kw: 'key password zugang schlüssel passwort' }),
    Object.freeze({ ch: '🛡️', kw: 'shield security firewall schutz sicherheit' }),
    Object.freeze({ ch: '⚙️', kw: 'gear settings config einstellung konfiguration' }),
    Object.freeze({ ch: '🛠️', kw: 'tools fix maintenance werkzeug wartung reparatur' }),
    Object.freeze({ ch: '🚀', kw: 'rocket launch deploy start live schnell' }),
    Object.freeze({ ch: '💡', kw: 'bulb idea tip idee tipp lösung' }),
    Object.freeze({ ch: '📝', kw: 'memo note notiz dokument protokoll' }),
    Object.freeze({ ch: '📂', kw: 'folder directory ordner verzeichnis' }),
    Object.freeze({ ch: '🖥️', kw: 'server desktop computer monitor system' }),
    Object.freeze({ ch: '🌐', kw: 'globe web domain dns internet' }),
    Object.freeze({ ch: '➡️', kw: 'arrow right pfeil rechts weiter' }),
    Object.freeze({ ch: '⬅️', kw: 'arrow left pfeil links zurück' }),
    Object.freeze({ ch: '⬆️', kw: 'arrow up pfeil oben hoch' }),
    Object.freeze({ ch: '⬇️', kw: 'arrow down pfeil unten runter' }),
    Object.freeze({ ch: '☕', kw: 'coffee break kaffee pause' }),
    Object.freeze({ ch: '🔥', kw: 'fire hot urgent feuer brennt dringend' }),
    Object.freeze({ ch: '👀', kw: 'eyes look schauen prüfen blick' }),
    Object.freeze({ ch: '❤️', kw: 'heart love herz danke' }),
    Object.freeze({ ch: '👏', kw: 'clap bravo applaus klasse' }),
    Object.freeze({ ch: '🤔', kw: 'thinking hmm überlegen nachdenken' }),
    Object.freeze({ ch: '😅', kw: 'sweat smile puh erleichtert' }),
    Object.freeze({ ch: '✨', kw: 'sparkles neu glanz highlight' }),
  ]);

  /**
   * Returns catalog entries matching the query (keyword substring or exact emoji).
   * @param {string} query
   */
  function filterEmojis(query) {
    const q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q) return EMOJI_CATALOG.slice();
    return EMOJI_CATALOG.filter((item) => item.kw.includes(q) || item.ch === q);
  }

  const api = { EMOJI_CATALOG, filterEmojis };

  editor.emojiCatalog = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
