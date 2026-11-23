/**
 * Buddy for Zammad – English (default) texts.
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

  locales.en = Object.freeze({
    // Popup Header & Navigation
    appTitle: 'Buddy for Zammad',
    authorCredit: 'by drw1337',
    bmcTitle: 'Support drw1337 on Buy Me a Coffee',
    authorLinkTitle: 'Source code & issues on GitHub',

    tabSearch: 'Search',
    tabSettings: 'Settings',
    tabInstances: 'Instances',

    // Popup: instance connection
    currentTabConnected: 'Active on {host}',
    currentTabReadyToConnect: 'Current tab: {host}',
    currentTabUnsupported: 'Open your Zammad tab or add a URL under Instances',
    connectCurrentBtn: 'Connect {host}',
    connectedBadge: 'Connected',
    pausedBadge: 'Paused',
    permissionMissingBadge: 'Permission needed',
    grantPermissionBtn: 'Grant access',

    instancesHeading: 'Zammad instances',
    instancesEmpty: 'No instance connected yet. Add your Zammad URL to enable Buddy for Zammad.',
    instanceInputPlaceholder: 'https://support.example.com',
    addInstanceBtn: 'Add',
    removeInstanceTitle: 'Disconnect instance',
    toggleInstanceTitle: 'Enable or pause on this instance',

    errEmptyUrl: 'Enter a Zammad URL first (for example https://tickets.example.com).',
    errInvalidUrl: 'Enter a valid http:// or https:// address.',
    errPermissionDenied: 'Browser access for {host} was declined.',

    // In-page advanced ticket search
    inPageSearchTriggerLabel: 'Advanced search',
    inPageSearchBtnTitle: 'Buddy for Zammad: Open advanced ticket search',
    inPageSearchHeading: 'Advanced Ticket Search',

    searchSavedLabel: 'Saved:',
    searchDeletePreset: 'Delete saved search',
    searchTextLabel: 'Search terms',
    searchTextPlaceholder: 'Keywords or "exact phrase"…',
    scopeAll: 'Everywhere',
    scopeTitle: 'Subject only',
    scopeBody: 'Message text',

    searchCustomerLabel: 'Customer / Email / @Domain',
    searchCustomerPlaceholder: 'Name, email or @example.com',
    searchOrgLabel: 'Organization',
    searchOrgPlaceholder: 'Company name',

    searchDateLabel: 'Timeframe',
    dateFieldActivity: 'Last activity',
    dateFieldCreated: 'Created',
    dateFieldClosed: 'Closed',
    dateFieldCustomer: 'Last customer contact',
    dateFieldAgent: 'Last agent contact',

    dateAny: 'Any time',
    dateToday: 'Today',
    dateYesterday: 'Yesterday',
    dateThisWeek: 'This week',
    dateLastWeek: 'Last week',
    dateLast30d: 'Last 30 days',
    dateCustom: 'From – to…',
    dateLast7d: 'Last 7 days',
    dateThisMonth: 'This month',
    dateLastMonth: 'Last month',
    dateFieldPrefix: 'Based on',
    dateGroupDays: 'Relative',
    dateGroupCalendar: 'Calendar',
    dateFromLabel: 'From',
    dateToLabel: 'To',
    moveHint: 'Drag to move · double-click to reset',
    resetPositionTitle: 'Reset position',
    searchHistoryTitle: 'Recent searches',
    searchHistoryEmpty: 'No searches yet.',
    searchHistoryClear: 'Clear history',

    searchStateLabel: 'Ticket status',
    stateAny: 'All',
    stateOpenAll: 'All open',
    stateNew: 'New',
    stateOpen: 'Open',
    statePending: 'Pending',
    stateClosed: 'Closed',

    searchMoreFilters: 'More filters (CC/From, Owner, Group, #No., Exclude)',
    searchMoreActiveBadge: '{count} active',

    searchMailLabel: 'Email header (From / To / CC)',
    searchMailPlaceholder: 'address@domain.com',
    mailDirAny: 'Any',
    mailDirFrom: 'From',
    mailDirTo: 'To',
    mailDirCc: 'CC',

    searchAgentLabel: 'Owner / Agent',
    searchAgentPlaceholder: 'Agent name or email',
    agentModeOwner: 'Owner',
    agentModeInvolved: 'Wrote',

    searchTicketNumLabel: 'Ticket number',
    searchTicketNumPlaceholder: 'e.g. 42019',
    searchGroupLabel: 'Group / Queue',
    searchGroupPlaceholder: 'Group name',
    searchTagsLabel: 'Tag',
    searchTagsPlaceholder: 'e.g. vip',
    searchExcludeLabel: 'Exclude words',
    searchExcludePlaceholder: 'e.g. Autoresponder "Out of Office"',

    searchQueryPreviewLabel: 'Zammad query',
    searchToggleSyntax: 'Query syntax',
    searchQueryPlaceholder: 'Choose filters above or enter Zammad syntax…',
    searchCopyBtn: 'Copy',
    searchCopiedBtn: 'Copied',
    searchResetBtn: 'Reset',
    searchSaveFavBtn: 'Save preset',
    searchFavNamePlaceholder: 'Preset name (e.g. Open VIP)',
    searchFavConfirmBtn: 'Save',
    searchRunBtn: 'Search',

    // Popup: settings
    wysiwygHeading: 'Editor & Search',
    settingWysiwygTitle: 'Formatting toolbar',
    settingWysiwygDesc: 'Rich-text bar, sub-lists, code languages, emojis, highlights & preview',
    settingWysiwygExpandedTitle: 'Keep toolbar expanded',
    settingWysiwygExpandedDesc: 'Show formatting buttons open above the editor by default',
    settingInPageSearchTitle: 'Advanced search button in Zammad',
    settingInPageSearchDesc: 'Shows the ticket search assistant under Zammad’s top-left search bar',

    settingsHeading: 'Format Guard',
    settingEnabledTitle: 'Enable Format Guard',
    settingEnabledDesc: 'Monitors Zammad reply and note editors for hidden styles',
    settingAutoCleanTitle: 'Clean formatting on paste',
    settingAutoCleanDesc: 'Strips foreign colors & fonts on Ctrl+V; keeps bold, links & lists',
    settingXrayTitle: 'Highlight hidden styles',
    settingXrayDesc: 'Outlines invisible inline colors and font styles inside the editor',
    settingQuotesTitle: 'Ignore quoted replies',
    settingQuotesDesc: 'Leaves indented <blockquote> sections untouched',
    signatureNote: 'Zammad signatures remain protected automatically.',
    statsCleaned: '{count} messy pastes cleaned',
    statsZero: 'Ready for clean replies',

    // Format Guard bar in the editor
    barClean: 'Formatting clean',
    barCleanHint: 'No hidden colors or foreign font styles in your text (signature stays protected).',
    barWarningOne: '1 hidden style ({cats})',
    barWarningMany: '{count} hidden styles ({cats})',
    barWarningHint: '{label} — invisible in Zammad dark mode, but sent in customer emails.',
    barSwatchTitle: 'Detected color: {color}',
    barCleanBtn: 'Clean formatting',
    barCleanBtnTitle: 'Removes hidden colors, backgrounds and fonts (keeps bold, links & signature)',
    barAutoOn: 'Auto-clean: On',
    barAutoOnTitle: 'Hidden colors and fonts are removed on paste. Click to paste original formatting once.',
    barAutoOff: 'Auto-clean: Off',
    barAutoOffTitle: 'Automatic paste cleanup is turned off. Click to turn it back on.',
    barBypassOnce: 'Paste original 1×',
    barBypassOnceTitle: 'Your next paste will keep all original colors and styles. Click to cancel.',
    toastCleanedOne: '1 hidden style removed',
    toastCleanedMany: '{count} hidden styles removed',
    toastPasteCleaned: 'Pasted text cleaned ({cats} removed)',
    toastPasteCleanedSimple: 'Pasted text cleaned',

    // Format categories
    cat_color: 'text color',
    cat_background: 'background',
    cat_fontFamily: 'font family',
    cat_fontSize: 'font size',
    cat_heading: 'heading',
    cat_office: 'Word/Outlook style',
    cat_fontTag: 'legacy font tag',

    // Toolbar toggle and context badge
    barToggleWysiwyg: 'Aa',
    barToggleWysiwygShowTitle: 'Show formatting toolbar',
    barToggleWysiwygHideTitle: 'Hide formatting toolbar',
    wysiwygShowBarBtn: 'Aa Formatting toolbar',
    wysiwygHideBarTitle: 'Collapse formatting toolbar',

    ctxPublicReply: 'Public',
    ctxPublicReplyHint:
      'Public customer message — text highlights are disabled to keep outgoing emails clean.',
    ctxInternalNote: 'Internal',
    ctxInternalNoteHint: 'Internal team note — highlight markers are available.',

    // Toolbar commands
    cmdBold: 'Bold (Ctrl+B)',
    cmdItalic: 'Italic (Ctrl+I)',
    cmdUnderline: 'Underline (Ctrl+U)',
    cmdStrike: 'Strikethrough',
    cmdUl: 'Bulleted list',
    cmdOl: 'Numbered list',
    cmdIndent: 'Indent / Sub-list item (Tab)',
    cmdOutdent: 'Outdent / Higher list level (Shift+Tab)',
    cmdQuote: 'Quote block',
    cmdHr: 'Horizontal divider',
    cmdCode: 'Inline code (Ctrl+Shift+C)',
    cmdCodeBlock: 'Insert code snippet (with language)',
    cmdLink: 'Insert or edit link (Ctrl+K)',
    cmdTable: 'Insert table',
    cmdEmoji: 'Insert emoji',
    cmdHighlight: 'Highlight text (internal notes)',
    cmdHighlightDisabled:
      'Text highlights are only available in internal notes (keeps customer emails clean)',
    cmdClearFormat: 'Clear selection formatting',
    cmdPreview: 'Preview',
    cmdPreviewTitle: 'Preview outgoing message on a light email background',
    cmdPreviewActiveTitle: 'Close preview and return to editor (Esc)',

    // Popover frame (titles)
    popTitleCode: 'Insert code block',
    popTitleLink: 'Link',
    popTitleTable: 'Insert table',
    popTitleEmoji: 'Insert emoji',
    popTitleHighlight: 'Highlight marker',
    popCloseTitle: 'Close (Esc)',

    // Code block popover
    codeLangLabel: 'Language',
    codeInputPlaceholder: 'Paste or type code / command / log output…',
    codeInsertBtn: 'Insert code',

    // Emoji-Popover
    emojiSearchPlaceholder: 'Filter emojis (e.g. check, mail, thumbs)…',
    emojiRecentLabel: 'Recently used',
    emojiAllLabel: 'Support & Mail Emojis',

    // Link-Popover
    linkUrlLabel: 'URL or email',
    linkUrlPlaceholder: 'https://example.com or mailto:…',
    linkTextLabel: 'Display text (optional)',
    linkTextPlaceholder: 'Link text',
    linkApplyBtn: 'Apply',
    linkRemoveBtn: 'Unlink',
    linkCancelBtn: 'Cancel',
    linkInvalidErr: 'Enter a valid https://, http://, mailto: or tel: address.',

    // Table popover
    tablePickPrompt: 'Select table size',
    tableDimensions: '{rows} × {cols} table',
    tableHeaderToggle: 'Include header row',
    tableDefaultCol: 'Column {n}',

    // Highlight marker popover (internal notes)
    hlYellow: 'Yellow (Info)',
    hlGreen: 'Green (OK)',
    hlBlue: 'Blue (Note)',
    hlRed: 'Red (Important)',
    hlRemove: 'Remove highlight',

    // In-place email preview
    previewBannerPublic: 'Customer email preview — light background with actual outgoing colors',
    previewBannerInternal: 'Light-background note preview',
    previewEmpty: 'Nothing written yet.',
    previewCloseBtn: 'Back to editor (Esc)',
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = locales.en;
})(typeof globalThis !== 'undefined' ? globalThis : window);
