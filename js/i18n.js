export const LANGUAGES = ['en', 'de', 'ru'];
export const DEFAULT_LANGUAGE = 'en';

let current = DEFAULT_LANGUAGE;
let observer = null;
let applying = false;
const originalText = new WeakMap();
const originalAttr = new WeakMap();

const TRANSLATED_ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-tooltip', 'data-i18n-text'];



const M = {
  'Ablage': { en: 'Files', ru: 'Файлы' },
  'Darstellung': { en: 'Appearance', ru: 'Оформление' },
  'Ablage · Lesezeichen': { en: 'Files · Bookmarks', ru: 'Файлы · Закладки' },
  'Darstellung · Einstellungen': { en: 'Appearance · Settings', ru: 'Оформление · Настройки' },
  'Ablage – Lesezeichen': { en: 'Files – Bookmarks', ru: 'Файлы – Закладки' },
  'Hush Suche': { en: 'Hush Search', ru: 'Поиск Hush' },
  'Desktop-Symbole': { en: 'Desktop icons', ru: 'Значки рабочего стола' },
  'HEUTE': { en: 'TODAY', ru: 'СЕГОДНЯ' },
  'Öffne die': { en: 'Open', ru: 'Откройте' },
  'und ziehe Lesezeichen oder Ordner hierher.': { en: 'and drag bookmarks or folders here.', ru: 'и перетащите сюда закладки или папки.' },
  'Hush': { en: 'Hush', ru: 'Hush' },
  'Schließen': { en: 'Close', ru: 'Закрыть' },
  'Bewegung & Glas': { en: 'Motion & Glass', ru: 'Движение и стекло' },
  'Animationen': { en: 'Animations', ru: 'Анимации' },
  'Ruhige, reduzierte Übergänge': { en: 'Calm, reduced transitions', ru: 'Спокойные, сдержанные переходы' },
  'Dock-Vergrößerung': { en: 'Dock magnification', ru: 'Увеличение дока' },
  'Dezente Bewegung, standardmäßig aus': { en: 'Subtle movement, off by default', ru: 'Лёгкое движение, по умолчанию выключено' },
  'Parallax-Hintergrund': { en: 'Parallax wallpaper', ru: 'Параллакс фона' },
  'Sehr leichte Bewegung': { en: 'Very subtle movement', ru: 'Очень лёгкое движение' },
  'Abdunklung': { en: 'Dimming', ru: 'Затемнение' },
  'Glas & Unschärfe': { en: 'Glass & blur', ru: 'Стекло и размытие' },
  'Dock': { en: 'Dock', ru: 'Док' },
  'Zuletzt besuchte Websites': { en: 'Recent websites', ru: 'Недавние сайты' },
  '8 Apps': { en: '8 apps', ru: '8 приложений' },
  'Hintergrund': { en: 'Wallpaper', ru: 'Фон' },
  'Eigenes Bild': { en: 'Custom image', ru: 'Своё изображение' },
  'Nachtgarten': { en: 'Night Garden', ru: 'Ночной сад' },
  'Desktop': { en: 'Desktop', ru: 'Рабочий стол' },
  'Anordnen': { en: 'Arrange', ru: 'Упорядочить' },
  'Leeren': { en: 'Clear', ru: 'Очистить' },
  'Einstellungen, Symbole und Pins bleiben lokal. Der Orbitron-Font ist eingebettet; Favicons kommen aus dem Browser-Cache bzw. direkt von offenen Tabs.': {
    en: 'Settings, icons and pins stay local. Fonts are bundled; favicons come from the browser cache or open tabs.',
    ru: 'Настройки, значки и закрепления остаются локальными. Шрифты встроены; значки сайтов берутся из кэша браузера или открытых вкладок.'
  },
  'Einstellungen, Symbole und Pins bleiben lokal. Alle Schriften sind eingebettet; Favicons kommen aus dem Browser-Cache bzw. direkt von offenen Tabs.': {
    en: 'Settings, icons and pins stay local. All fonts are bundled; favicons come from the browser cache or open tabs.',
    ru: 'Настройки, значки и закрепления остаются локальными. Все шрифты встроены; значки сайтов берутся из кэша браузера или открытых вкладок.'
  },
  'Lesezeichen, Websites und Befehle suchen …': { en: 'Search bookmarks, websites and commands …', ru: 'Поиск закладок, сайтов и команд …' },
  'Navigieren': { en: 'Navigate', ru: 'Навигация' },
  'Öffnen': { en: 'Open', ru: 'Открыть' },
  'Esc': { en: 'Esc', ru: 'Esc' },
  'Alle Lesezeichen': { en: 'All Bookmarks', ru: 'Все закладки' },
  'Lesezeichenleiste': { en: 'Bookmarks bar', ru: 'Панель закладок' },
  'Andere Lesezeichen': { en: 'Other bookmarks', ru: 'Другие закладки' },
  'Mobile Lesezeichen': { en: 'Mobile bookmarks', ru: 'Мобильные закладки' },
  'Zuletzt besucht': { en: 'Recent', ru: 'Недавние' },
  'Favoriten': { en: 'Favorites', ru: 'Избранное' },
  'Orte': { en: 'Locations', ru: 'Места' },
  'Befehle': { en: 'Commands', ru: 'Команды' },
  'Lesezeichen': { en: 'Bookmarks', ru: 'Закладки' },
  'Ordner': { en: 'Folder', ru: 'Папка' },
  'Website': { en: 'Website', ru: 'Сайт' },
  'App': { en: 'App', ru: 'Приложение' },
  'Objekt': { en: 'object', ru: 'объект' },
  'Objekte': { en: 'objects', ru: 'объектов' },
  'Keine Treffer': { en: 'No results', ru: 'Нет результатов' },
  'Noch nichts hier': { en: 'Nothing here yet', ru: 'Здесь пока пусто' },
  'Ziehe Lesezeichen aus einem Ordner hierher oder lege sie auf dem Desktop ab.': { en: 'Drag bookmarks from a folder here or place them on the desktop.', ru: 'Перетащите закладки из папки сюда или поместите их на рабочий стол.' },
  'Keine Treffer. Versuche einen anderen Begriff.': { en: 'No results. Try another term.', ru: 'Нет результатов. Попробуйте другой запрос.' },
  'Suchergebnisse · Ziehen zum Ablegen': { en: 'Search results · Drag to place', ru: 'Результаты поиска · Перетащите, чтобы добавить' },
  'Doppelklick öffnen · Ziehen zum Ablegen': { en: 'Double-click to open · Drag to place', ru: 'Двойной клик — открыть · Перетащите, чтобы добавить' },
  '· 1 ausgewählt': { en: '· 1 selected', ru: '· 1 выбрано' },
  ' · 1 ausgewählt': { en: ' · 1 selected', ru: ' · 1 выбрано' },
  'öffnen': { en: 'open', ru: 'открыть' },
  'öffnen oder ziehen': { en: 'open or drag', ru: 'открыть или перетащить' },
  'Zurück': { en: 'Back', ru: 'Назад' },
  'Vorwärts': { en: 'Forward', ru: 'Вперёд' },
  'Symbole': { en: 'Icons', ru: 'Значки' },
  'Liste': { en: 'List', ru: 'Список' },
  'Symbolansicht': { en: 'Icon view', ru: 'Значки' },
  'Listenansicht': { en: 'List view', ru: 'Список' },
  'In Lesezeichen suchen': { en: 'Search bookmarks', ru: 'Поиск в закладках' },
  'Aktualisieren': { en: 'Refresh', ru: 'Обновить' },
  'Minimieren': { en: 'Minimize', ru: 'Свернуть' },
  'Maximieren': { en: 'Maximize', ru: 'Развернуть' },
  'Lesezeichen & Verlauf aktualisiert': { en: 'Bookmarks & history refreshed', ru: 'Закладки и история обновлены' },
  'Ordner öffnen': { en: 'Open folder', ru: 'Открыть папку' },
  'In neuem Tab öffnen': { en: 'Open in new tab', ru: 'Открыть в новой вкладке' },
  'Im Hintergrund öffnen': { en: 'Open in background', ru: 'Открыть в фоне' },
  'Auf Desktop legen': { en: 'Place on Desktop', ru: 'Поместить на рабочий стол' },
  'Im Dock anheften': { en: 'Pin to Dock', ru: 'Закрепить в доке' },
  'In Ablage zeigen': { en: 'Reveal in Files', ru: 'Показать в Файлах' },
  'Verknüpfung entfernen': { en: 'Remove shortcut', ru: 'Удалить ярлык' },
  'Adresse kopieren': { en: 'Copy address', ru: 'Копировать адрес' },
  'Adresse kopiert': { en: 'Address copied', ru: 'Адрес скопирован' },
  'Vom Desktop entfernen': { en: 'Remove from Desktop', ru: 'Удалить с рабочего стола' },
  'Nicht mehr anheften': { en: 'Unpin', ru: 'Открепить' },
  'Ablage öffnen': { en: 'Open Files', ru: 'Открыть Файлы' },
  'Suche öffnen': { en: 'Open Search', ru: 'Открыть поиск' },
  'Such-Shortcut': { en: 'Search shortcut', ru: 'Горячая клавиша поиска' },
  'Such-Shortcut ändern': { en: 'Change search shortcut', ru: 'Изменить горячую клавишу поиска' },
  'Leertaste': { en: 'Space', ru: 'Пробел' },
  'Leertaste öffnet die Suche': { en: 'Space opens search', ru: 'Пробел открывает поиск' },
  'öffnet die Suche': { en: 'opens search', ru: 'открывает поиск' },
  'Taste drücken …': { en: 'Press a key …', ru: 'Нажмите клавишу …' },
  'Esc bricht ab': { en: 'Esc cancels', ru: 'Esc отменяет' },
  'Windows 10 links, Windows 11 zentriert': { en: 'Windows 10 left, Windows 11 centered', ru: 'Windows 10 слева, Windows 11 по центру' },
  'Lokale Vorschau': { en: 'Local preview', ru: 'Локальный предпросмотр' },
  'https://': { en: 'https://', ru: 'https://' },
  'Symbole anordnen': { en: 'Arrange icons', ru: 'Упорядочить значки' },
  'Hintergrundbild ändern …': { en: 'Change wallpaper …', ru: 'Сменить фон …' },
  'Darstellung …': { en: 'Appearance …', ru: 'Оформление …' },
  'Desktop leeren': { en: 'Clear Desktop', ru: 'Очистить рабочий стол' },
  'Darstellung öffnen': { en: 'Open Appearance', ru: 'Открыть оформление' },
  'Alle Lesezeichen und Ordner durchsuchen': { en: 'Browse all bookmarks and folders', ru: 'Просмотреть все закладки и папки' },
  'Glas, Bewegung, Hintergrund und Dock': { en: 'Glass, motion, wallpaper and Dock', ru: 'Стекло, движение, фон и док' },
  'Einstellungen': { en: 'Settings', ru: 'Настройки' },
  'Hintergrundbild ändern': { en: 'Change wallpaper', ru: 'Сменить фон' },
  'Eigenes Bild auswählen': { en: 'Choose your own image', ru: 'Выбрать своё изображение' },
  'Bild': { en: 'Image', ru: 'Изображение' },
  'Desktop-Symbole anordnen': { en: 'Arrange desktop icons', ru: 'Упорядочить значки рабочего стола' },
  'Symbole wieder im Raster ausrichten': { en: 'Snap icons back to grid', ru: 'Выровнять значки по сетке' },
  'Ordnen': { en: 'Arrange', ru: 'Упорядочить' },
  'Lesezeichen aktualisieren': { en: 'Refresh bookmarks', ru: 'Обновить закладки' },
  'Bookmarks und Verlauf neu laden': { en: 'Reload bookmarks and history', ru: 'Перезагрузить закладки и историю' },
  'Laden': { en: 'Load', ru: 'Загрузить' },
  'Verschieben': { en: 'Move', ru: 'Переместить' },
  'Sanft ablegen': { en: 'Drop gently', ru: 'Аккуратно отпустите' },
  'Bereits vorhanden': { en: 'Already there', ru: 'Уже есть' },
  'Verknüpfung ablegen': { en: 'Place shortcut', ru: 'Поместить ярлык' },
  'Zum Ablegen auf Desktop, Dock oder Entfernen ziehen': { en: 'Drag to Desktop, Dock or Remove to drop', ru: 'Перетащите на рабочий стол, док или «Удалить»' },
  'Im Dock angeheftet': { en: 'Pinned to Dock', ru: 'Закреплено в доке' },
  'Liegt schon auf dem Desktop': { en: 'Already on the Desktop', ru: 'Уже на рабочем столе' },
  'Vom Desktop entfernt': { en: 'Removed from Desktop', ru: 'Удалено с рабочего стола' },
  'Ist bereits im Dock angeheftet': { en: 'Already pinned to Dock', ru: 'Уже закреплено в доке' },
  'Nicht mehr angeheftet': { en: 'Unpinned', ru: 'Откреплено' },
  'Keine Verknüpfung vorhanden': { en: 'No shortcut to remove', ru: 'Нет ярлыка для удаления' },
  'Verknüpfung entfernt': { en: 'Shortcut removed', ru: 'Ярлык удалён' },
  'Symbole angeordnet': { en: 'Icons arranged', ru: 'Значки упорядочены' },
  'Der Desktop ist bereits leer': { en: 'The Desktop is already empty', ru: 'Рабочий стол уже пуст' },
  'Desktop geleert': { en: 'Desktop cleared', ru: 'Рабочий стол очищен' },
  'Rückgängig': { en: 'Undo', ru: 'Отменить' },
  'Diese Adresse kann nicht geöffnet werden.': { en: 'This address cannot be opened.', ru: 'Этот адрес нельзя открыть.' },
  'Konnte die Seite nicht öffnen.': { en: 'Could not open the page.', ru: 'Не удалось открыть страницу.' },
  'Diese Adresse kann aus Sicherheitsgründen nicht geöffnet werden.': { en: 'This address cannot be opened for security reasons.', ru: 'Этот адрес нельзя открыть по соображениям безопасности.' },
  'Bitte eine Bilddatei auswählen.': { en: 'Please choose an image file.', ru: 'Выберите файл изображения.' },
  'Neues Hintergrundbild gespeichert': { en: 'New wallpaper saved', ru: 'Новый фон сохранён' },
  'Das Bild konnte nicht gelesen werden.': { en: 'The image could not be read.', ru: 'Не удалось прочитать изображение.' },
  'Nachtgarten-Wallpaper wiederhergestellt': { en: 'Night Garden wallpaper restored', ru: 'Фон «Ночной сад» восстановлен' },
  'Bild konnte nicht geladen werden.': { en: 'Image could not be loaded.', ru: 'Не удалось загрузить изображение.' },
  'Lesefehler': { en: 'Read error', ru: 'Ошибка чтения' },
  'Hush: Aktualisierung fehlgeschlagen.': { en: 'Hush: Refresh failed.', ru: 'Hush: не удалось обновить.' },
  'Hush: Einstellungen konnten nicht gespeichert werden.': { en: 'Hush: Settings could not be saved.', ru: 'Hush: не удалось сохранить настройки.' },
  'Hush Desktop konnte nicht starten:': { en: 'Hush Desktop could not start:', ru: 'Hush Desktop не запустился:' },
  'Hush Desktop konnte nicht vollständig starten.': { en: 'Hush Desktop could not start completely.', ru: 'Hush Desktop запустился не полностью.' },
  'Webseite': { en: 'Website', ru: 'Сайт' },
  'Ohne Titel': { en: 'Untitled', ru: 'Без названия' },
  'gerade eben': { en: 'just now', ru: 'только что' },
  'Suche nach „?“': { en: 'Search', ru: 'Поиск' },

  
  'Sprache & Uhr': { en: 'Language & Clock', ru: 'Язык и часы' },
  'Sprache': { en: 'Language', ru: 'Язык' },
  'Sprache der Oberfläche': { en: 'Interface language', ru: 'Язык интерфейса' },
  'Englisch': { en: 'English', ru: 'Английский' },
  'Deutsch': { en: 'German', ru: 'Немецкий' },
  'Russisch': { en: 'Russian', ru: 'Русский' },
  'Uhr': { en: 'Clock', ru: 'Часы' },
  'Sekunden anzeigen': { en: 'Show seconds', ru: 'Показывать секунды' },
  'Zeit mit HH:MM:SS anzeigen': { en: 'Show time as HH:MM:SS', ru: 'Показывать время как ЧЧ:ММ:СС' },
  'Schrift': { en: 'Font', ru: 'Шрифт' },
  'Schriftart der Uhr': { en: 'Clock font', ru: 'Шрифт часов' },
  'Eigene Schriftdatei': { en: 'Custom font file', ru: 'Свой файл шрифта' },
  'Eigene Schriftdatei (lokal, .woff2/.ttf)': { en: 'Custom font file (local, .woff2/.ttf)', ru: 'Свой файл шрифта (локально, .woff2/.ttf)' },
  'Datei auswählen': { en: 'Choose file', ru: 'Выбрать файл' },
  'Keine Datei ausgewählt': { en: 'No file chosen', ru: 'Файл не выбран' },
  'Bitte eine .woff2- oder .ttf-Datei auswählen.': { en: 'Please choose a .woff2 or .ttf file.', ru: 'Выберите файл .woff2 или .ttf.' },
  'Schriftdatei gespeichert': { en: 'Font file saved', ru: 'Файл шрифта сохранён' },
  'Eigene Schrift aktiv': { en: 'Custom font active', ru: 'Пользовательский шрифт активен' },
  'Schriftdatei konnte nicht gelesen werden.': { en: 'The font file could not be read.', ru: 'Не удалось прочитать файл шрифта.' },
  'Display Editor öffnen': { en: 'Open Display Editor', ru: 'Открыть редактор экрана' },
  'Dock und Uhr frei positionieren': { en: 'Position the Dock and clock freely', ru: 'Свободно размещайте док и часы' },
  'Anzeige-Editor': { en: 'Display Editor', ru: 'Редактор экрана' },
  'Display Editor': { en: 'Display Editor', ru: 'Редактор экрана' },
  'Editor öffnen': { en: 'Open editor', ru: 'Открыть редактор' },
  'Ziehe das Dock an eine Kante. Ziehe die Uhr an eine beliebige Position; mit dem Griff unten rechts änderst du ihre Größe.': {
    en: 'Drag the Dock to an edge. Drag the clock anywhere; use the bottom-right handle to resize it.',
    ru: 'Перетащите док к краю. Часы можно переместить куда угодно; правый нижний маркер меняет размер.'
  },
  'Dock-Seite': { en: 'Dock side', ru: 'Сторона дока' },
  'Oben': { en: 'Top', ru: 'Верх' },
  'Rechts': { en: 'Right', ru: 'Право' },
  'Unten': { en: 'Bottom', ru: 'Низ' },
  'Links': { en: 'Left', ru: 'Лево' },
  'Uhr-Größe': { en: 'Clock size', ru: 'Размер часов' },
  'Zurücksetzen': { en: 'Reset', ru: 'Сбросить' },
  'Fertig': { en: 'Done', ru: 'Готово' },
  'Layout zurückgesetzt': { en: 'Layout reset', ru: 'Расположение сброшено' },
  'Position gespeichert': { en: 'Position saved', ru: 'Положение сохранено' },
  'Dock ziehen': { en: 'Drag Dock', ru: 'Перетащить док' },
  'Uhr ziehen': { en: 'Drag clock', ru: 'Перетащить часы' },
  'Größe ändern': { en: 'Resize', ru: 'Изменить размер' },
  'Editor schließen': { en: 'Close editor', ru: 'Закрыть редактор' },
  'Google-Suche': { en: 'Google Search', ru: 'Поиск Google' },
  'Verlauf': { en: 'History', ru: 'История' },
  'Websuche': { en: 'Web search', ru: 'Веб-поиск' },
  'Verlauf durchsuchen': { en: 'Search history', ru: 'Поиск в истории' },
  'Im Verlauf': { en: 'In history', ru: 'В истории' },
  'Website öffnen': { en: 'Open website', ru: 'Открыть сайт' },
  'Google-Suche öffnen': { en: 'Open Google Search', ru: 'Открыть поиск Google' },
  'Suchanfrage': { en: 'Search query', ru: 'Поисковый запрос' },
  'Suchergebnisse': { en: 'Search results', ru: 'Результаты поиска' },
  'Als Lesezeichen hinzufügen': { en: 'Add as bookmark', ru: 'Добавить в закладки' },
  'Lesezeichen hinzugefügt': { en: 'Bookmark added', ru: 'Закладка добавлена' },
  'Konnte Lesezeichen nicht hinzufügen': { en: 'Could not add bookmark', ru: 'Не удалось добавить закладку' },
  'Mit Google suchen': { en: 'Search with Google', ru: 'Найти в Google' },
  'Webadresse öffnen': { en: 'Open web address', ru: 'Открыть веб-адрес' },
  'In Google suchen': { en: 'Search on Google', ru: 'Найти в Google' },
  'Nach „?“ suchen': { en: 'Search', ru: 'Поиск' },
  'Keine Web-Treffer': { en: 'No web results', ru: 'Нет веб-результатов' },
  'Google öffnet die Suche in einem neuen Tab.': { en: 'Google opens the search in a tab.', ru: 'Google откроет поиск во вкладке.' },
  'Rechtsklick: Als Lesezeichen hinzufügen': { en: 'Right-click: Add as bookmark', ru: 'Правый клик: добавить в закладки' },

  'Zeit mit HH:MM.SS anzeigen': { en: 'Show time as HH:MM.SS', ru: 'Формат времени ЧЧ:ММ.СС' },
  'Lokal, .woff2 / .ttf / .otf': { en: 'Local, .woff2 / .ttf / .otf', ru: 'Локально, .woff2 / .ttf / .otf' },
  'Layout': { en: 'Layout', ru: 'Раскладка' },
  'Dock, Uhr, Farben und Größe': { en: 'Dock, clock, colors and size', ru: 'Док, часы, цвета и размер' },
  'Rastergröße': { en: 'Grid size', ru: 'Размер сетки' },
  'Symbole am Raster ausrichten': { en: 'Snap icons to the grid', ru: 'Выравнивать значки по сетке' },
  'Raster': { en: 'Grid', ru: 'Сетка' },
  'Hintergrund & Desktop': { en: 'Wallpaper & Desktop', ru: 'Фон и рабочий стол' },
  'Ziehe das Dock an eine Kante. Ziehe die Uhr frei; mit dem Griff unten rechts änderst du ihre Größe.': {
    en: 'Drag the Dock to an edge. Drag the clock freely; use the lower-right handle to resize it.',
    ru: 'Перетащите док к краю. Часы можно двигать свободно; правый нижний маркер меняет размер.'
  },
  'Uhrfarbe': { en: 'Clock color', ru: 'Цвет часов' },
  'Dockfarbe': { en: 'Dock color', ru: 'Цвет дока' },
  'Uhrfarbe Presets': { en: 'Clock color presets', ru: 'Пресеты цвета часов' },
  'Dockfarbe Presets': { en: 'Dock color presets', ru: 'Пресеты цвета дока' },
  'Weiß': { en: 'White', ru: 'Белый' },
  'Silber': { en: 'Silver', ru: 'Серебряный' },
  'Stahlblau': { en: 'Steel blue', ru: 'Стальной синий' },
  'Mauve': { en: 'Mauve', ru: 'Мов' },
  'Salbei': { en: 'Sage', ru: 'Шалфей' },
  'Rauchschwarz': { en: 'Smoke black', ru: 'Дымный чёрный' },
  'Graphit': { en: 'Graphite', ru: 'Графит' },
  'Nachtviolett': { en: 'Night violet', ru: 'Ночной фиолетовый' },
  'Petrol': { en: 'Petrol', ru: 'Петроль' },
  'Tiefrot': { en: 'Deep red', ru: 'Тёмно-красный' },
  'Umbenennen': { en: 'Rename', ru: 'Переименовать' },
  'Neuer Name': { en: 'New name', ru: 'Новое имя' },
  'Abbrechen': { en: 'Cancel', ru: 'Отмена' },
  'Speichern': { en: 'Save', ru: 'Сохранить' },
  'Symbol umbenannt': { en: 'Icon renamed', ru: 'Значок переименован' },
  'Name darf nicht leer sein': { en: 'Name cannot be empty', ru: 'Имя не может быть пустым' },
  'Themen': { en: 'Themes', ru: 'Темы' },
  'Thema': { en: 'Theme', ru: 'Тема' },
  'Fenster-Glas': { en: 'Window glass', ru: 'Стекло окон' },
  'Hintergrund leicht sichtbar, mit sanfter Unschärfe': { en: 'Background faintly visible with soft blur', ru: 'Фон слегко виден с мягким размытием' },
  'Auto-Ausblenden': { en: 'Auto-hide', ru: 'Автоскрытие' },
  'Dock erscheint an der gewählten Kante': { en: 'Dock appears at the chosen edge', ru: 'Док появляется у выбранного края' },
  'Dock-Stil': { en: 'Dock style', ru: 'Стиль дока' },
  'Island': { en: 'Island', ru: 'Остров' },
  'Windows 10': { en: 'Windows 10', ru: 'Windows 10' },
  'Windows 11': { en: 'Windows 11', ru: 'Windows 11' },
  'Transparenz': { en: 'Transparency', ru: 'Прозрачность' },
  'Unschärfe': { en: 'Blur', ru: 'Размытие' },
  'Rundung': { en: 'Corner radius', ru: 'Скругление' },
  'Darstellung · Hush': { en: 'Appearance · Hush', ru: 'Оформление · Hush' },
  'Symbolgröße': { en: 'Icon size', ru: 'Размер значков' },
  'Video-Hintergrund': { en: 'Video wallpaper', ru: 'Видеофон' },
  'Lokale Datei oder geprüfte Adresse': { en: 'Local file or verified URL', ru: 'Локальный файл или проверенный адрес' },
  'Eigenes Video': { en: 'Custom video', ru: 'Своё видео' },
  'Video entfernen': { en: 'Remove video', ru: 'Удалить видео' },
  'Anwenden': { en: 'Apply', ru: 'Применить' },
  'Video-URL': { en: 'Video URL', ru: 'URL видео' },
  'https://…/hintergrund.mp4': { en: 'https://…/background.mp4', ru: 'https://…/fon.mp4' },
  'Kein Video aktiv': { en: 'No video active', ru: 'Видео не активно' },
  'Lokales Video aktiv': { en: 'Local video active', ru: 'Локальное видео активно' },
  'Video-URL aktiv': { en: 'Video URL active', ru: 'URL видео активен' },
  'Adresse ändern …': { en: 'Change address …', ru: 'Изменить адрес …' },
  'Adresse ändern': { en: 'Change address', ru: 'Изменить адрес' },
  'Neue Adresse': { en: 'New address', ru: 'Новый адрес' },
  'Link gespeichert': { en: 'Link saved', ru: 'Ссылка сохранена' },
  'Bitte eine Videodatei auswählen.': { en: 'Please choose a video file.', ru: 'Выберите видеофайл.' },
  'Video-Hintergrund gespeichert': { en: 'Video wallpaper saved', ru: 'Видеофон сохранён' },
  'Video konnte nicht gespeichert werden.': { en: 'The video could not be saved.', ru: 'Не удалось сохранить видео.' },
  'Video-URL übernommen': { en: 'Video URL applied', ru: 'URL видео применён' },
  'Ungültige Video-Adresse': { en: 'Invalid video address', ru: 'Недействительный адрес видео' },
  'Video-Hintergrund entfernt': { en: 'Video wallpaper removed', ru: 'Видеофон удалён' },
  'Video ist zu groß (max. 150 MB).': { en: 'Video is too large (150 MB max).', ru: 'Видео слишком большое (максимум 150 МБ).' },
  'Island, Windows 10 oder Windows 11': { en: 'Island, Windows 10 or Windows 11', ru: 'Остров, Windows 10 или Windows 11' },
  'Kante': { en: 'Edge', ru: 'Край' },
  'Oben, rechts, unten oder links': { en: 'Top, right, bottom or left', ru: 'Вверху, справа, внизу или слева' },
  'Ausrichtung': { en: 'Alignment', ru: 'Выравнивание' },
  'Position innerhalb der Kante': { en: 'Position along the edge', ru: 'Положение вдоль края' },
  'Zentriert': { en: 'Centered', ru: 'По центру' },
  'Hintergrund-Pack': { en: 'Wallpaper pack', ru: 'Набор обоев' },
  'Kein Ordner gewählt': { en: 'No folder selected', ru: 'Папка не выбрана' },
  'Ordner wählen': { en: 'Choose folder', ru: 'Выбрать папку' },
  'Pack entfernen': { en: 'Remove pack', ru: 'Удалить набор' },
  'Intervall': { en: 'Interval', ru: 'Интервал' },
  'Bei Neuladen wechseln': { en: 'Change on reload', ru: 'Менять при перезагрузке' },
  'Nächstes Bild beim Öffnen': { en: 'Next image when opening', ru: 'Следующее изображение при открытии' },
  'Links auf Domain kürzen': { en: 'Shorten links to domain', ru: 'Сокращать ссылки до домена' },
  'Nur Origin für neue Pins und Desktop-Links': { en: 'Store only the origin for new pins and desktop links', ru: 'Сохранять только домен для новых закреплений и ссылок на рабочем столе' },
  'Timer und Neuladen': { en: 'timer and reload', ru: 'таймер и перезагрузка' },
  'nur Timer': { en: 'timer only', ru: 'только таймер' },
  'Hintergrund-Pack wählen …': { en: 'Choose wallpaper pack …', ru: 'Выбрать набор обоев …' },
  'Hintergrund-Pack wählen': { en: 'Choose wallpaper pack', ru: 'Выбрать набор обоев' },
  'Ordner mit Bildern auswählen': { en: 'Choose a folder of images', ru: 'Выберите папку с изображениями' },
  'Hintergrund-Pack gespeichert': { en: 'Wallpaper pack saved', ru: 'Набор обоев сохранён' },
  'Hintergrund-Pack entfernt': { en: 'Wallpaper pack removed', ru: 'Набор обоев удалён' },
  'Hintergrund-Pack konnte nicht gespeichert werden.': { en: 'The wallpaper pack could not be saved.', ru: 'Не удалось сохранить набор обоев.' },
  'Bitte einen Ordner mit Bildern wählen.': { en: 'Please choose a folder containing images.', ru: 'Выберите папку с изображениями.' },
  'Zum Ablegen auf Desktop oder Dock ziehen': { en: 'Drag onto the desktop or Dock to place it', ru: 'Перетащите на рабочий стол или в док, чтобы разместить' },
  '5 Min': { en: '5 min', ru: '5 мин' },
  'Dunkel': { en: 'Dark', ru: 'Тёмная' },
  'Hell': { en: 'Light', ru: 'Светлая' },
  'Farbig': { en: 'Color', ru: 'Цветная' },
  'Dunkel, Hell oder transparenter Glas-Dock': { en: 'Dark, light or transparent glass Dock', ru: 'Тёмный, светлый или прозрачный стеклянный док' },
  'Bild abdunkeln': { en: 'Darken image', ru: 'Затемнять изображение' },
  'Standardmäßig aus; helle Bilder bleiben hell': { en: 'Off by default; bright images stay bright', ru: 'Выключено по умолчанию; светлые изображения остаются светлыми' },
  'Eigenes Bild aktiv': { en: 'Custom image active', ru: 'Активно своё изображение' },
  'Eigener Ordner': { en: 'Custom folder', ru: 'Своя папка' },
  'Theme-Pack': { en: 'Theme pack', ru: 'Набор темы' },
  'Widgets zurücksetzen': { en: 'Reset widgets', ru: 'Сбросить виджеты' },
  'Widgets zurückgesetzt': { en: 'Widgets reset', ru: 'Виджеты сброшены' },
  'Notizen, Aufgaben, Timer und Kalender verwalten': { en: 'Manage notes, tasks, timers and calendar', ru: 'Управлять заметками, задачами, таймерами и календарём' },
  'Alles bis auf Uhr und ein Widget ausblenden': { en: 'Hide everything except the clock and one widget', ru: 'Скрыть всё, кроме часов и одного виджета' },
  'Widgets': { en: 'Widgets', ru: 'Виджеты' },
  'Widget': { en: 'Widget', ru: 'Виджет' },
  'Notiz': { en: 'Note', ru: 'Заметка' },
  'Aufgaben': { en: 'Tasks', ru: 'Задачи' },
  'Timer': { en: 'Timer', ru: 'Таймер' },
  'Kalender': { en: 'Calendar', ru: 'Календарь' },
  'Weltuhr': { en: 'World clock', ru: 'Мировые часы' },
  'Widget hinzufügen': { en: 'Add widget', ru: 'Добавить виджет' },
  'Alle Widgets entfernen': { en: 'Remove all widgets', ru: 'Удалить все виджеты' },
  'Widgets geleert': { en: 'Widgets cleared', ru: 'Виджеты удалены' },
  'Widgets aktivieren': { en: 'Enable widgets', ru: 'Включить виджеты' },
  'Notizen, Aufgaben, Timer und Kalender auf dem Desktop': { en: 'Notes, tasks, timers and calendar on the desktop', ru: 'Заметки, задачи, таймеры и календарь на рабочем столе' },
  'Verfügbare Typen': { en: 'Available types', ru: 'Доступные типы' },
  'Widgets aktiv. Standardmäßig ist der Desktop leer. Ziehe am Kopf, ändere die Größe unten rechts.': { en: 'widgets active. The desktop is empty by default. Drag the header; resize from the bottom-right corner.', ru: 'виджетов активно. По умолчанию рабочий стол пуст. Перетаскивайте за заголовок; меняйте размер за правый нижний угол.' },
  'Ziehe am Kopf, ändere die Größe unten rechts.': { en: 'Drag the header; resize from the bottom-right corner.', ru: 'Перетаскивайте за заголовок; меняйте размер за правый нижний угол.' },
  'Lokales Backup': { en: 'Local backup', ru: 'Локальная копия' },
  'Alles lokal sichern': { en: 'Save everything locally', ru: 'Сохранить всё локально' },
  'Einstellungen, Desktop-Symbole, Dock-Pins und Widgets': { en: 'Settings, desktop icons, Dock pins and widgets', ru: 'Настройки, значки рабочего стола, закрепленные элементы Dock и виджеты' },
  'Backup exportieren': { en: 'Export backup', ru: 'Экспортировать копию' },
  'Backup importieren': { en: 'Import backup', ru: 'Импортировать копию' },
  'Noch kein Backup geladen': { en: 'No backup loaded yet', ru: 'Копия ещё не загружена' },
  'Ein Backup enthält Einstellungen, Desktop-Symbole, Dock-Pins und Widgets. Videos und selbst gewählte Hintergrund-Pack-Bilder bleiben in IndexedDB und werden nicht exportiert.': { en: 'A backup contains settings, desktop icons, Dock pins and widgets. Videos and custom wallpaper-pack images stay in IndexedDB and are not exported.', ru: 'Копия содержит настройки, значки рабочего стола, закрепленные элементы Dock и виджеты. Видео и изображения пользовательских наборов остаются в IndexedDB и не экспортируются.' },
  'Backup exportiert': { en: 'Backup exported', ru: 'Копия экспортирована' },
  'Backup wiederhergestellt': { en: 'Backup restored', ru: 'Копия восстановлена' },
  'Backup ist ungültig': { en: 'Backup is invalid', ru: 'Копия недействительна' },
  'Backup konnte nicht exportiert werden': { en: 'Backup could not be exported', ru: 'Не удалось экспортировать копию' },
  'Maximal 12 Widgets': { en: 'Maximum of 12 widgets', ru: 'Максимум 12 виджетов' },
  'Start': { en: 'Start', ru: 'Старт' },
  'Pause': { en: 'Pause', ru: 'Пауза' },
  'Minuten': { en: 'minutes', ru: 'мин' },
  'Neue Aufgabe': { en: 'New task', ru: 'Новая задача' },
  'Aufgabe hinzufügen': { en: 'Add task', ru: 'Добавить задачу' },
  'Aufgabe entfernen': { en: 'Remove task', ru: 'Удалить задачу' },
  'Aufgabe erledigt': { en: 'Task done', ru: 'Задача выполнена' },
  'Widget entfernen': { en: 'Remove widget', ru: 'Удалить виджет' },
  'Gedanken, Notizen, Ideen …': { en: 'Thoughts, notes, ideas …', ru: 'Мысли, заметки, идеи …' },
  'Widget-Typ': { en: 'Widget type', ru: 'Тип виджета' },
  'Widgets · Desktop': { en: 'Widgets · Desktop', ru: 'Виджеты · Рабочий стол' },
  'Acht Widget-Typen verwalten': { en: 'Manage eight widget types', ru: 'Управлять восемью типами виджетов' },
  'Einstellungen, Symbole und Widgets lokal sichern': { en: 'Save settings, icons and widgets locally', ru: 'Локально сохранить настройки, значки и виджеты' },
  'Widgets öffnen': { en: 'Open widgets', ru: 'Открыть виджеты' },
  'Notiz hinzufügen': { en: 'Add note', ru: 'Добавить заметку' },
  'Aufgaben hinzufügen': { en: 'Add tasks', ru: 'Добавить задачи' },
  'Timer hinzufügen': { en: 'Add timer', ru: 'Добавить таймер' },
  'Kalender hinzufügen': { en: 'Add calendar', ru: 'Добавить календарь' },
  'Weltuhr hinzufügen': { en: 'Add world clock', ru: 'Добавить мировые часы' },
  'Hush Widgets': { en: 'Hush Widgets', ru: 'Виджеты Hush' },
  'Zeitzone': { en: 'Time zone', ru: 'Часовой пояс' },

  'Hush Spaces': { en: 'Hush Spaces', ru: 'Hush Spaces' },
  'Spaces': { en: 'Spaces', ru: 'Spaces' },
  'Space': { en: 'Space', ru: 'Пространство' },
  'Hauptbereich': { en: 'Main', ru: 'Главное' },
  'Arbeit': { en: 'Work', ru: 'Работа' },
  'Privat': { en: 'Private', ru: 'Личное' },
  'Space-Name': { en: 'Space name', ru: 'Название пространства' },
  'Space-Farbe': { en: 'Space color', ru: 'Цвет пространства' },
  'Aktiv': { en: 'Active', ru: 'Активно' },
  'Wechseln': { en: 'Switch', ru: 'Переключить' },
  'Space hinzufügen': { en: 'Add Space', ru: 'Добавить пространство' },
  'Space erstellen': { en: 'Create Space', ru: 'Создать пространство' },
  'Space erstellt': { en: 'Space created', ru: 'Пространство создано' },
  'Space gelöscht': { en: 'Space deleted', ru: 'Пространство удалено' },
  'Space gewechselt': { en: 'Space switched', ru: 'Пространство переключено' },
  'Zu Space wechseln': { en: 'Switch to Space', ru: 'Переключить пространство' },
  'Maximal drei Spaces': { en: 'Up to three Spaces', ru: 'До трёх пространств' },
  'Bis zu drei lokale Arbeitsbereiche mit eigener Darstellung, eigenen Symbolen, Dock-Pins und Widgets.': { en: 'Up to three local workspaces, each with its own appearance, shortcuts, Dock pins and widgets.', ru: 'До трёх локальных рабочих пространств с собственным оформлением, ярлыками, закреплениями и виджетами.' },
  'Space öffnen': { en: 'Open Spaces', ru: 'Открыть пространства' },
  'Space umbenennen': { en: 'Rename Space', ru: 'Переименовать пространство' },
  'Space-Farbe ändern': { en: 'Change Space color', ru: 'Изменить цвет пространства' },
  'Spaces öffnen': { en: 'Open Spaces', ru: 'Открыть пространства' },
  'Lokale Arbeitsbereiche verwalten': { en: 'Manage local workspaces', ru: 'Управлять локальными пространствами' },
  'Fünf Widget-Typen verwalten': { en: 'Manage five widget types', ru: 'Управлять пятью типами виджетов' },
  'Hush Spaces öffnen': { en: 'Open Hush Spaces', ru: 'Открыть Hush Spaces' },
  'Space löschen': { en: 'Delete Space', ru: 'Удалить пространство' },
  'Ein Space muss aktiv bleiben.': { en: 'One Space must remain active.', ru: 'Одно пространство должно оставаться активным.' }

};

