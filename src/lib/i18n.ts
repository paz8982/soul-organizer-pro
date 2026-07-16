// Lightweight i18n with runtime locale switching.
// Hebrew is default; English is fully supported. Components that call
// useLocale() re-render on locale change; callers of plain t() will see
// the new value on their next render (RootComponent keys Outlet by
// locale so the whole app remounts on switch).

import { useSyncExternalStore } from "react";

export type Locale = "he" | "en";
export const DEFAULT_LOCALE: Locale = "he";
export const RTL_LOCALES: Locale[] = ["he"];
const STORAGE_KEY = "locale";

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export const getLocale = (): Locale => currentLocale;
export const isRTL = (l: Locale = currentLocale) => RTL_LOCALES.includes(l);
export const dirFor = (l: Locale = currentLocale) => (isRTL(l) ? "rtl" : "ltr");

export function setLocale(l: Locale) {
  if (l === currentLocale) return;
  currentLocale = l;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
    document.documentElement.dir = dirFor(l);
  }
  listeners.forEach((fn) => fn());
}

/** Read the persisted locale from storage and apply it. Safe to call on client mount. */
export function hydrateLocale() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "he" || stored === "en") {
      setLocale(stored);
      return;
    }
  } catch {
    /* ignore */
  }
  // Ensure DOM matches default
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = dirFor(currentLocale);
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => currentLocale,
    () => DEFAULT_LOCALE,
  );
}

// Central dictionary.
type Dict = Record<string, string>;

const he: Dict = {
  "app.name": "המוח השני",
  "app.tagline": "מקום שקט אחד לכל מה שחשוב לך.",

  "nav.dashboard": "דף הבית",
  "nav.tasks": "משימות",
  "nav.journal": "יומן אישי",
  "nav.archive": "ארכיון",
  "nav.learn": "השראה",
  "nav.settings": "הגדרות",
  "nav.signOut": "יציאה",

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

  "status.active": "פעילות",
  "status.completed": "הושלמו",
  "status.all": "הכול",
  "filter.allPriorities": "כל העדיפויות",
  "filter.allTypes": "כל הסוגים",

  "priority.high": "גבוהה",
  "priority.medium": "בינונית",
  "priority.low": "נמוכה",

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

  "mood.1": "קשה",
  "mood.2": "נמוך",
  "mood.3": "בסדר",
  "mood.4": "טוב",
  "mood.5": "מצוין",

  "greeting.night": "עוד ער?",
  "greeting.morning": "בוקר טוב",
  "greeting.afternoon": "צהריים טובים",
  "greeting.evening": "ערב טוב",

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

  "capture.opening": "פותח את מסך הלכידה…",

  "settings.title": "הגדרות",
  "settings.subtitle": "העדפות וחשבון.",
  "settings.account": "חשבון",
  "settings.appearance": "מראה",
  "settings.data": "נתונים",
  "settings.language": "שפה",
  "settings.languageHint": "בחר את שפת הממשק.",
  "settings.language.he": "עברית",
  "settings.language.en": "אנגלית",
  "settings.languageChanged": "השפה שונתה",
  "settings.darkMode": "מצב כהה",
  "settings.darkModeHint": "אפלה רכה בגוון סגלגל.",
  "settings.export": "ייצוא הכול",
  "settings.exportHint": "הורדת כל הנתונים כקובץ JSON.",
  "settings.backupSoon": "גיבוי אוטומטי בענן בקרוב.",
  "settings.signOut": "יציאה",
  "settings.signOutHint": "תצטרך להתחבר שוב.",
  "settings.profileSaved": "הפרופיל נשמר",
  "settings.downloaded": "הורד",

  "learn.title": "למידה והשראה",
  "learn.subtitle": "פינה שקטה לצמיחה. בקרוב.",
  "learn.headline": "משהו רגוע בדרך",
  "learn.body": "המלצות קריאה, רצפי למידה ופרומפטים להשראה — מותאמים לקצב שלך, לא מפריעים לו.",
  "learn.readingList": "רשימת קריאה",
  "learn.dailyPrompts": "פרומפטים יומיים",
  "learn.paths": "מסלולי למידה",

  "learn.step.time": "כמה זמן פנוי יש לך?",
  "learn.step.format": "מה בא לך לצרוך?",
  "learn.step.category": "מה במצב רוח?",
  "learn.getRecs": "קבל המלצות",
  "learn.recommending": "מחפש עבורך…",
  "learn.recsTitle": "המלצות עבורך",
  "learn.tryAgain": "חיפוש חדש",
  "learn.startOver": "התחל מחדש",
  "learn.openContent": "פתח תוכן",
  "learn.saveForLater": "שמור להמשך",
  "learn.saved": "נשמר לרשימה",
  "learn.markCompleted": "סמן כהושלם",
  "learn.markNotCompleted": "החזר לרשימה",
  "learn.reflectionPrompt": "מה לקחת מזה?",
  "learn.reflectionPlaceholder": "מחשבה, תובנה, משפט שנשאר איתך…",
  "learn.saveReflection": "שמור רפלקציה",
  "learn.reflectionSaved": "הרפלקציה נשמרה",
  "learn.tab.discover": "גלה",
  "learn.tab.list": "הרשימה שלי",
  "learn.tab.completed": "הושלמו",
  "learn.emptyList": "אין עדיין פריטים ברשימה.",
  "learn.emptyCompleted": "עוד לא סימנת פריטים כהושלמו.",
  "learn.addCategory": "הוסף קטגוריה משלך",
  "learn.categoryAdded": "הקטגוריה נוספה",
  "learn.minutes": "דקות",
  "learn.minute": "דקה",
  "learn.hour": "שעה",
  "learn.moreThanHour": "יותר משעה",
  "learn.format.video": "וידאו",
  "learn.format.audio": "אודיו",
  "learn.format.text": "קריאה",
  "learn.cat.inspiration": "השראה",
  "learn.cat.motivation": "מוטיבציה",
  "learn.cat.new": "משהו חדש",
  "learn.cat.productivity": "פרודוקטיביות",
  "learn.cat.business": "עסקים",
  "learn.cat.psychology": "פסיכולוגיה",
  "learn.cat.health": "בריאות",
  "learn.cat.finance": "פיננסים",
  "learn.cat.creativity": "יצירתיות",
  "learn.cat.technology": "טכנולוגיה",
  "learn.cat.growth": "צמיחה אישית",
  "learn.cat.science": "מדע",
  "learn.cat.history": "היסטוריה",


  "error.notFound": "העמוד לא נמצא",
  "error.notFoundHint": "העמוד הזה לא קיים או הוסר.",
  "error.somethingWrong": "משהו השתבש",
  "error.tryAgainOrHome": "נסה שוב או חזור לדף הבית.",
  "error.noResults": "לא נמצאו תוצאות.",

  "quick.title": "הוספה מהירה",
  "quick.tab.task": "משימה",
  "quick.tab.capture": "לכידה",
  "quick.taskAdded": "המשימה נוספה",

  "lang.toggle": "החלף שפה",
  "voice.button": "עוזר קולי",
};

