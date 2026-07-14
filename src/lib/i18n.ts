// Lightweight i18n. Hebrew is the default; the shape supports adding more
// locales later (English/Arabic/…) without touching component call sites.

export type Locale = "he" | "en";
export const DEFAULT_LOCALE: Locale = "he";
export const RTL_LOCALES: Locale[] = ["he"];

let currentLocale: Locale = DEFAULT_LOCALE;
export const getLocale = (): Locale => currentLocale;
export const setLocale = (l: Locale) => {
  currentLocale = l;
};
export const isRTL = (l: Locale = currentLocale) => RTL_LOCALES.includes(l);

// Central dictionary. Keys are namespaced with dots.
type Dict = Record<string, string>;

const he: Dict = {
  // Brand
  "app.name": "המוח השני",
  "app.tagline": "מקום שקט אחד לכל מה שחשוב לך.",

  // Nav
  "nav.dashboard": "דף הבית",
  "nav.tasks": "משימות",
  "nav.journal": "יומן אישי",
  "nav.archive": "ארכיון",
  "nav.learn": "השראה",
  "nav.settings": "הגדרות",
  "nav.signOut": "יציאה",

  // Common actions
  "action.save": "שמירה",
  "action.saveChanges": "שמירת שינויים",
  "action.cancel": "ביטול",
  "action.delete": "מחיקה",
  "action.edit": "עריכה",
  "action.add": "הוספה",
  "action.upload": "העלאת קובץ",
  "action.download": "הורדה",
  "action.export": "ייצוא",
  "action.quickAdd": "הוספה מהירה",
  "action.new": "חדש",
  "action.tryAgain": "נסה שוב",
  "action.goHome": "חזרה לדף הבית",
  "action.saved": "נשמר",
  "action.deleted": "נמחק",
  "action.failed": "הפעולה נכשלה",
  "action.confirmDelete": "למחוק את הפריט הזה?",

  // Common labels
  "label.search": "חיפוש",
  "label.searchAll": "חיפוש בכל המקומות…",
  "label.title": "כותרת",
  "label.titleOptional": "כותרת (רשות)",
  "label.description": "תיאור",
  "label.descriptionOptional": "תיאור (רשות)",
  "label.notes": "הערות",
  "label.notesOptional": "הערות (רשות)",
  "label.tags": "תגיות",
  "label.tagPlaceholder": "הוסף תגית…",
  "label.date": "תאריך",
  "label.time": "שעה",
  "label.priority": "עדיפות",
  "label.dueDate": "תאריך יעד",
  "label.reminder": "תזכורת",
  "label.mood": "איך את/ה מרגיש/ה?",
  "label.thoughts": "מחשבות",
  "label.email": "דוא״ל",
  "label.password": "סיסמה",
  "label.displayName": "שם תצוגה",
  "label.url": "כתובת קישור",
  "label.note": "הערה",

  // Statuses / filters
  "status.active": "פעילות",
  "status.completed": "הושלמו",
  "status.all": "הכול",
  "filter.allPriorities": "כל העדיפויות",
  "filter.allTypes": "כל הסוגים",

  // Priority
  "priority.high": "גבוהה",
  "priority.medium": "בינונית",
  "priority.low": "נמוכה",

  // Archive item types
  "type.note": "הערה",
  "type.link": "קישור",
  "type.image": "תמונה",
  "type.pdf": "PDF",
  "type.doc": "מסמך",
  "type.file": "קובץ",
  "types.notes": "הערות",
  "types.links": "קישורים",
  "types.images": "תמונות",
  "types.pdfs": "מסמכי PDF",
  "types.docs": "מסמכים",
  "types.files": "קבצים אחרים",

  // Mood labels
  "mood.1": "קשה",
  "mood.2": "נמוך",
  "mood.3": "בסדר",
  "mood.4": "טוב",
  "mood.5": "מצוין",

  // Greetings
  "greeting.night": "עוד ער?",
  "greeting.morning": "בוקר טוב",
  "greeting.afternoon": "צהריים טובים",
  "greeting.evening": "ערב טוב",

  // Dashboard
  "dashboard.subtitle.zero": "אין לך משימות פעילות כרגע.",
  "dashboard.subtitle.one": "יש לך משימה פעילה אחת.",
  "dashboard.subtitle.many": "יש לך {n} משימות פעילות.",
  "dashboard.today": "היום",
  "dashboard.todayEmpty": "אין משימות להיום. תיהנה מהשקט.",
  "dashboard.overdue": "באיחור",
  "dashboard.upcoming": "השבוע הקרוב",
  "dashboard.upcomingEmpty": "אין דבר מתוזמן.",
  "dashboard.recentJournal": "רשומות אחרונות",
  "dashboard.journalEmpty": "עדיין אין רשומות ביומן.",
  "dashboard.recentArchive": "נשמר לאחרונה",
  "dashboard.archiveEmpty": "עדיין לא שמרת דבר — נסה הוספה מהירה.",
  "dashboard.allTasks": "כל המשימות ←",
  "dashboard.openJournal": "פתיחה ←",
  "dashboard.openArchive": "לארכיון ←",
  "dashboard.completeTask": "סימון כהושלם",

  // Tasks
  "tasks.title": "משימות",
  "tasks.subtitle": "מה דורש את תשומת ליבך.",
  "tasks.new": "משימה חדשה",
  "tasks.edit": "עריכת משימה",
  "tasks.add": "הוספת משימה",
  "tasks.emptyActive": "אין משימות פעילות",
  "tasks.emptyDone": "עדיין אין משימות שהושלמו",
  "tasks.emptyActiveHint": "הוסף את הראשונה — זה לוקח שנייה.",
  "tasks.emptyDoneHint": "משימות שסיימת יופיעו כאן.",
  "tasks.titlePlaceholder": "מה צריך לעשות?",
  "tasks.searchPlaceholder": "חיפוש משימה…",
  "tasks.due": "לביצוע עד",
  "tasks.confirmDelete": "למחוק את המשימה הזו?",

  // Journal
  "journal.title": "יומן אישי",
  "journal.subtitle": "המרחב הפרטי שלך לחשוב בו.",
  "journal.new": "רשומה חדשה",
  "journal.newTitle": "רשומה חדשה",
  "journal.empty": "היומן שלך מחכה",
  "journal.emptyHint": "כתוב את הרשומה הראשונה — משפט אחד מספיק.",
  "journal.start": "התחל לכתוב",
  "journal.searchPlaceholder": "חיפוש ברשומות…",
  "journal.titleShort": "מילה או שתיים…",
  "journal.body": "כתוב בחופשיות…",
  "journal.saved": "הרשומה נשמרה",
  "journal.confirmDelete": "למחוק את הרשומה הזו?",
  "journal.back": "חזרה ליומן",

  // Archive
  "archive.title": "ארכיון",
  "archive.subtitle": "קבצים, קישורים והערות ששווה לשמור.",
  "archive.save": "שמירת פריט",
  "archive.empty": "עדיין אין דבר בארכיון",
  "archive.emptyHint": "שמור את הפריט הראשון — קישור, קובץ או הערה.",
  "archive.saveSomething": "שמור משהו",
  "archive.searchPlaceholder": "חיפוש בארכיון…",
  "archive.newTitle": "שמירה לארכיון",
  "archive.subtitleManual": "מה תרצה לשמור?",
  "archive.subtitleShared": "שותף מיישום אחר.",
  "archive.tab.file": "קובץ",
  "archive.tab.link": "קישור",
  "archive.tab.note": "הערה",
  "archive.pickFile": "לחץ לבחירת קובץ",
  "archive.pickFileHint": "תמונות, PDF, מסמכים — הכול מתקבל.",
  "archive.urlPlaceholder": "https://…",
  "archive.notePlaceholder": "כל דבר שתרצה לזכור…",
  "archive.pleasePickFile": "אנא בחר קובץ",
  "archive.notSignedIn": "לא מחובר",
  "archive.saved": "נשמר לארכיון",
  "archive.confirmDelete": "למחוק את הפריט הזה מהארכיון?",
  "archive.back": "חזרה לארכיון",
  "archive.downloadFile": "הורדת הקובץ",

  // Auth
  "auth.subtitle": "מקום שקט אחד למשימות, יומן וארכיון.",
  "auth.signIn": "כניסה",
  "auth.signUp": "יצירת חשבון",
  "auth.createAccount": "יצירת חשבון",
  "auth.newHere": "חדש כאן?",
  "auth.haveAccount": "כבר יש לך חשבון?",
  "auth.google": "המשך עם Google",
  "auth.or": "או",
  "auth.accountCreated": "החשבון נוצר. בדוק את המייל לאישור.",
  "auth.failed": "אימות נכשל",
  "auth.googleFailed": "כניסה עם Google נכשלה",

  // Capture
  "capture.opening": "פותח את מסך הלכידה…",

  // Settings
  "settings.title": "הגדרות",
  "settings.subtitle": "העדפות וחשבון.",
  "settings.account": "חשבון",
  "settings.appearance": "מראה",
  "settings.data": "נתונים",
  "settings.darkMode": "מצב כהה",
  "settings.darkModeHint": "אפלה רכה בגוון סגלגל.",
  "settings.export": "ייצוא הכול",
  "settings.exportHint": "הורדת כל הנתונים כקובץ JSON.",
  "settings.backupSoon": "גיבוי אוטומטי בענן בקרוב.",
  "settings.signOut": "יציאה",
  "settings.signOutHint": "תצטרך להתחבר שוב.",
  "settings.profileSaved": "הפרופיל נשמר",
  "settings.downloaded": "הורד",

  // Learn
  "learn.title": "למידה והשראה",
  "learn.subtitle": "פינה שקטה לצמיחה. בקרוב.",
  "learn.headline": "משהו רגוע בדרך",
  "learn.body": "המלצות קריאה, רצפי למידה ופרומפטים להשראה — מותאמים לקצב שלך, לא מפריעים לו.",
  "learn.readingList": "רשימת קריאה",
  "learn.dailyPrompts": "פרומפטים יומיים",
  "learn.paths": "מסלולי למידה",

  // Errors
  "error.notFound": "העמוד לא נמצא",
  "error.notFoundHint": "העמוד הזה לא קיים או הוסר.",
  "error.somethingWrong": "משהו השתבש",
  "error.tryAgainOrHome": "נסה שוב או חזור לדף הבית.",
  "error.noResults": "לא נמצאו תוצאות.",

  // Quick add
  "quick.title": "הוספה מהירה",
  "quick.tab.task": "משימה",
  "quick.tab.capture": "לכידה",
  "quick.taskAdded": "המשימה נוספה",
};

