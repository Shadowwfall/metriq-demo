import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "hi";

/**
 * Translation layer for the portal. Only the strings the product actually uses
 * are translated — the structure is flat and namespaced so more Indian
 * languages can be added by appending another dictionary.
 */
const en = {
  "app.name": "METRIQ",
  "app.tagline": "Digital Verification. Trusted Measurement.",

  "nav.today": "Today",
  "nav.assignments": "Assignments",
  "nav.schedule": "Schedule",
  "nav.field": "Field Verification",
  "nav.instruments": "Instruments",
  "nav.applications": "Applications",
  "nav.certificates": "Certificates",
  "nav.reports": "Reports",
  "nav.audit": "Activity Record",
  "nav.notifications": "Notifications",
  "nav.profile": "Profile",
  "nav.dashboard": "Dashboard",
  "nav.overview": "Overview",
  "nav.menu": "Menu",
  "nav.workspace": "Workspace",

  "action.signOut": "Sign out",
  "action.signIn": "Login to Portal",
  "action.startVerification": "Start Verification",
  "action.viewDetails": "View Details",
  "action.continue": "Continue Verification",
  "action.viewRoute": "View Route",
  "action.verify": "Verify",
  "action.next": "Next",
  "action.back": "Back",
  "action.saveDraft": "Save draft",
  "action.submit": "Submit result",
  "action.downloadPdf": "Download PDF",
  "action.print": "Print certificate",
  "action.saveDigilocker": "Save to DigiLocker",
  "action.markAllRead": "Mark all as read",
  "action.retry": "Retry",
  "action.syncNow": "Sync now",
  "action.viewAll": "View all",
  "action.newApplication": "New application",
  "action.registerInstrument": "Register instrument",
  "action.cancel": "Cancel",

  "metric.todayInspections": "Today's Inspections",
  "metric.pendingVerification": "Pending Verification",
  "metric.completedToday": "Completed Today",
  "metric.expiringSoon": "Expiring Soon",
  "metric.registeredInstruments": "Registered Instruments",
  "metric.activeCertificates": "Active Certificates",
  "metric.pendingApplications": "Pending Applications",

  "section.todayOverview": "Today's Overview",
  "section.todayInspections": "Today's Inspections",
  "section.fieldOps": "Field Operations",
  "section.pendingApplications": "Pending Applications",
  "section.recentActivity": "Recent Activity",
  "section.myInstruments": "My Instruments",
  "section.recentApplications": "Recent Applications",
  "section.upcomingExpirations": "Upcoming Expirations",
  "section.recentCertificates": "Recent Certificates",

  "queue.newApplications": "New applications",
  "queue.documentsToReview": "Documents requiring review",
  "queue.reInspections": "Re-inspections",
  "queue.pendingResults": "Pending results",

  "greeting.morning": "Good morning, Officer",
  "greeting.afternoon": "Good afternoon, Officer",
  "greeting.evening": "Good evening, Officer",

  "field.step1": "Application summary",
  "field.step2": "Location",
  "field.step3": "Instrument identification",
  "field.step4": "Photographs",
  "field.step5": "Verification measurements",
  "field.step6": "Inspection observations",
  "field.step7": "Result",
  "field.step8": "Officer approval",
  "field.step9": "Submit",

  "status.draft": "Draft",
  "status.submitted": "Submitted",
  "status.under_review": "Under Review",
  "status.documents_required": "Documents Required",
  "status.approved": "Documents Approved",
  "status.scheduled": "Scheduled",
  "status.inspection_pending": "Inspection Pending",
  "status.verification_in_progress": "Verification In Progress",
  "status.verified": "Verified",
  "status.rejected": "Rejected",
  "status.cancelled": "Cancelled",
  "status.valid": "Valid",
  "status.expiring_soon": "Expiring Soon",
  "status.expired": "Expired",
  "status.revoked": "Revoked",
  "status.active": "Active",
  "status.verification_due": "Verification Due",
  "status.verification_expired": "Verification Expired",
  "status.under_verification": "Under Verification",
  "status.suspended": "Suspended",
  "status.not_found": "Not Found",

  "verify.title": "Verify a Certificate",
  "verify.subtitle":
    "Enter a certificate ID, instrument ID or scan the QR code printed on a digital certificate.",
  "verify.placeholder": "Enter Certificate ID",
  "verify.scanQr": "Scan QR code",
  "verify.verified": "Certificate Verified",
  "verify.expired": "Certificate Expired",
  "verify.revoked": "Certificate Revoked",
  "verify.notFound": "Certificate Not Found",
  "verify.online": "Verified online on",
  "verify.disclaimer":
    "Prototype demonstration. Not an official Government of India verification service.",
  "verify.label.certificateId": "Certificate ID",
  "verify.label.instrumentId": "Instrument ID",
  "verify.label.instrument": "Instrument",
  "verify.label.status": "Status",
  "verify.label.validUntil": "Valid Until",
  "verify.label.verifiedOn": "Verified On",
  "verify.label.issuedBy": "Issued By",
  "verify.label.state": "State",
  "verify.label.location": "Verification Location",
  "verify.label.establishment": "Establishment",
  "verify.label.officer": "Verifying Officer",

  "notice.prototype": "Prototype demonstration environment — all records are fictional.",
  "empty.todayInspections": "No upcoming inspections",
  "empty.todayInspectionsBody":
    "You have no inspections scheduled for today. New assignments appear here automatically.",

  "label.jurisdiction": "Jurisdiction",
  "label.language": "Language",
  "label.loading": "Loading",
  "label.offline": "Offline",
  "label.online": "Online",
  "label.pending": "Pending",
  "label.syncing": "Syncing",
  "label.synced": "Synced",
  "label.failed": "Failed",
} as const;