const PATTERNS = [
  { re: /^(\d+) Apps$/, render: (lang, m) => lang === 'ru' ? `${m[1]} приложений` : `${m[1]} apps` },
  { re: /^(.+) öffnen oder ziehen$/, render: (lang, m) => lang === 'ru' ? `Открыть или перетащить ${m[1]}` : `Open or drag ${m[1]}` },
  { re: /^(.+) öffnen$/, render: (lang, m) => lang === 'ru' ? `Открыть ${m[1]}` : `Open ${m[1]}` },
  { re: /^„(.+)“ liegt auf dem Desktop$/, render: (lang, m) => lang === 'ru' ? `«${m[1]}» добавлен на рабочий стол` : `“${m[1]}” placed on Desktop` },
  { re: /^„(.+)“ angeheftet$/, render: (lang, m) => lang === 'ru' ? `«${m[1]}» закреплено` : `“${m[1]}” pinned` },
  { re: /^Suche nach „(.+)“$/, render: (lang, m) => lang === 'ru' ? `Поиск «${m[1]}»` : `Search for “${m[1]}”` },
  { re: /^Für „(.+)“ wurde kein Lesezeichen gefunden\.$/, render: (lang, m) => lang === 'ru' ? `Закладка для «${m[1]}» не найдена.` : `No bookmark found for “${m[1]}”.` },
  { re: /^Vorschau: (.+) würde geöffnet$/, render: (lang, m) => lang === 'ru' ? `Предпросмотр: открылся бы ${m[1]}` : `Preview: ${m[1]} would open` },
  { re: /^(.+) · Lesezeichen$/, render: (lang, m) => `${m[1]} · ${lang === 'ru' ? 'Закладка' : 'Bookmark'}` },
  { re: /^(.+) · Ordner$/, render: (lang, m) => `${m[1]} · ${lang === 'ru' ? 'Папка' : 'Folder'}` },
  { re: /^(.+) · 1 ausgewählt$/, render: (lang, m) => `${m[1]} · ${lang === 'ru' ? '1 выбрано' : '1 selected'}` },
  { re: /^Mit Google suchen nach „(.+)“$/, render: (lang, m) => lang === 'ru' ? `Найти в Google «${m[1]}»` : `Search Google for “${m[1]}”` },
  { re: /^„(.+)“ als Lesezeichen hinzufügen$/, render: (lang, m) => lang === 'ru' ? `Добавить «${m[1]}» в закладки` : `Add “${m[1]}” as bookmark` },
  { re: /^Lesezeichen „(.+)“ hinzugefügt$/, render: (lang, m) => lang === 'ru' ? `Закладка «${m[1]}» добавлена` : `Bookmark “${m[1]}” added` },
  { re: /^Im Verlauf: (.+)$/, render: (lang, m) => lang === 'ru' ? `В истории: ${m[1]}` : `In history: ${m[1]}` },
  { re: /^Website öffnen: (.+)$/, render: (lang, m) => lang === 'ru' ? `Открыть сайт: ${m[1]}` : `Open website: ${m[1]}` },
  { re: /^Google-Suche öffnen: (.+)$/, render: (lang, m) => lang === 'ru' ? `Поиск Google: ${m[1]}` : `Google Search: ${m[1]}` },
  { re: /^(\d+) %$/, render: (lang, m) => `${m[1]} %` },
  { re: /^(\d+) px$/, render: (lang, m) => `${m[1]} px` },
  { re: /^(\d+) Min$/, render: (lang, m) => lang === 'ru' ? `${m[1]} мин` : `${m[1]} min` },
  { re: /^Hush 2\.1\.2 · (.+) öffnet die Suche · F2 benennt Desktop-Symbole um$/, render: (lang, m) => lang === 'ru' ? `Hush 2.1.2 · ${m[1]} открывает поиск · F2 переименовывает значки` : `Hush 2.1.2 · ${m[1]} opens search · F2 renames desktop icons` }
];