const dicts: Record<Locale, Dict> = { he, en: {} };

export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = dicts[currentLocale]?.[key] ?? dicts.he[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

// Formatters — Hebrew / Israeli defaults.
const localeTag = (l: Locale) => (l === "he" ? "he-IL" : "en-US");

export const formatDate = (date: string | Date, opts?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(localeTag(currentLocale), opts ?? { day: "numeric", month: "long", year: "numeric" }).format(
    typeof date === "string" ? new Date(date) : date,
  );

export const formatDateShort = (date: string | Date) =>
  new Intl.DateTimeFormat(localeTag(currentLocale), { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    typeof date === "string" ? new Date(date) : date,
  );

export const formatDayMonth = (date: string | Date) =>
  new Intl.DateTimeFormat(localeTag(currentLocale), { day: "numeric", month: "short" }).format(
    typeof date === "string" ? new Date(date) : date,
  );

export const formatWeekday = (date: string | Date) =>
  new Intl.DateTimeFormat(localeTag(currentLocale), { weekday: "long", day: "numeric", month: "long" }).format(
    typeof date === "string" ? new Date(date) : date,
  );

export const formatTime = (date: string | Date) =>
  new Intl.DateTimeFormat(localeTag(currentLocale), { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    typeof date === "string" ? new Date(date) : date,
  );

export const priorityLabel = (p: "high" | "medium" | "low") => t(`priority.${p}`);
export const itemTypeLabel = (type: string) => t(`type.${type}`) || type;

export function greetingKey(hour = new Date().getHours()): string {
  if (hour < 5) return "greeting.night";
  if (hour < 12) return "greeting.morning";
  if (hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}
