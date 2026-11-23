/**
 * Buddy for Zammad – German texts.
 *
 * Keys must exist in every locale (checked by test/i18n.test.js). `{name}`
 * placeholders are filled by `ZammadBuddy.i18n.t(lang, key, params)`.
 *
 * Author: drw1337
 */
(function (root) {
  'use strict';

  const ns = (root.ZammadBuddy = root.ZammadBuddy || {});
  const locales = (ns.locales = ns.locales || {});

  locales.de = Object.freeze({
    // Popup Header & Navigation
    appTitle: 'Buddy for Zammad',
    authorCredit: 'von drw1337',
    bmcTitle: 'drw1337 auf Buy Me a Coffee unterstützen',
    authorLinkTitle: 'Quellcode & Issues auf GitHub',

    tabSearch: 'Suche',
    tabSettings: 'Einstellungen',
    tabInstances: 'Instanzen',

    // Popup: instance connection
    currentTabConnected: 'Aktiv auf {host}',
    currentTabReadyToConnect: 'Aktueller Tab: {host}',
    currentTabUnsupported: 'Zammad-Tab öffnen oder URL unter „Instanzen“ eintragen',
    connectCurrentBtn: '{host} verbinden',
    connectedBadge: 'Verbunden',
    pausedBadge: 'Pausiert',
    permissionMissingBadge: 'Zugriff fehlt',
    grantPermissionBtn: 'Erlauben',

    instancesHeading: 'Zammad-Instanzen',
    instancesEmpty:
      'Noch keine Instanz verbunden. Trage deine Zammad-URL ein, um Buddy for Zammad zu aktivieren.',
    instanceInputPlaceholder: 'https://support.beispiel.de',
    addInstanceBtn: 'Hinzufügen',
    removeInstanceTitle: 'Instanz trennen',
    toggleInstanceTitle: 'Auf dieser Instanz aktivieren oder pausieren',

    errEmptyUrl: 'Bitte gib zuerst eine Zammad-URL ein (z. B. https://tickets.example.com).',
    errInvalidUrl: 'Bitte eine gültige http:// oder https:// Adresse eingeben.',
    errPermissionDenied: 'Browser-Freigabe für {host} wurde abgelehnt.',

    // In-page advanced ticket search
    inPageSearchTriggerLabel: 'Erweiterte Suche',
    inPageSearchBtnTitle: 'Buddy for Zammad: Erweiterte Ticketsuche öffnen',
    inPageSearchHeading: 'Erweiterte Ticketsuche',

    searchSavedLabel: 'Gespeichert:',
    searchDeletePreset: 'Gespeicherte Suche löschen',
    searchTextLabel: 'Suchbegriff',
    searchTextPlaceholder: 'Stichwörter oder "exakte Phrase"…',
    scopeAll: 'Überall',
    scopeTitle: 'Nur Betreff',
    scopeBody: 'Nachrichtentext',

    searchCustomerLabel: 'Kunde / E-Mail / @Domain',
    searchCustomerPlaceholder: 'Name, E-Mail oder @example.com',
    searchOrgLabel: 'Organisation',
    searchOrgPlaceholder: 'Firmenname',

    searchDateLabel: 'Zeitraum',
    dateFieldActivity: 'Letzte Aktivität',
    dateFieldCreated: 'Erstellt',
    dateFieldClosed: 'Geschlossen',
    dateFieldCustomer: 'Letzter Kundenkontakt',
    dateFieldAgent: 'Letzter Agentenkontakt',

    dateAny: 'Jederzeit',
    dateToday: 'Heute',
    dateYesterday: 'Gestern',
    dateThisWeek: 'Diese Woche',
    dateLastWeek: 'Letzte Woche',
    dateLast30d: 'Letzte 30 Tage',
    dateCustom: 'Von – Bis…',
    dateLast7d: 'Letzte 7 Tage',
    dateThisMonth: 'Dieser Monat',
    dateLastMonth: 'Letzter Monat',
    dateFieldPrefix: 'Bezogen auf',
    dateGroupDays: 'Relativ',
    dateGroupCalendar: 'Kalender',
    dateFromLabel: 'Von',
    dateToLabel: 'Bis',
    moveHint: 'Ziehen zum Verschieben · Doppelklick setzt zurück',
    resetPositionTitle: 'Position zurücksetzen',
    searchHistoryTitle: 'Letzte Suchen',
    searchHistoryEmpty: 'Noch keine Suchen.',
    searchHistoryClear: 'Verlauf löschen',

    searchStateLabel: 'Ticket-Status',
    stateAny: 'Alle',
    stateOpenAll: 'Alle offenen',
    stateNew: 'Neu',
    stateOpen: 'Offen',
    statePending: 'Wartend',
    stateClosed: 'Geschlossen',

    searchMoreFilters: 'Weitere Filter (CC/Von, Besitzer, Gruppe, #Nr., Ohne Wort)',
    searchMoreActiveBadge: '{count} aktiv',

    searchMailLabel: 'E-Mail-Header (Von / An / CC)',
    searchMailPlaceholder: 'adresse@domain.de',
    mailDirAny: 'Egal',
    mailDirFrom: 'Von',
    mailDirTo: 'An',
    mailDirCc: 'CC',

    searchAgentLabel: 'Besitzer / Bearbeiter',
    searchAgentPlaceholder: 'Name oder E-Mail',
    agentModeOwner: 'Besitzer',
    agentModeInvolved: 'Beteiligt',

    searchTicketNumLabel: 'Ticketnummer',
    searchTicketNumPlaceholder: 'z. B. 42019',
    searchGroupLabel: 'Gruppe / Queue',
    searchGroupPlaceholder: 'Gruppenname',
    searchTagsLabel: 'Tag / Schlagwort',
    searchTagsPlaceholder: 'z. B. vip',
    searchExcludeLabel: 'Wörter ausschließen',
    searchExcludePlaceholder: 'z. B. Autoresponder "Außer Haus"',

    searchQueryPreviewLabel: 'Zammad-Suchausdruck',
    searchToggleSyntax: 'Suchsyntax',
    searchQueryPlaceholder: 'Filter oben wählen oder Zammad-Syntax eingeben…',
    searchCopyBtn: 'Kopieren',
    searchCopiedBtn: 'Kopiert',
    searchResetBtn: 'Zurücksetzen',
    searchSaveFavBtn: 'Als Favorit merken',
    searchFavNamePlaceholder: 'Name (z. B. Offene VIPs)',
    searchFavConfirmBtn: 'Speichern',
    searchRunBtn: 'Suchen',

    // Popup: settings
    wysiwygHeading: 'Editor & Suche',
    settingWysiwygTitle: 'Formatierungsleiste anzeigen',
    settingWysiwygDesc: 'Werkzeugleiste für Text, Unterlisten, Code-Sprachen, Emojis, Marker & Vorschau',
    settingWysiwygExpandedTitle: 'Leiste ausgeklappt zeigen',
    settingWysiwygExpandedDesc: 'Hält die Werkzeuge über dem Editor standardmäßig geöffnet',
    settingInPageSearchTitle: 'Erweiterte Ticketsuche in Zammad',
    settingInPageSearchDesc: 'Zeigt den Suchassistenten dezent unter Zammads Suchleiste links oben',

    settingsHeading: 'Format-Schutz',
    settingEnabledTitle: 'Format-Schutz aktiv',
    settingEnabledDesc: 'Überwacht Antwort- und Notiz-Editoren auf versteckte Styles',
    settingAutoCleanTitle: 'Beim Einfügen bereinigen',
    settingAutoCleanDesc: 'Entfernt fremde Farben & Schriften bei Strg+V; behält Fett, Links & Listen',
    settingXrayTitle: 'Versteckte Styles markieren',
    settingXrayDesc: 'Rahmt unsichtbare Inline-Farben und Schriftformate im Editor ein',
    settingQuotesTitle: 'Zitate verschonen',
    settingQuotesDesc: 'Lässt eingerückte Vorgänger-Mails (<blockquote>) unangetastet',
    signatureNote: 'Zammad-Signaturen bleiben automatisch geschützt.',
    statsCleaned: '{count} unsaubere Einfügungen bereinigt',
    statsZero: 'Bereit für saubere Antworten',

    // Format Guard bar in the editor
    barClean: 'Formatierung sauber',
    barCleanHint: 'Keine versteckten Farben oder fremden Schriftarten im Text (Signatur bleibt geschützt).',
    barWarningOne: '1 versteckte Formatierung ({cats})',
    barWarningMany: '{count} versteckte Formatierungen ({cats})',
    barWarningHint: '{label} – im Zammad Dark Mode unsichtbar, wird aber in Kunden-Mails mitgesendet.',
    barSwatchTitle: 'Gefundene Farbe: {color}',
    barCleanBtn: 'Bereinigen',
    barCleanBtnTitle:
      'Entfernt versteckte Farben, Hintergründe und Schriftarten (Fett, Links & Signatur bleiben erhalten)',
    barAutoOn: 'Auto-Clean: Ein',
    barAutoOnTitle:
      'Versteckte Farben und Schriftarten werden beim Einfügen entfernt. Klicken für 1× Original-Einfügen.',
    barAutoOff: 'Auto-Clean: Aus',
    barAutoOffTitle: 'Automatisches Bereinigen beim Einfügen ist aus. Klicken zum Einschalten.',
    barBypassOnce: '1× Original aktiv',
    barBypassOnceTitle: 'Das nächste Einfügen behält alle Original-Farben/Styles. Klicken zum Abbrechen.',
    toastCleanedOne: '1 versteckte Formatierung bereinigt',
    toastCleanedMany: '{count} versteckte Formatierungen bereinigt',
    toastPasteCleaned: 'Eingefügter Text bereinigt ({cats} entfernt)',
    toastPasteCleanedSimple: 'Eingefügter Text bereinigt',

    // Format categories
    cat_color: 'Textfarbe',
    cat_background: 'Hintergrundfarbe',
    cat_fontFamily: 'Schriftart',
    cat_fontSize: 'Schriftgröße',
    cat_heading: 'Überschrift',
    cat_office: 'Word/Outlook-Format',
    cat_fontTag: 'Font-Tag',

    // Toolbar toggle and context badge
    barToggleWysiwyg: 'Aa',
    barToggleWysiwygShowTitle: 'Formatierungsleiste einblenden',
    barToggleWysiwygHideTitle: 'Formatierungsleiste ausblenden',
    wysiwygShowBarBtn: 'Aa Formatierungsleiste',
    wysiwygHideBarTitle: 'Formatierungsleiste einklappen',

    ctxPublicReply: 'Öffentlich',
    ctxPublicReplyHint:
      'Öffentliche Kunden-Nachricht – Textmarker sind gesperrt, damit ausgehende E-Mails sauber bleiben.',
    ctxInternalNote: 'Intern',
    ctxInternalNoteHint: 'Interne Team-Notiz – Textmarker sind freigeschaltet.',

    // Toolbar commands
    cmdBold: 'Fett (Strg+B)',
    cmdItalic: 'Kursiv (Strg+I)',
    cmdUnderline: 'Unterstrichen (Strg+U)',
    cmdStrike: 'Durchgestrichen',
    cmdUl: 'Aufzählungsliste',
    cmdOl: 'Nummerierte Liste',
    cmdIndent: 'Einrücken / Unterpunkt erstellen (Tab)',
    cmdOutdent: 'Ausrücken / Ebene höher (Umschalt+Tab)',
    cmdQuote: 'Zitatblock',
    cmdHr: 'Trennlinie einfügen',
    cmdCode: 'Inline-Code (Strg+Umschalt+C)',
    cmdCodeBlock: 'Code-Block einfügen (mit Programmiersprache)',
    cmdLink: 'Link einfügen oder bearbeiten (Strg+K)',
    cmdTable: 'Tabelle einfügen',
    cmdEmoji: 'Emoji einfügen',
    cmdHighlight: 'Textmarker (interne Notizen)',
    cmdHighlightDisabled: 'Textmarker sind nur in internen Notizen verfügbar (hält Kunden-E-Mails sauber)',
    cmdClearFormat: 'Formatierung der Auswahl entfernen',
    cmdPreview: 'Vorschau',
    cmdPreviewTitle: 'Ausgehende Nachricht auf hellem E-Mail-Hintergrund prüfen',
    cmdPreviewActiveTitle: 'Vorschau schließen und weiter bearbeiten (Esc)',

    // Popover frame (titles)
    popTitleCode: 'Code-Block einfügen',
    popTitleLink: 'Link',
    popTitleTable: 'Tabelle einfügen',
    popTitleEmoji: 'Emoji einfügen',
    popTitleHighlight: 'Textmarker',
    popCloseTitle: 'Schließen (Esc)',

    // Code block popover
    codeLangLabel: 'Sprache',
    codeInputPlaceholder: 'Code, Befehl oder Log-Ausgabe einfügen / eingeben…',
    codeInsertBtn: 'Code einfügen',

    // Emoji-Popover
    emojiSearchPlaceholder: 'Emoji suchen (z. B. haken, daumen, mail, uhr)…',
    emojiRecentLabel: 'Zuletzt verwendet',
    emojiAllLabel: 'Support- & E-Mail-Emojis',

    // Link-Popover
    linkUrlLabel: 'URL oder E-Mail',
    linkUrlPlaceholder: 'https://beispiel.de oder mailto:…',
    linkTextLabel: 'Anzeigetext (optional)',
    linkTextPlaceholder: 'Link-Beschriftung',
    linkApplyBtn: 'Übernehmen',
    linkRemoveBtn: 'Link lösen',
    linkCancelBtn: 'Abbrechen',
    linkInvalidErr: 'Bitte eine gültige https://, http://, mailto: oder tel: Adresse eingeben.',

    // Table popover
    tablePickPrompt: 'Tabellengröße wählen',
    tableDimensions: '{rows} × {cols} Tabelle',
    tableHeaderToggle: 'Mit Kopfzeile',
    tableDefaultCol: 'Spalte {n}',

    // Highlight marker popover (internal notes)
    hlYellow: 'Gelb (Info)',
    hlGreen: 'Grün (OK)',
    hlBlue: 'Blau (Hinweis)',
    hlRed: 'Rot (Wichtig)',
    hlRemove: 'Marker entfernen',

    // In-place email preview
    previewBannerPublic: 'Kunden-E-Mail-Vorschau – heller Hintergrund mit tatsächlichen ausgehenden Farben',
    previewBannerInternal: 'Vorschau auf hellem Hintergrund',
    previewEmpty: 'Noch kein Text eingegeben.',
    previewCloseBtn: 'Weiter bearbeiten (Esc)',
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = locales.de;
})(typeof globalThis !== 'undefined' ? globalThis : window);