export type Key = keyof typeof en;

const hi: Partial<Record<Key, string>> = {
  "app.tagline": "डिजिटल सत्यापन। विश्वसनीय मापन।",

  "nav.today": "आज",
  "nav.assignments": "कार्यसूची",
  "nav.schedule": "समय-सारणी",
  "nav.field": "क्षेत्र सत्यापन",
  "nav.instruments": "यंत्र",
  "nav.applications": "आवेदन",
  "nav.certificates": "प्रमाणपत्र",
  "nav.reports": "रिपोर्ट",
  "nav.audit": "गतिविधि रिकॉर्ड",
  "nav.notifications": "सूचनाएँ",
  "nav.profile": "प्रोफ़ाइल",
  "nav.dashboard": "डैशबोर्ड",
  "nav.overview": "अवलोकन",
  "nav.menu": "मेन्यू",
  "nav.workspace": "कार्यक्षेत्र",

  "action.signOut": "साइन आउट",
  "action.signIn": "पोर्टल में लॉगिन",
  "action.startVerification": "सत्यापन शुरू करें",
  "action.viewDetails": "विवरण देखें",
  "action.continue": "सत्यापन जारी रखें",
  "action.viewRoute": "मार्ग देखें",
  "action.verify": "सत्यापित करें",
  "action.next": "आगे",
  "action.back": "पीछे",
  "action.saveDraft": "ड्राफ़्ट सहेजें",
  "action.submit": "परिणाम जमा करें",
  "action.downloadPdf": "PDF डाउनलोड करें",
  "action.print": "प्रमाणपत्र प्रिंट करें",
  "action.saveDigilocker": "डिजिलॉकर में सहेजें",
  "action.markAllRead": "सभी पढ़ा हुआ चिह्नित करें",
  "action.retry": "पुनः प्रयास करें",
  "action.syncNow": "अभी सिंक करें",
  "action.viewAll": "सभी देखें",
  "action.newApplication": "नया आवेदन",
  "action.registerInstrument": "यंत्र पंजीकृत करें",
  "action.cancel": "रद्द करें",

  "metric.todayInspections": "आज के निरीक्षण",
  "metric.pendingVerification": "लंबित सत्यापन",
  "metric.completedToday": "आज पूर्ण",
  "metric.expiringSoon": "जल्द समाप्त होने वाले",
  "metric.registeredInstruments": "पंजीकृत यंत्र",
  "metric.activeCertificates": "सक्रिय प्रमाणपत्र",
  "metric.pendingApplications": "लंबित आवेदन",

  "section.todayOverview": "आज का अवलोकन",
  "section.todayInspections": "आज के निरीक्षण",
  "section.fieldOps": "क्षेत्र संचालन",
  "section.pendingApplications": "लंबित आवेदन",
  "section.recentActivity": "हाल की गतिविधि",
  "section.myInstruments": "मेरे यंत्र",
  "section.recentApplications": "हाल के आवेदन",
  "section.upcomingExpirations": "आगामी समाप्तियाँ",
  "section.recentCertificates": "हाल के प्रमाणपत्र",

  "queue.newApplications": "नए आवेदन",
  "queue.documentsToReview": "समीक्षा हेतु दस्तावेज़",
  "queue.reInspections": "पुनः निरीक्षण",
  "queue.pendingResults": "लंबित परिणाम",

  "greeting.morning": "सुप्रभात, अधिकारी",
  "greeting.afternoon": "नमस्कार, अधिकारी",
  "greeting.evening": "शुभ संध्या, अधिकारी",

  "field.step1": "आवेदन सारांश",
  "field.step2": "स्थान",
  "field.step3": "यंत्र की पहचान",
  "field.step4": "फ़ोटोग्राफ़",
  "field.step5": "सत्यापन माप",
  "field.step6": "निरीक्षण टिप्पणियाँ",
  "field.step7": "परिणाम",
  "field.step8": "अधिकारी अनुमोदन",
  "field.step9": "जमा करें",

  "status.draft": "ड्राफ़्ट",
  "status.submitted": "जमा",
  "status.under_review": "समीक्षा में",
  "status.documents_required": "दस्तावेज़ आवश्यक",
  "status.approved": "दस्तावेज़ स्वीकृत",
  "status.scheduled": "निर्धारित",
  "status.inspection_pending": "निरीक्षण लंबित",
  "status.verification_in_progress": "सत्यापन प्रगति में",
  "status.verified": "सत्यापित",
  "status.rejected": "अस्वीकृत",
  "status.cancelled": "रद्द",
  "status.valid": "वैध",
  "status.expiring_soon": "जल्द समाप्त",
  "status.expired": "समाप्त",
  "status.revoked": "निरस्त",
  "status.active": "सक्रिय",
  "status.verification_due": "सत्यापन देय",
  "status.verification_expired": "सत्यापन समाप्त",
  "status.under_verification": "सत्यापनाधीन",
  "status.suspended": "निलंबित",
  "status.not_found": "नहीं मिला",

  "verify.title": "प्रमाणपत्र सत्यापित करें",
  "verify.subtitle":
    "प्रमाणपत्र आईडी या यंत्र आईडी दर्ज करें, अथवा डिजिटल प्रमाणपत्र पर छपा QR कोड स्कैन करें।",
  "verify.placeholder": "प्रमाणपत्र आईडी दर्ज करें",
  "verify.scanQr": "QR कोड स्कैन करें",
  "verify.verified": "प्रमाणपत्र सत्यापित",
  "verify.expired": "प्रमाणपत्र समाप्त",
  "verify.revoked": "प्रमाणपत्र निरस्त",
  "verify.notFound": "प्रमाणपत्र नहीं मिला",
  "verify.online": "ऑनलाइन सत्यापित",
  "verify.disclaimer":
    "प्रोटोटाइप प्रदर्शन। यह भारत सरकार की आधिकारिक सत्यापन सेवा नहीं है।",

  "notice.prototype": "प्रोटोटाइप प्रदर्शन वातावरण — सभी रिकॉर्ड काल्पनिक हैं।",
  "empty.todayInspections": "कोई आगामी निरीक्षण नहीं",
  "empty.todayInspectionsBody":
    "आज के लिए कोई निरीक्षण निर्धारित नहीं है। नए कार्य यहाँ स्वतः दिखाई देंगे।",

  "label.jurisdiction": "क्षेत्राधिकार",
  "label.language": "भाषा",
  "label.loading": "लोड हो रहा है",
  "label.offline": "ऑफ़लाइन",
  "label.online": "ऑनलाइन",
  "label.pending": "लंबित",
  "label.syncing": "सिंक हो रहा है",
  "label.synced": "सिंक हो गया",
  "label.failed": "विफल",
};

const dictionaries: Record<Lang, Partial<Record<Key, string>>> = { en, hi };

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "metriq.lang";

export function I18nProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (initial) return initial;
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "hi" ? "hi" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(
    () => setLangState((prev) => (prev === "en" ? "hi" : "en")),
    [],
  );

  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) => {
      const raw = dictionaries[lang][key] ?? en[key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
        raw,
      );
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Localised label for any application / certificate / instrument status. */
export function statusKey(status: string): Key {
  const key = `status.${status}` as Key;
  return key in en ? key : "status.not_found";
}