export function currentLanguage() {
  return current;
}

export function locale() {
  if (current === 'de') return 'de-DE';
  if (current === 'ru') return 'ru-RU';
  return 'en-US';
}

export function t(text) {
  const value = String(text ?? '');
  if (current === 'de' || !value) return value;
  const entry = M[value];
  if (entry) return entry[current] || entry.en || value;
  for (const pattern of PATTERNS) {
    const match = value.match(pattern.re);
    if (match) return pattern.render(current, match);
  }
  return value;
}

const PLURALS = {
  'Objekt': { en: ['object', 'objects'], ru: ['объект', 'объекта', 'объектов'] },
  'Bild': { en: ['image', 'images'], ru: ['изображение', 'изображения', 'изображений'] },
  'Ordner': { en: ['folder', 'folders'], ru: ['папка', 'папки', 'папок'] },
  'App': { en: ['app', 'apps'], ru: ['приложение', 'приложения', 'приложений'] }
};

export function plural(count, one = 'Objekt', many = 'Objekte') {
  const n = Number(count) || 0;
  if (current === 'de') return `${n} ${n === 1 ? one : many}`;
  const forms = PLURALS[one] || { en: [one, many], ru: [one, many, many] };
  if (current === 'ru') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    let form = forms.ru[2];
    if (mod10 === 1 && mod100 !== 11) form = forms.ru[0];
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) form = forms.ru[1];
    return `${n} ${form}`;
  }
  return `${n} ${n === 1 ? forms.en[0] : forms.en[1]}`;
}