const en: Dict = {
  "app.name": "Second Brain",
  "app.tagline": "One quiet place for everything that matters to you.",

  "nav.dashboard": "Home",
  "nav.tasks": "Tasks",
  "nav.journal": "Journal",
  "nav.archive": "Archive",
  "nav.learn": "Inspire",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",

  "action.save": "Save",
  "action.saveChanges": "Save changes",
  "action.cancel": "Cancel",
  "action.delete": "Delete",
  "action.edit": "Edit",
  "action.add": "Add",
  "action.upload": "Upload file",
  "action.download": "Download",
  "action.export": "Export",
  "action.quickAdd": "Quick add",
  "action.new": "New",
  "action.tryAgain": "Try again",
  "action.goHome": "Back to home",
  "action.saved": "Saved",
  "action.deleted": "Deleted",
  "action.failed": "Something went wrong",
  "action.confirmDelete": "Delete this item?",

  "label.search": "Search",
  "label.searchAll": "Search everywhere…",
  "label.title": "Title",
  "label.titleOptional": "Title (optional)",
  "label.description": "Description",
  "label.descriptionOptional": "Description (optional)",
  "label.notes": "Notes",
  "label.notesOptional": "Notes (optional)",
  "label.tags": "Tags",
  "label.tagPlaceholder": "Add a tag…",
  "label.date": "Date",
  "label.time": "Time",
  "label.priority": "Priority",
  "label.dueDate": "Due date",
  "label.reminder": "Reminder",
  "label.mood": "How are you feeling?",
  "label.thoughts": "Thoughts",
  "label.email": "Email",
  "label.password": "Password",
  "label.displayName": "Display name",
  "label.url": "Link URL",
  "label.note": "Note",

  "status.active": "Active",
  "status.completed": "Completed",
  "status.all": "All",
  "filter.allPriorities": "All priorities",
  "filter.allTypes": "All types",

  "priority.high": "High",
  "priority.medium": "Medium",
  "priority.low": "Low",

  "type.note": "Note",
  "type.link": "Link",
  "type.image": "Image",
  "type.pdf": "PDF",
  "type.doc": "Document",
  "type.file": "File",
  "types.notes": "Notes",
  "types.links": "Links",
  "types.images": "Images",
  "types.pdfs": "PDFs",
  "types.docs": "Documents",
  "types.files": "Other files",

  "mood.1": "Rough",
  "mood.2": "Low",
  "mood.3": "Okay",
  "mood.4": "Good",
  "mood.5": "Great",

  "greeting.night": "Still up?",
  "greeting.morning": "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",

  "dashboard.subtitle.zero": "You have no active tasks.",
  "dashboard.subtitle.one": "You have one active task.",
  "dashboard.subtitle.many": "You have {n} active tasks.",
  "dashboard.today": "Today",
  "dashboard.todayEmpty": "Nothing due today. Enjoy the quiet.",
  "dashboard.overdue": "Overdue",
  "dashboard.upcoming": "This week",
  "dashboard.upcomingEmpty": "Nothing scheduled.",
  "dashboard.recentJournal": "Recent entries",
  "dashboard.journalEmpty": "No journal entries yet.",
  "dashboard.recentArchive": "Recently saved",
  "dashboard.archiveEmpty": "Nothing saved yet — try quick add.",
  "dashboard.allTasks": "All tasks →",
  "dashboard.openJournal": "Open →",
  "dashboard.openArchive": "To archive →",
  "dashboard.completeTask": "Mark as done",

  "tasks.title": "Tasks",
  "tasks.subtitle": "What needs your attention.",
  "tasks.new": "New task",
  "tasks.edit": "Edit task",
  "tasks.add": "Add task",
  "tasks.emptyActive": "No active tasks",
  "tasks.emptyDone": "No completed tasks yet",
  "tasks.emptyActiveHint": "Add your first — it takes a second.",
  "tasks.emptyDoneHint": "Finished tasks will show up here.",
  "tasks.titlePlaceholder": "What needs doing?",
  "tasks.searchPlaceholder": "Search tasks…",
  "tasks.due": "Due",
  "tasks.confirmDelete": "Delete this task?",

  "journal.title": "Journal",
  "journal.subtitle": "Your private space to think.",
  "journal.new": "New entry",
  "journal.newTitle": "New entry",
  "journal.empty": "Your journal is waiting",
  "journal.emptyHint": "Write your first entry — one sentence is enough.",
  "journal.start": "Start writing",
  "journal.searchPlaceholder": "Search entries…",
  "journal.titleShort": "A word or two…",
  "journal.body": "Write freely…",
  "journal.saved": "Entry saved",
  "journal.confirmDelete": "Delete this entry?",
  "journal.back": "Back to journal",

  "archive.title": "Archive",
  "archive.subtitle": "Files, links and notes worth keeping.",
  "archive.save": "Save item",
  "archive.empty": "Nothing in the archive yet",
  "archive.emptyHint": "Save your first item — a link, file or note.",
  "archive.saveSomething": "Save something",
  "archive.searchPlaceholder": "Search the archive…",
  "archive.newTitle": "Save to archive",
  "archive.subtitleManual": "What would you like to keep?",
  "archive.subtitleShared": "Shared from another app.",
  "archive.tab.file": "File",
  "archive.tab.link": "Link",
  "archive.tab.note": "Note",
  "archive.pickFile": "Click to choose a file",
  "archive.pickFileHint": "Images, PDFs, documents — all welcome.",
  "archive.urlPlaceholder": "https://…",
  "archive.notePlaceholder": "Anything you want to remember…",
  "archive.pleasePickFile": "Please pick a file",
  "archive.notSignedIn": "Not signed in",
  "archive.saved": "Saved to archive",
  "archive.confirmDelete": "Delete this item from the archive?",
  "archive.back": "Back to archive",
  "archive.downloadFile": "Download file",

  "auth.subtitle": "One quiet place for tasks, journal and archive.",
  "auth.signIn": "Sign in",
  "auth.signUp": "Create account",
  "auth.createAccount": "Create account",
  "auth.newHere": "New here?",
  "auth.haveAccount": "Already have an account?",
  "auth.google": "Continue with Google",
  "auth.or": "or",
  "auth.accountCreated": "Account created. Check your email to confirm.",
  "auth.failed": "Authentication failed",
  "auth.googleFailed": "Google sign-in failed",

  "capture.opening": "Opening capture…",

  "settings.title": "Settings",
  "settings.subtitle": "Preferences and account.",
  "settings.account": "Account",
  "settings.appearance": "Appearance",
  "settings.data": "Data",
  "settings.language": "Language",
  "settings.languageHint": "Choose the interface language.",
  "settings.language.he": "Hebrew",
  "settings.language.en": "English",
  "settings.languageChanged": "Language updated",
  "settings.darkMode": "Dark mode",
  "settings.darkModeHint": "Soft, lavender-tinted dark.",
  "settings.export": "Export everything",
  "settings.exportHint": "Download all your data as JSON.",
  "settings.backupSoon": "Automatic cloud backup coming soon.",
  "settings.signOut": "Sign out",
  "settings.signOutHint": "You'll need to sign in again.",
  "settings.profileSaved": "Profile saved",
  "settings.downloaded": "Downloaded",

  "learn.title": "Learning & inspiration",
  "learn.subtitle": "A quiet corner for growth. Coming soon.",
  "learn.headline": "Something calm on the way",
  "learn.body": "Reading suggestions, learning paths and inspiration prompts — matched to your pace, not disrupting it.",
  "learn.readingList": "Reading list",
  "learn.dailyPrompts": "Daily prompts",
  "learn.paths": "Learning paths",

  "learn.step.time": "How much free time do you have?",
  "learn.step.format": "What would you like to consume?",
  "learn.step.category": "What are you in the mood for?",
  "learn.getRecs": "Get recommendations",
  "learn.recommending": "Finding great picks…",
  "learn.recsTitle": "Picks for you",
  "learn.tryAgain": "New search",
  "learn.startOver": "Start over",
  "learn.openContent": "Open content",
  "learn.saveForLater": "Save for later",
  "learn.saved": "Saved to your list",
  "learn.markCompleted": "Mark completed",
  "learn.markNotCompleted": "Move back to list",
  "learn.reflectionPrompt": "What did you take away from this?",
  "learn.reflectionPlaceholder": "A thought, insight, or line that stayed with you…",
  "learn.saveReflection": "Save reflection",
  "learn.reflectionSaved": "Reflection saved",
  "learn.tab.discover": "Discover",
  "learn.tab.list": "My list",
  "learn.tab.completed": "Completed",
  "learn.emptyList": "Nothing in your list yet.",
  "learn.emptyCompleted": "You haven't marked anything as completed.",
  "learn.addCategory": "Add your own category",
  "learn.categoryAdded": "Category added",
  "learn.minutes": "minutes",
  "learn.minute": "minute",
  "learn.hour": "hour",
  "learn.moreThanHour": "More than an hour",
  "learn.format.video": "Video",
  "learn.format.audio": "Audio",
  "learn.format.text": "Reading",
  "learn.cat.inspiration": "Inspiration",
  "learn.cat.motivation": "Motivation",
  "learn.cat.new": "Something new",
  "learn.cat.productivity": "Productivity",
  "learn.cat.business": "Business",
  "learn.cat.psychology": "Psychology",
  "learn.cat.health": "Health",
  "learn.cat.finance": "Finance",
  "learn.cat.creativity": "Creativity",
  "learn.cat.technology": "Technology",
  "learn.cat.growth": "Personal growth",
  "learn.cat.science": "Science",
  "learn.cat.history": "History",


  "error.notFound": "Page not found",
  "error.notFoundHint": "This page doesn't exist or was removed.",
  "error.somethingWrong": "Something went wrong",
  "error.tryAgainOrHome": "Try again or head back home.",
  "error.noResults": "No results found.",

  "quick.title": "Quick add",
  "quick.tab.task": "Task",
  "quick.tab.capture": "Capture",
  "quick.taskAdded": "Task added",

  "lang.toggle": "Switch language",
  "voice.button": "Voice assistant",
};

const dicts: Record<Locale, Dict> = { he, en };

export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = dicts[currentLocale]?.[key] ?? dicts.he[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

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