function translateTextNode(node) {
  if (!node || node.nodeType !== 3) return;
  const original = originalText.get(node) ?? node.nodeValue ?? '';
  originalText.set(node, original);
  const translated = t(original.trim());
  const leading = (original.match(/^\s*/) || [''])[0];
  const trailing = (original.match(/\s*$/) || [''])[0];
  const next = `${leading}${translated}${trailing}`;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateElement(el) {
  if (!el || el.nodeType !== 1) return;
  let attrs = originalAttr.get(el);
  if (!attrs) {
    attrs = new Map();
    originalAttr.set(el, attrs);
  }
  for (const name of TRANSLATED_ATTRS) {
    if (!el.hasAttribute(name)) continue;
    if (!attrs.has(name)) attrs.set(name, el.getAttribute(name) || '');
    const next = t(attrs.get(name));
    if (el.getAttribute(name) !== next) el.setAttribute(name, next);
  }
}

function translateTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { translateTextNode(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) translateElement(root);
  const walker = document.createTreeWalker(root, 4  | 1 );
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === 3) translateTextNode(node);
    else translateElement(node);
    node = walker.nextNode();
  }
}

export function setLanguage(language) {
  current = LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  document.documentElement.lang = current;
  applying = true;
  translateTree(document.documentElement);
  applying = false;
  if (typeof CustomEvent !== 'undefined') {
    document.dispatchEvent(new CustomEvent('hush:localechange'));
  }
  return current;
}

export function startI18n() {
  setLanguage(current);
  if (observer || typeof MutationObserver === 'undefined') return () => {};
  observer = new MutationObserver((records) => {
    if (applying) return;
    applying = true;
    for (const record of records) {
      if (record.type === 'childList') {
        record.addedNodes.forEach((node) => translateTree(node));
      } else if (record.type === 'characterData') {
        translateTextNode(record.target);
      } else if (record.type === 'attributes' && record.target?.nodeType === 1) {
        translateElement(record.target);
      }
    }
    applying = false;
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATED_ATTRS
  });
  return () => {
    observer?.disconnect();
    observer = null;
  };
}
