/**
 * Single stable language type for the authenticated app shell (Sidebar, Header, Settings).
 * Deliberately separate from `LoginLanguage` in components/auth/loginTranslations.ts — the
 * login screen is an intentionally isolated pre-auth flow with its own verified-working i18n;
 * this is the equivalent system for everything after login.
 */
import { pluralizeRu } from "../../utils/pluralize";
import type { UserRole } from "../../types";

export type Language = "tj" | "ru" | "en";

export const APP_LANGUAGES: { value: Language; label: string }[] = [
  { value: "tj", label: "Тоҷикӣ" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export interface AppStrings {
  sidebar: {
    dashboard: string;
    objects: string;
    estimatesAndBudgets: string;
    estimates: string;
    budgets: string;
    works: string;
    brigades: string;
    brigadesList: string;
    brigadesComposition: string;
    assignments: string;
    myBrigade: string;
    assignedWorks: string;
    employees: string;
    attendance: string;
    warehouse: string;
    materials: string;
    receipts: string;
    writeOffs: string;
    transfers: string;
    stock: string;
    payroll: string;
    reports: string;
    users: string;
    settings: string;
    closeMenu: string;
    logout: string;
  };
  header: {
    openMenu: string;
    searchPlaceholder: string;
    notifications: string;
    profile: string;
    settings: string;
    logout: string;
    demoNotificationOverdue: string;
    demoNotificationPayroll: string;
    criticalMaterialsNotification: (count: number) => string;
    justNow: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
  };
  common: {
    statusInProgress: string; statusAtRisk: string; statusAlmostDone: string; statusCompleted: string;
    open: string;
    paginationShown: (from: number, to: number, total: number, itemLabel: string) => string;
    showPerPage: string; prevPage: string; nextPage: string;
    confirmLabel: string; cancelLabel: string;
    selectPlaceholder: string; selectEmpty: string; selectSearch: string; selectClear: string;
    placeholderTitle: string; placeholderNote: string;
    roleLabels: Record<UserRole, string>;
    profileTitle: string; profileRole: string; profilePhone: string; profileEmail: string; profileRegisteredAt: string;
    save: string; delete: string; edit: string; view: string;
    tableActions: string; editUnavailableInDemo: string;
    emptyStateHint: string; resetFiltersButton: string;
    filtersButton: string; resetButton: string; applyButton: string;
    colObject: string; colStatus: string; colDate: string; colAmountSomoni: string;
    periodWeek: string; periodMonth: string; periodQuarter: string; periodYear: string;
    seriesPlanned: string; seriesSpent: string;
    responsibleLabel: string; spentLabel: string; remainingBudgetLabel: string; budgetUsageLabel: string;
    totalBudgetLabel: string; totalBudgetSomoniLabel: string; dateCreatedLabel: string;
    errorBudgetPositive: string;
    statusDraft: string;
    riskBadgeLabels: Record<string, string>;
    colBrigade: string; colPhone: string;
    duplicateLabel: string; completeLabel: string; progressLabel: string; commentLabel: string;
    exportButton: string; descriptionLabel: string;
    upcomingAssignmentsTitle: string; allAssignmentsLink: string;
  };
  works: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string; addWork: string;
    tabAll: string; tabInProgress: string; tabCompleted: string; tabOverdue: string;
    kpiTotal: string; kpiTotalFooter: string; kpiCompleted: string; kpiInProgress: string; kpiOverdue: string;
    kpiPercentOfTotal: (n: number) => string;
    filterObjectAriaLabel: string; allObjectsOption: string;
    filterSectionAriaLabel: string; allSectionsOption: string;
    filterStatusAriaLabel: string; statusAllLabel: string;
    statusCompleted: string; statusInProgress: string; statusOverdue: string; statusPlanned: string;
    statusOnReview: string; statusPaused: string; statusCancelled: string;
    selectedCount: (n: number) => string;
    colWork: string; colObjectSection: string; colResponsible: string; colPlanFact: string; colStatusProgress: string;
    selectAllAriaLabel: string; selectRowAriaLabel: (title: string) => string;
    daysShort: string;
    emptyTitle: string; paginationItemLabel: string;
    dynamicsTitle: string; bySectionsTitle: string; colSection: string; colWorksCount: string;
    summaryTitle: string; donutSuffix: string;
    periodLabel: string; filterResponsibleAriaLabel: string; allResponsibleOption: string; allBrigadesOption: string;
    criticalTitle: string; criticalNone: string; overdueDaysLabel: (n: number) => string; allCriticalLink: string;
    exportPdf: string; exportExcel: string; printReport: string;
    exportingPdf: string; exportingExcel: string; preparingPrint: string; exportDone: (label: string) => string;
    formAddTitle: string; formEditTitle: string; formDescription: string;
    fieldTitle: string; fieldTitlePlaceholder: string;
    fieldCode: string; fieldCodePlaceholder: string;
    fieldPriority: string; fieldSection: string; fieldDescriptionPlaceholder: string;
    fieldPlannedStart: string; fieldPlannedEnd: string; fieldPlannedDuration: string;
    durationDaysValue: (n: number) => string; noValue: string;
    fieldInitialProgress: string; fieldBudget: string;
    fieldParentWork: string; noneOption: string;
    fieldDependencies: string; noDependenciesAvailable: string;
    fieldAttachments: string; attachButton: string; removeAttachmentAriaLabel: (name: string) => string;
    saveChanges: string; createWork: string;
    errorTitleRequired: string; errorCodeRequired: string; errorCodeTaken: string;
    errorPlannedStartRequired: string; errorPlannedEndRequired: string; errorPlannedEndBeforeStart: string;
    errorProgressRange: string; errorBudgetPositive: string;
    priorityLow: string; priorityMedium: string; priorityHigh: string; priorityCritical: string;
    sectionPrep: string; sectionFoundation: string; sectionStructure: string; sectionFinishing: string; sectionEngineering: string; sectionOther: string;
    actionProgress: string; actionAssignResponsible: string; actionAssignBrigade: string; actionPause: string;
    progressModalTitle: string; progressPercentLabel: string;
    commentUpdateLabel: string; commentPlaceholderExample: string;
    detailsDefaultTitle: string; updateProgressButton: string; completeWorkButton: string;
    changeStatusLabel: string; plannedTermsLabel: string; actualTermsLabel: string; notStartedLabel: string;
    actualDurationLabel: string; budgetLabel: string; priorityLabel: string; progressExecutionLabel: string;
    dependenciesLabel: string; noAttachments: string; progressHistoryLabel: string;
    commentsLabel: string; noCommentsYet: string; addCommentPlaceholder: string; addButton: string;
    historyNoteCompleted: string; historyNoteProgressUpdated: string; historyNoteCreated: string; historyNoteDuplicated: string;
    toastCompleted: string; toastPaused: string; toastStatusUpdated: string; toastProgressUpdated: string;
    toastDuplicated: string; toastUpdated: string; toastCreated: string; toastDeleted: string;
    toastBulkCompleted: (n: number) => string; toastBulkDeleted: (n: number) => string;
    deleteConfirmTitle: string; deleteConfirmDescription: (title: string, code: string) => string;
    copyTitle: (title: string) => string;
  };
  brigades: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string; createBrigade: string;
    kpiTotalBrigades: string; kpiActiveBrigadesFooter: (n: number) => string;
    kpiTotalMembers: string; kpiWorkersFooter: (n: number) => string;
    kpiAssignedWorks: string; kpiObjectsFooter: string;
    kpiAverageEfficiency: string; kpiCurrentPeriodFooter: string;
    listTitle: string; emptyTitle: string; paginationItemLabel: string;
    distributionBySpecialtyTitle: string; peopleUnitLabel: string;
    activityTitle: string; distributionByRoleTitle: string;
    statusActive: string; statusPaused: string; statusInactive: string; statusForming: string; statusOverloaded: string;
    employeeStatusOnShift: string; employeeStatusOnSite: string; employeeStatusAvailable: string; employeeStatusOnTrip: string;
    employeeStatusAbsent: string; employeeStatusOnLeave: string; employeeStatusSickLeave: string;
    shiftDay: string; shiftEvening: string; shiftNight: string; shiftDayOff: string;
    colComposition: string; membersCountLabel: (n: number) => string; workersHelpersLabel: (workers: number, helpers: number) => string;
    colObjectWorks: string; remainingDaysLabel: (n: number) => string;
    actionChangeComposition: string; actionAssignWork: string; actionChangeForeman: string; actionActivate: string; actionPauseBrigade: string;
    toastCreatedDraft: string; toastCreated: string; toastPaused: string; toastActivated: string; toastDuplicated: string; toastDeleted: string;
    deleteConfirmTitle: string; deleteConfirmDescription: (name: string) => string;
    createModalTitle: string; createModalDescription: string; saveDraftButton: string; defaultNamePrefix: (n: number) => string;
    fieldName: string; fieldSpecialization: string; fieldSpecializationPlaceholder: string;
    fieldForemanName: string; fieldForemanNamePlaceholder: string;
    fieldDescriptionPlaceholderBrigade: string;
    fieldCurrentWork: string; fieldCurrentWorkPlaceholder: string;
    fieldTargetEfficiency: string; fieldCreatedDate: string;
    errorNameRequired: string; errorSpecializationRequired: string; errorForemanRequired: string;
    errorMembersRequired: string; errorForemanIsMember: string; errorPlannedEndBeforeStartBrigade: string; errorEfficiencyRange: string;
    notDefined: string; notAssigned: string;
    teamBuilderTitle: string; searchEmployeePlaceholder: string; allSpecialtiesOption: string; nobodyFound: string;
    selectedCountLabel: (n: number) => string; addMembersHint: string; removeMemberAriaLabel: (name: string) => string;
    detailsDefaultTitle: string;
    compositionLabel: (count: number, workers: number, helpers: number) => string;
    remainingDaysPlain: (n: number) => string;
    efficiencyLabel: string; hoursWorkedLabel: (n: number) => string; hoursWorkedTitle: string;
    attendanceTitle: string; payrollFundTitle: string; compositionCountTitle: (n: number) => string;
    foremanTag: string; brigadirTag: string; documentsTitle: string; noDocuments: string;
    compositionPageTitle: string; compositionPageSubtitle: string; compositionSearchPlaceholder: string;
    kpiTotalInBrigades: string; kpiActiveOnShift: string; kpiActiveOnShiftFooter: (pct: number) => string;
    kpiFreeSpecialists: string; kpiReadyToAssign: string; kpiAverageCompleteness: string; kpiAllBrigadesFooter: string;
    addEmployeeButton: string; compositionEmptyTitle: string; compositionPaginationItemLabel: string;
    upcomingChangesTitle: string; allChangesLink: string;
    changeTypeTransfer: string; changeTypeAssignment: string; changeTypeReplacement: string;
    completenessTitle: string; completenessExcellent: string; completenessGood: string; completenessAverage: string; completenessLow: string;
    colEmployee: string; gradeSuffix: (n: number) => string; colBrigadeRole: string; colObjectShift: string;
    roleFilterAriaLabel: string; roleAllLabel: string;
    actionTransfer: string; actionChangeRole: string; actionChangeShift: string; actionChangeStatus: string; actionRemoveFromBrigade: string;
    toastEmployeeAdded: string; toastShiftUpdated: string; toastStatusUpdated: string; toastEmployeeTransferred: string; toastEmployeeRemoved: string;
    removeConfirmTitle: string; removeConfirmDescription: (name: string, brigade: string) => string;
    transferModalTitle: string; transferModalDescription: string; confirmTransferButton: string;
    currentBrigadeLabel: string; newBrigadeLabel: string; newRoleLabel: string;
    roleWorker: string; roleHelper: string; roleBrigadir: string; roleForeman: string;
    transferDateLabel: string; reasonLabel: string; reasonPlaceholder: string;
    replaceEmployeeLabel: string; doNotReplaceOption: string;
    warningOverCapacity: string; warningActiveWork: string;
    errorNewBrigadeDifferent: string; errorTransferDateRequired: string;
    toastChangeCompositionUnavailable: string; toastAssignWorkUnavailable: string; toastChangeForemanUnavailable: string;
    toastFullAssignmentsListUnavailable: string; toastFullChangesListUnavailable: string;
    addEmployeeModalTitle: string; addEmployeeModalDescription: string;
    photoLabel: string; replacePhotoButton: string; uploadPhotoButton: string; removePhotoButton: string; photoPreviewAlt: string;
    errorPhotoType: string; errorPhotoSize: string;
    fieldFirstName: string; fieldLastName: string;
    fieldSpecialty: string; fieldSpecialtyPlaceholder: string;
    fieldGrade: string; fieldMemberRole: string; fieldShift: string; fieldAssignedDate: string;
    errorFirstNameRequired: string; errorLastNameRequired: string; errorPhoneFormat: string; errorPhoneTaken: string;
    errorSpecialtyRequired: string; errorBrigadeRequired: string; errorGradeRange: string;
    detailsEmployeeDefaultTitle: string; brigadeAndObjectTitle: string;
    performanceLabel: string; accruedTitle: string; qualificationLabel: string; noBrigadeAssigned: string;
    weekdayMon: string; weekdayTue: string; weekdayWed: string; weekdayThu: string; weekdayFri: string; weekdaySat: string; weekdaySun: string;
    calendarTitle: string; prevMonthAriaLabel: string; nextMonthAriaLabel: string; clearDateSelection: string;
    monthJan: string; monthFeb: string; monthMar: string; monthApr: string; monthMay: string; monthJun: string;
    monthJul: string; monthAug: string; monthSep: string; monthOct: string; monthNov: string; monthDec: string;
    assignmentStatusActive: string; assignmentStatusCompleted: string; assignmentStatusCancelled: string; assignmentStatusOverdue: string;
  };
  employees: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string; searchPlaceholderShort: string;
    statusAll: string; statusActive: string; statusVacation: string; statusDismissed: string;
    kpiTotal: string; kpiActiveFooterPrefix: string;
    kpiWorkers: string; kpiEngineers: string; kpiAdmins: string; kpiPercentOfTotal: (n: number) => string;
    filterPositionAriaLabel: string; allPositionsOption: string; allBrigadesOption: string; allStatusesOption: string;
    resetFiltersAriaLabel: string;
    colEmployee: string; idPrefixLabel: (id: string) => string;
    colPosition: string; colUnit: string; colHireDate: string;
    selectAllRowsAriaLabel: string; selectRowAriaLabel: (name: string) => string;
    viewEmployeeAriaLabel: string; editEmployeeAriaLabel: string;
    emptyTitle: string; paginationItemLabel: string; addEmployeeButton: string;
    csvId: string; csvFullName: string; csvUnit: string; csvHireDate: string; csvPosition: string; csvPhone: string; csvStatus: string;
    toastUpdated: string; toastCreated: string; toastTransferred: (name: string) => string; toastDeleted: string; toastExported: string;
    deleteConfirmTitle: string; deleteConfirmDescription: (name: string) => string;
    contactInfoTitle: string; genderMale: string; workInfoTitle: string; ageYearsLabel: (age: number) => string;
    tenureYearsMonths: (years: number, months: number) => string; tenureYearsOnly: (years: number) => string; tenureMonthsOnly: (months: number) => string;
    fieldEmploymentType: string; fieldTenure: string; fieldSalary: string;
    documentsTitle: string; fieldPassport: string; fieldInn: string;
    laborContractLabel: string; downloadButton: string; contractDownloadedToast: (name: string) => string;
    filterCategoryTitle: string; categoryWorkers: string; categoryEngineers: string; categoryAdmin: string;
    hireDateFromLabel: string; hireDateToLabel: string;
    transferModalTitle: string; transferModalDescription: (name: string, unit: string) => string; transferButton: string;
    unitTypeLabel: string; unitTypeBrigade: string; unitTypeDepartment: string; newDepartmentLabel: string;
    formAddTitle: string; formEditTitle: string; formDescription: string;
    fieldFullName: string; fieldFullNamePlaceholder: string;
    fieldPositionInput: string; fieldPositionPlaceholder: string;
    fieldCategory: string; categoryWorker: string; categoryEngineer: string; categoryAdminOpt: string;
    fieldDepartment: string; fieldPhonePlaceholder: string;
    fieldEmail: string; fieldEmailPlaceholder: string; fieldBirthDate: string;
    fieldAddress: string; fieldAddressPlaceholder: string; fieldSalaryForm: string;
    errorFullNameRequired: string; errorPositionRequired: string; errorPhoneRequired: string;
    errorHireDateRequired: string; errorEmailRequired: string; errorBirthDateRequired: string; errorSalaryPositive: string;
  };
  assignments: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string; createAssignment: string;
    kpiTotal: string; kpiTotalFooter: string; kpiActive: string; kpiCompleted: string; kpiCancelledOrOverdue: string;
    kpiPercentOfTotal: (n: number) => string;
    listTitle: string;
    statusAllLabel: string; objectAllLabel: string; brigadeAllLabel: string; foremanAllLabel: string; allForemenOption: string;
    emptyTitle: string; paginationItemLabel: string;
    colNumber: string; colObjectWork: string; colBrigadeForeman: string; colAmountShort: string;
    actionView: string; actionCancel: string;
    toastCompleted: string; toastCancelled: string; toastUpdated: string; toastCreated: string; toastDeleted: string;
    deleteConfirmTitle: string; deleteConfirmDescription: (number: number, objectName: string) => string;
    defaultTitle: string; numberTitle: (n: number) => string; periodWorksLabel: string; amountLabel: string;
    completeButton: string; cancelButton: string;
    editModalTitle: string; formDescription: string;
    fieldWorkTitle: string; fieldPeriodStart: string; fieldPeriodEnd: string; fieldAmountSomoni: string; fieldProgressPercent: string;
    errorAmountPositive: string; errorPeriodStartRequired: string; errorPeriodEndRequired: string;
    noUpcomingAssignments: string;
  };
  brigadirDashboard: {
    pageTitle: string; pageSubtitle: string;
    brigadeNotFoundTitle: string; brigadeNotFoundDescription: string;
    crewCompositionLabel: string; crewCountValue: (n: number) => string; crewNote: (onSite: number, absent: number) => string;
    assignedWorksLabel: string; assignedWorksNote: (inProgress: number, overdue: number) => string;
    attendanceLabel: string; attendanceNote: (n: number) => string; noDataLabel: string;
    efficiencyLabel: string; statusNote: (label: string) => string;
    myCrewTitle: string; allCrewLink: string; colSpecialty: string; noCrewYet: string;
    crewWorksTitle: string; allWorksLink: string; noActiveWorks: string;
    worksSummaryTitle: string;
    criticalMaterialsTitle: string; noCriticalMaterials: string; goToMaterialsButton: string;
    briefSummaryTitle: string; summaryRemainingDaysLabel: string; callForemanButton: string;
  };
  brigadirWorks: {
    pageTitle: string; pageSubtitle: string;
    tabAllShort: string;
    kpiTotalAssigned: string; kpiPercentOfAssigned: (n: number) => string;
    emptyDescription: string;
    thisWeekTitle: string; noWeekWorks: string;
  };
  brigadirTeam: {
    pageSubtitle: string;
    kpiTotalEmployees: string; kpiOnSiteNow: string; onSiteFooter: string; kpiAbsentEmployees: string; absentFooter: string;
    crewCompositionTitle: (n: number) => string; fullEmployeeListLink: string;
    specialtiesInCrewTitle: string;
    upcomingWorksTitle: string;
    attendancePeriodTitle: string; presentLabel: string; lateLabel: string; absentLabel: string;
    noAttendanceRecords: string; openAttendanceButton: string;
    briefInfoTitle: string; brigadirLabel: string; foremanLabel: string; objectLabel: string; brigadeStatusLabel: string;
    callForemanWithPhone: (phone: string) => string;
  };
  brigadirMaterials: {
    pageTitle: string; pageSubtitle: string;
    kpiTotalMaterials: string; kpiTotalMaterialsFooter: string;
    kpiTotalStock: string; kpiTotalStockFooter: string;
    kpiInTransit: string; kpiInTransitFooter: string;
    kpiLowStock: string; kpiLowStockFooter: string;
    kpiRequestsPeriod: string; kpiRequestsPeriodFooter: string;
    tabStock: string; tabRequests: string; tabTransit: string; tabHistory: string; tabCategories: string;
    searchMaterialPlaceholder: string; searchRequestPlaceholder: string;
    allCategoriesOption: string; filterButton: string; exportButton: string; exportedToast: string;
    filterStatusLabel: string; allStatusesOption: string; applyFilterButton: string;
    lowStockOnlyChip: string;
    colMaterial: string; colCategory: string; colUnit: string; colStock: string; colMinStock: string; colStatus: string; colAction: string;
    detailsButton: string;
    emptyMaterialsTitle: string; emptyMaterialsDescription: string;
    paginationMaterialsLabel: string; paginationRequestsLabel: string; paginationHistoryLabel: string;
    statusNormal: string; statusLow: string; statusCritical: string; statusOutOfStock: string;
    warehouseStatusTitle: string; totalLabel: string;
    attentionBanner: (n: number) => string; attentionBannerHint: string;
    recentRequestsTitle: string; allRequestsLink: string; noRequestsYet: string; createRequestButton: string;
    colRequestNumber: string; colRequestMaterial: string; colRequestQuantity: string; colRequestDate: string; colRequestStatus: string;
    requestStatusNew: string; requestStatusApproved: string; requestStatusInTransit: string; requestStatusIssued: string; requestStatusRejected: string;
    emptyRequestsTitle: string; emptyRequestsDescription: string;
    colTransitDocument: string; colTransitMaterials: string; colTransitRoute: string; colTransitDate: string; colTransitStatus: string;
    emptyTransitTitle: string; emptyTransitDescription: string;
    unitsShortLabel: string;
    emptyHistoryTitle: string;
    receivedLabel: (name: string) => string; writtenOffLabel: (name: string) => string; movedLabel: (from: string, to: string) => string;
    categoryItemsLabel: (n: number) => string; somoniLabel: string;
    createModalTitle: string; createModalDescription: string;
    fieldMaterial: string; fieldQuantity: string; fieldNote: string; fieldNotePlaceholder: string; fieldNoteOptionalSuffix: string;
    cancelButton: string; submitRequestButton: string;
    errorSelectMaterial: string; errorQuantityInvalid: string;
    requestCreatedToast: string;
    drawerTitle: string; warehouseLabel: string; unitLabel: string; currentStockLabel: string; minStockLabel: string;
    priceLabel: string; totalValueLabel: string; noteLabel: string;
    recentReceiptsTitle: string; recentWriteOffsTitle: string; transferHistoryTitle: string; noDataLabel: string;
  };
  brigadirReports: {
    pageTitle: string; pageSubtitle: string;
    tabOverview: string; tabWorks: string; tabMaterials: string; tabFinance: string; tabBrigade: string; tabAttendance: string;
    kpiTotalWorks: string; kpiCompletedWorks: string; kpiCompletedWorksFooter: (percent: number) => string;
    kpiOverdueWorks: string; kpiAverageProgress: string; kpiTotalExpenses: string; expensesFooter: string;
    allObjectsOption: string; allBrigadesOption: string; filterButton: string; exportButton: string;
    dynamicsTitle: string; seriesPlanned: string; seriesActual: string; seriesRate: string;
    statusDistributionTitle: string; priorityTitle: string;
    topObjectsTitle: string; colObject: string; colTotalWorks: string; colCompleted: string; colProgress: string; colChange: string; allObjectsLink: string;
    expensesByCategoryTitle: string; colCategory: string; colAmount: string; expenseMaterials: string; expenseLabor: string;
    periodSummaryTitle: string; summaryPeriod: string; summaryObjects: string; summaryBrigades: string; summaryWorkers: string; summaryWorkDays: string;
    exportPanelTitle: string; exportPanelHint: string; exportPdf: string; exportExcel: string; exportCsv: string; configureReportButton: string;
    noBrigadeTitle: string; noBrigadeDescription: string;
    emptyChartData: string; emptyTableData: string;
    csvExportedToast: string; printPreparedToast: string;
    workStatusCompleted: string; workStatusInProgress: string; workStatusOnReview: string; workStatusOverdue: string; workStatusOther: string;
    priorityHigh: string; priorityMedium: string; priorityLow: string;
    worksTabColWork: string; worksTabColObject: string; worksTabColProgress: string; worksTabColStatus: string;
    materialsTabTotal: string; materialsTabLowStock: string; materialsTabRequests: string; materialsTabOpenButton: string;
    financeTabBudgetTitle: string; financeTabPlanLabel: string; financeTabActualLabel: string; financeTabVarianceLabel: string; financeTabNoBudget: string;
    brigadeTabTitle: string; brigadeTabMembers: string; brigadeTabEfficiency: string; brigadeTabForeman: string; brigadeTabObject: string;
    attendanceTabPresent: string; attendanceTabLate: string; attendanceTabAbsent: string;
    vsPreviousPeriod: string; allObjectsLinkGeneric: string; expensesDetailsLink: string; specialtiesTitle: string;
  };
  worker: {
    sidebarDashboard: string; sidebarTasks: string; sidebarAttendance: string; sidebarSchedule: string; sidebarMaterials: string;
    sidebarPhotoReports: string; sidebarNotifications: string; sidebarProfile: string; sidebarReportProblem: string;
    greetingMorning: string; greetingDay: string; greetingEvening: string; dashboardSubtitle: string;
    kpiTasksTitle: string; kpiTasksFooter: string; kpiInProgressTitle: string; kpiInProgressFooter: string;
    kpiCompletedTitle: string; kpiCompletedFooter: string; kpiHoursTitle: string; kpiHoursFooter: string;
    tasksTitle: string; tasksTabAll: (n: number) => string; tasksTabInProgress: (n: number) => string;
    tasksTabReview: (n: number) => string; tasksTabCompleted: (n: number) => string; sortByPriority: string; viewAllTasks: string;
    statusAssigned: string; statusInProgress: string; statusReview: string; statusCompleted: string; statusOverdue: string; statusPlanned: string; statusPaused: string; statusCancelled: string;
    priorityLow: string; priorityMedium: string; priorityHigh: string; priorityCritical: string;
    emptyTasks: string; emptySchedule: string; emptyNotifications: string; emptyDocuments: string;
    colTotalWorks: string; colCompleted: string;
    taskDetailTitle: string; taskDetailObject: string; taskDetailDates: string; taskDetailProgress: string;
    taskDetailStatus: string; taskDetailPriority: string; taskDetailAssignedBy: string; taskDetailComments: string;
    actionStart: string; actionSubmitReview: string; actionUploadPhoto: string; actionReportProblemLong: string; actionUpdateProgress: string; actionSaveProgress: string;
    scheduleTitle: (date: string) => string; scheduleBreak: string; scheduleMeeting: string; viewFullSchedule: string;
    notificationsTitle: string; notificationsAllLink: string;
    statsTitle: string; statsHours: string; statsCompleted: string; statsRating: string; statsViolations: string;
    ratingHigh: string; ratingMedium: string; ratingLow: string; violationsGood: string; violationsPresent: string;
    documentsTitle: string; allDocumentsLink: string;
    quickActionsTitle: string; actionPhotoReport: string; actionRequestMaterial: string; actionReportProblemShort: string;
    actionMessageProrab: string; actionCall: string; actionViewSchedule: string;
    photoModalTitle: string; photoModalTask: string; photoModalTaskPlaceholder: string; photoModalImage: string; photoModalComment: string; photoModalCommentPlaceholder: string; photoModalSubmit: string;
    materialModalTitle: string; materialModalName: string; materialModalQty: string; materialModalUnit: string; materialModalNote: string; materialModalSubmit: string;
    problemModalTitle: string; problemModalCategory: string; problemModalTask: string; problemModalNoTask: string; problemModalDescription: string; problemModalPriority: string; problemModalSubmit: string;
    problemCategorySafety: string; problemCategoryMaterials: string; problemCategoryEquipment: string; problemCategoryOther: string;
    messageModalTitle: string; messageModalText: string; messageModalPlaceholder: string; messageModalSubmit: string;
    toastPhotoSubmitted: string; toastMaterialRequested: string; toastProblemReported: string; toastMessageSent: string; toastMarkedRead: string;
    attendancePageTitle: string; attendancePageSubtitle: string; attendanceColDate: string; attendanceColArrival: string; attendanceColDeparture: string; attendanceColStatus: string; attendanceColHours: string;
    attendanceColObject: string; attendanceColNote: string;
    kpiAttendanceTotalTitle: string; kpiAttendanceTotalFooter: string; kpiPresentTitle: string; kpiPresentFooter: string; kpiLateTitle: string; kpiLateFooter: string; kpiAbsentTitle: string; kpiAbsentFooter: string;
    attendanceHistoryTitle: string; attendanceTabAll: string; attendanceTabPresent: string; attendanceTabLate: string; attendanceTabAbsent: string;
    statusDayOff: string; noteDayOff: string; attendanceStatusPresent: string; attendanceStatusLate: string; attendanceStatusAbsent: string; statusNoData: string;
    weeklyAnalyticsTitle: string; normLabel: string; factLabel: string; latesLabel: string; absencesLabel: string;
    tooltipStatusLabel: string; tooltipCheckIn: string; tooltipCheckOut: string; tooltipLate: string; tooltipWorked: string;
    todayTimelineArrival: string; todayTimelineLunchStart: string; todayTimelineLunchEnd: string; todayTimelineDeparture: string; emptyTimeline: string;
    dailySummaryTitle: string; dailySummaryPresence: string; dailySummaryLate: string; dailySummaryOvertime: string; dailySummaryAttendance: string; dailySummaryYes: string; dailySummaryNo: string;
    remindersTitle: string; emptyReminders: string;
    shortSummaryTitle: string; shortSummaryObject: string; shortSummaryProrab: string; shortSummaryNextCheck: string; shortSummaryActiveTasks: string; contactProrabButton: string;
    emptyAttendance: string; thisMonth: string; lastSevenDays: string; lastThirtyDays: string;
    schedulePageTitle: string; schedulePageSubtitle: string;
    kpiWorkdaysTitle: string; kpiWorkdaysFooter: string; kpiTodayShiftTitle: string; kpiTodayShiftFooter: string;
    kpiNextDayOffTitle: string; kpiNextDayOffFooter: (days: number) => string; kpiWorkedHoursTitle: string; kpiWorkedHoursFooter: string;
    calendarShiftsTitle: string; legendWorkday: string; legendDayOff: string; legendOvertime: string; legendBriefing: string;
    weekScheduleTitle: string; weekScheduleColDay: string; weekScheduleColDate: string; weekScheduleColTime: string; weekScheduleColStatus: string; weekScheduleColObject: string;
    statusFullShift: string; statusShortShift: string;
    upcomingEventsTitle: string; hoursWorkedTitle: string; planHoursLabel: string; overtimeHoursLabel: string;
    monthSummaryTitle: string; summaryWorkdays: string; summaryDaysOff: string; summaryOvertime: string; summaryAvgAttendance: string;
    materialsPageTitle: string; materialsPageSubtitle: string; materialsRequestButton: string; materialsColMaterial: string; materialsColQty: string; materialsColStatus: string; materialsColDate: string; emptyMaterialRequests: string;
    materialsTabAvailable: string; materialsTabMyRequests: string; materialsTabHistory: string;
    materialsKpiTotalTitle: string; materialsKpiAvailableTitle: string; materialsKpiReservedTitle: string; materialsKpiExpectedTitle: string; materialsKpiFooter: (amount: string) => string; materialsUnitsSuffix: string; materialsCurrencySuffix: string;
    materialsSearchPlaceholder: string; materialsAllCategories: string; materialsUnitFilterPlaceholder: string; materialsAvailabilityFilterLabel: string; materialsAllAvailability: string; materialsResetFilters: string;
    materialsColCategory: string; materialsColUnit: string; materialsColInStock: string; materialsColReserved: string; materialsColAvailable: string; materialsColPrice: string;
    materialsResultsSummary: (from: number, to: number, total: number) => string;
    emptyMaterialsSearch: string; emptyMaterialsSearchDescription: string; emptyMaterialRequestsHistory: string;
    materialsRequestCardTitle: string; materialsRequestMaterialPlaceholder: string; materialsRequestQtyPlaceholder: string; materialsRequestUnitPlaceholder: string; materialsRequestCommentPlaceholder: string;
    materialsErrorMaterialRequired: string; materialsErrorQtyRequired: string;
    categoryStockTitle: string; categoryStockCollapseAction: string;
    recentRequestsTitle: string; recentRequestsAllAction: string;
    photoReportsPageTitle: string; photoReportsPageSubtitle: string; photoReportsNewButton: string; emptyPhotoReports: string; photoReportsCardTitle: string;
    photoKpiUploadedTitle: string; photoKpiUploadedFooter: string; photoKpiTodayTitle: string; photoKpiTodayFooter: string;
    photoKpiPendingTitle: string; photoKpiPendingFooter: string; photoKpiApprovedTitle: string; photoKpiApprovedFooter: string;
    photoStatusPending: string; photoStatusApproved: string; photoStatusRejected: string;
    photoFilterAll: string; photoFilterToday: string; photoFilterAllWorks: string; photoUploadButton: string;
    photoResultsSummary: (from: number, to: number, total: number) => string; photoViewAction: string;
    emptyPhotoReportsFiltered: string; emptyPhotoReportsFilteredDescription: string; photoReviewerCommentLabel: string;
    photoUploadCardTitle: string; photoDropzoneTitle: string; photoDropzoneSubtitle: string;
    photoUploadWorkLabel: string; photoUploadWorkPlaceholder: string; photoUploadObjectLabel: string; photoUploadObjectPlaceholder: string;
    photoErrorMaxImages: string; photoErrorFileType: string; photoErrorFileSize: string; photoErrorWorkRequired: string; photoErrorImagesRequired: string;
    photoActivityTitle: string; photoActivityUploaded: string; photoActivityApproved: string;
    photoCommentsTitle: string; photoCommentsToday: string; photoCommentsYesterday: string;
    photoSummaryTitle: string; photoSummaryTotalTasks: string; photoSummaryPendingPhotos: string; photoSummaryNextCheck: string; photoSummaryRemarks: string; photoSummaryGoToTasks: string;
    photoQuickActionsTitle: string; photoActionTakePhoto: string; photoActionChooseGallery: string; photoActionMyTasks: string; photoActionContactProrab: string;
    notificationsPageTitle: string; notificationsPageSubtitle: string; markAllRead: string;
    notificationTabAll: string; notificationTabUnread: string; notificationTabImportant: string; notificationTabSystem: string;
    emptyNotificationsFiltered: string; emptyNotificationsFilteredDescription: string; notificationUnreadLabel: string;
    notificationPriorityImportant: string; notificationPriorityNormal: string; notificationPrioritySystem: string;
    notificationsResultsSummary: (count: number) => string;
    notificationFiltersTitle: string; notificationFilterTypeLabel: string; notificationAllTypes: string;
    notificationTypeTask: string; notificationTypeMaterials: string; notificationTypeSchedule: string; notificationTypePhotoReport: string; notificationTypeReminder: string; notificationTypeSystem: string;
    notificationFilterDateLabel: string; notificationFilterPriorityLabel: string; notificationAllPriorities: string; notificationResetFilters: string;
    notificationSummaryTitle: string; notificationSummaryTotal: string; notificationSummaryUnread: string; notificationSummaryImportant: string; notificationSummarySystem: string;
    notificationPushTitle: string; notificationPushDescription: string; notificationPushEnabled: string; notificationPushDenied: string; notificationPushUnsupported: string; notificationPushEnableButton: string;
    documentsPageTitle: string; documentsPageSubtitle: string;
    profilePageTitle: string; profilePageSubtitle: string; profileBrigade: string; profileObject: string; profileSpecialty: string; profileGrade: string; profilePhone: string;
    profileStatusActive: string; profileStatusInactive: string; profileEditButton: string; profileChangePhotoButton: string; profileSaveButton: string;
    profileErrorFirstNameRequired: string; profileErrorLastNameRequired: string; profileErrorPhoneInvalid: string; profileErrorEmailInvalid: string;
    profileToastUpdated: string; profileToastPhotoUpdated: string;
    profileFieldFirstName: string; profileFieldLastName: string; profileFieldEmail: string; profileFieldAddress: string; profileFieldEmergencyContact: string;
    profileFieldBirthDate: string; profileFieldPassport: string; profileFieldHiredAt: string; profileFieldSection: string; profileFieldExperience: string; profileFieldForeman: string;
    profileProfessionalInfoTitle: string; profilePersonalInfoTitle: string; profileSkillsTitle: string;
    profileGradeValue: (grade: number) => string; profileYearsValue: (years: number) => string;
    profileStatsTitle: string; profileStatsTotalLabel: string; profileStatCompletedTasks: string; profileStatPhotoReports: string; profileStatRemarks: string; profileStatAttendance: string;
    profileActivityTitle: string; profileActivityAttendance: string; profileActivityPhoto: string; profileActivityMaterials: string; profileActivityTask: string;
    profileSettingsTitle: string; profileSettingPush: string; profileSettingSms: string; profileSettingTelegram: string; profileSettingVisibility: string; profileSettingLanguage: string;
    profileDocumentsTitle: string; profileDocumentValidUntil: (date: string) => string; profileDocumentUploaded: string; profileDocumentOpenButton: string; profileDocumentOpened: string; profileDocumentMissing: string;
    profileKpiExperienceTitle: string; profileKpiTasksTitle: string; profileKpiTasksFooter: string; profileKpiHoursTitle: string; profileKpiHoursFooter: string; profileKpiAttendanceTitle: string; profileKpiAttendanceFooter: string;
    materialStatusNew: string; materialStatusApproved: string; materialStatusInTransit: string; materialStatusIssued: string; materialStatusRejected: string;
    kpiTotalTasksTitle: string; kpiReviewTitle: string; kpiReviewFooter: string; kpiOverdueTitle: string; kpiOverdueFooter: string;
    filterButton: string; sortByPriorityOption: string; sortByDueDate: string; sortByProgress: string; sortNewest: string; sortOldest: string;
    filterPriorityLabel: string; filterObjectLabel: string; filterOverdueOnly: string; filterAllObjects: string; filterApply: string; filterReset: string;
    tasksResultsSummary: (from: number, to: number, total: number) => string; paginationPrev: string; paginationNext: string;
    monthlyStatsTitle: string; monthlyStatsCompletedTasks: string; monthlyStatsCompletedWorks: string; monthlyStatsHours: string; monthlyStatsAvgProgress: string;
    upcomingTasksTitle: string; upcomingTasksAll: string; upcomingTasksEmpty: string;
    tasksQuickActionsTitle: string;
  };
  objects: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string;
    tabAll: string; tabActive: string; tabAtRisk: string; tabCompleted: string;
    kpiTotal: string; kpiTotalFooter: string;
    kpiInWork: string; kpiCompleted: string; kpiAtRisk: string; kpiPercentOfTotal: (n: number) => string;
    listTitle: string; addObject: string;
    colCity: string; colForeman: string; colProgress: string; colBudget: string; colDeadline: string;
    actionViewObject: string;
    emptyTitle: string;
    chartTitle: string; chartModeProgress: string; chartModeBudget: string; chartPeriodAriaLabel: string;
    chartSeriesPlanned: string; chartSeriesActual: string;
    summaryTitle: string; summaryDeadlineChip: (date: string) => string;
    summaryStartDate: string; summaryDeadline: string; summaryBudget: string; summarySpent: string; summaryRemaining: string;
    summaryProgress: string; summaryOpenDetail: string;
    taskListTitle: string; taskOverdue: string; taskToday: string; taskPlanned: string; taskListAllLink: string;
    addModalTitle: string; addModalDescription: string; saveObjectButton: string;
    fieldName: string; fieldNamePlaceholder: string;
    fieldType: string;
    fieldCity: string; fieldCityPlaceholder: string;
    fieldAddress: string; fieldAddressPlaceholder: string;
    fieldForeman: string; fieldForemanPlaceholder: string;
    fieldStatus: string;
    fieldStartDate: string; fieldDeadline: string;
    fieldBudget: string; fieldProgress: string;
    fieldImage: string; fieldImageUploadHint: string; fieldImagePreviewAlt: string;
    fieldDescription: string; fieldDescriptionPlaceholder: string;
    errorNameRequired: string; errorCityRequired: string; errorAddressRequired: string; errorForemanRequired: string;
    errorStartDateRequired: string; errorDeadlineRequired: string; errorDeadlineBeforeStart: string;
    errorProgressRange: string;
    objectTypeOptions: Record<
      "residential" | "business" | "cottage" | "warehouse" | "school" | "clinic" | "mall" | "service" | "hotel" | "sport" | "factory",
      string
    >;
    filterDrawerTitle: string; filterCity: string; filterForeman: string;
    filterMinProgress: string; filterMaxProgress: string; filterMinBudget: string; filterMaxBudget: string;
    deleteConfirmTitle: string; deleteConfirmDescription: (name: string) => string;
    toastCreated: string; toastDeleted: string;
  };
  estimates: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string; newEstimateButton: string;
    kpiTotal: string; kpiTotalOfPrefix: string;
    kpiApproved: string; kpiPendingReview: string; kpiDraft: string;
    colNumber: string; colVersion: string; colAmount: string; colResponsible: string;
    filterObjectAriaLabel: string; filterStatusAriaLabel: string;
    statusAllLabel: string; allObjectsOption: string;
    statusDraft: string; statusPendingReview: string; statusApproved: string;
    emptyTitle: string; paginationItemLabel: string;
    budgetChartTitle: string;
    categorySpendTitle: string; categorySpendCenterLabel: string;
    summaryTitle: string; summaryNumberLabel: string; summaryDateCreated: string; summaryDateUpdated: string;
    summaryTotalBudget: string;
    openEstimateButton: string; downloadPdfButton: string;
    riskCardTitle: string; riskAllLink: string;
    filterResponsiblePlaceholder: string; filterMinAmount: string; filterMaxAmount: string;
    deleteConfirmTitle: string; deleteConfirmDescription: (number: string) => string;
    toastCreated: string; toastDeleted: string; toastOpenUnavailable: string; toastRiskOpened: (title: string) => string;
    addModalTitle: string; addModalDescription: (number: string) => string;
    fieldVersion: string; fieldAmount: string; fieldDate: string;
    fieldResponsiblePlaceholder: string;
    errorAmountPositive: string; errorDateRequired: string; errorResponsibleRequired: string;
    categoryLabels: Record<string, string>;
    riskDescriptionLabels: Record<string, string>;
  };
  budgets: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string;
    tabAll: string; tabActive: string; tabCompleted: string; tabOverBudget: string;
    kpiTotalBudget: string; kpiTotalBudgetFooter: string;
    kpiApprovedBudget: string; kpiApprovedFooter: (pct: number) => string;
    kpiActualSpent: string; kpiActualSpentFooter: (pct: number) => string;
    kpiOverBudget: string; kpiOverBudgetFooter: (n: number) => string;
    listTitle: string; addBudget: string; paginationItemLabel: string;
    colSpent: string; colRemaining: string; colUsage: string; colOverspend: string;
    actionViewBudget: string;
    emptyTitle: string;
    chartTitle: string; distributionTitle: string; centerLabel: string;
    seriesTotalBudget: string; seriesRemaining: string;
    operationsTitle: string; opColAction: string; allOperationsLink: string;
    riskCardTitle: string; riskAllLink: string;
    summaryTitle: string; summaryPeriodLabel: string; summaryUpdatedDate: string;
    editBudgetButton: string; exportPdfButton: string;
    addModalTitle: string; addModalDescription: string;
    fieldPeriodStart: string; fieldPeriodEnd: string;
    statusPendingApproval: string; statusOverBudget: string;
    errorPeriodStartRequired: string; errorPeriodEndRequired: string; errorPeriodEndBeforeStart: string;
    deleteConfirmTitle: string; deleteConfirmDescription: (name: string) => string;
    toastCreated: string; toastDeleted: string; toastEditUnavailable: string; toastRiskOpened: (title: string) => string;
    categoryLabels: Record<string, string>;
    operationActionLabels: Record<string, string>;
    riskDescriptionLabels: Record<string, string>;
  };
  users: {
    pageTitle: string; pageSubtitle: string; searchPlaceholder: string;
    kpiTotal: string; kpiTotalSuffix: string;
    kpiActive: string; kpiActiveSuffix: string;
    kpiInactive: string; kpiInactiveSuffix: string;
    kpiAdmins: string; kpiAdminsSuffix: string;
    kpiRoles: string; kpiRolesSuffix: string;
    addUser: string; export: string;
    tabAll: string; tabActive: string; tabInactive: string;
    colSelectAll: string; colUser: string; colRole: string; colPhone: string; colEmail: string; colStatus: string; colRegisteredAt: string; colActions: string;
    selectUser: (name: string) => string;
    statusActive: string; statusInactive: string; statusBlocked: string;
    actionView: string; actionEdit: string; actionChangeStatus: string; actionChangeStatusDisabled: string;
    paginationItemLabel: string;
    filtersTitle: string; filterSearch: string; filterSearchPlaceholder: string;
    filterRole: string; filterAllRoles: string;
    filterStatus: string; filterAllStatuses: string; filterActiveStatus: string; filterInactiveStatus: string; filterBlockedStatus: string;
    filterRegisteredDate: string; filterApply: string; filterReset: string;
    roleDistributionTitle: string;
    modalAddTitle: string; modalEditTitle: string; modalViewTitle: string; modalAddDescription: string;
    fieldFullName: string; fieldFullNamePlaceholder: string;
    fieldLogin: string; fieldLoginPlaceholder: string;
    fieldEmail: string; fieldEmailPlaceholder: string;
    fieldPhone: string; fieldPhonePlaceholder: string;
    fieldRole: string; fieldStatus: string;
    buttonClose: string; buttonCancel: string; buttonAdd: string; buttonSave: string;
    errorRequiredFields: string; errorPhoneFormat: string; errorLoginTaken: string;
    csvUser: string; csvRole: string; csvPhone: string; csvEmail: string; csvStatus: string;
  };
  dashboard: {
    pageTitle: string; pageSubtitle: string;
    kpiTotalBudget: string; kpiSpent: (v: string) => string;
    kpiActiveObjects: string; kpiInProgress: (n: number) => string; kpiCompletedObjects: (n: number) => string;
    kpiPayrollDebt: string; kpiNextPayment: (d: string) => string; kpiNotScheduled: string;
    kpiCompletedWorks: string; kpiOverallProgress: string;
    periodWeek: string; periodMonth: string; periodQuarter: string; periodYear: string;
    objectsStateTitle: string; viewAllObjects: string;
    colObject: string; colForeman: string; colProgress: string; colBudget: string; colStatus: string;
    attentionTitle: string; attentionOpen: string; overdueBy: (n: number) => string; stockDepleted: string; stockLow: string;
    budgetChartTitle: string;
    budgetTotal: string; budgetSpent: string; budgetRemaining: string; budgetOver: string;
    payrollApprovedTitle: string; payrollPeriod: (p: string) => string; payrollToPay: (v: string) => string;
    payrollToApproveTitle: string; payrollPeriodLabel: string; payrollEmployeeCount: string; payrollAccrued: string; payrollDeductions: string; payrollTotalToPay: string; payrollPreparedBy: (n: string) => string;
    payrollReturned: string;
    payrollApprove: string; payrollReturnToAccountant: string;
    payrollApproveConfirmTitle: string; payrollApproveConfirmDescription: (p: string, v: string) => string; payrollApproveConfirmLabel: string;
    payrollReturnModalTitle: string; payrollReturnModalDescription: string;
    payrollReturnCancel: string; payrollReturnConfirm: string;
    payrollCommentLabel: string; payrollCommentPlaceholder: string;
    toastApproved: string; toastReturned: string;
  };
  settings: {
    pageTitle: string;
    pageSubtitle: string;
    searchPlaceholder: string;
    searchResults: string;
    noResultsFound: string;
    openAction: string;
    save: string;
    savedAt: string;
    support: string;
    documentation: string;
    footerCopyright: string;
    tabs: { general: string; company: string; finance: string; notifications: string; security: string; integrations: string; backups: string };
    general: {
      generalCardTitle: string;
      language: string; languageDescription: string;
      timezone: string; timezoneDescription: string;
      dateFormat: string; dateFormatDescription: string;
      timeFormat: string; timeFormatDescription: string;
      currency: string; currencyDescription: string;
      measurement: string; measurementDescription: string;
      displayCardTitle: string;
      theme: string; themeDescription: string;
      themeLight: string; themeDark: string; themeSystem: string;
      accent: string; accentDescription: string;
      density: string; densityDescription: string;
      densityCompact: string; densityComfortable: string; densitySpacious: string;
      sidebarMode: string; sidebarModeDescription: string;
      sidebarCollapsed: string; sidebarExpanded: string;
      animations: string; animationsDescription: string;
      workCardTitle: string;
      automaticBackup: string; automaticBackupDescription: string;
      confirmDelete: string; confirmDeleteDescription: string;
      activityLog: string; activityLogDescription: string;
      autoCloseTasks: string; autoCloseTasksDescription: string;
      stockCheck: string; stockCheckDescription: string;
      documentsCardTitle: string;
      documentNumbering: string; documentNumberingDescription: string;
      documentPrefix: string; documentPrefixDescription: string;
      printForms: string; printFormsDescription: string;
      documentSignature: string; documentSignatureDescription: string;
      watermark: string; watermarkDescription: string;
      notImplemented: string;
    };
    company: {
      cardTitle: string;
      companyName: string; companyPhone: string; companyEmail: string; companyAddress: string; taxId: string;
      infoTitle: string; infoText: string;
    };
    finance: {
      cardTitle: string;
      currency: string; vatRate: string; fiscalYear: string; fiscalYearCalendar: string; fiscalYearApril: string;
      infoTitle: string; infoText: string;
    };
    notifications: {
      cardTitle: string;
      email: string; browser: string; deadlines: string; stock: string;
      infoTitle: string; infoText: string;
    };
    security: {
      cardTitle: string;
      sessionMinutes: string; twoFactor: string; passwordExpiry: string; loginAlerts: string;
      infoTitle: string; infoText: string;
    };
    integrations: {
      cardTitle: string;
      apiEnabled: string; apiUrl: string; webhookUrl: string; oneC: string; telegram: string;
      infoTitle: string; infoText: string;
    };
    backups: {
      cardTitle: string;
      automaticCopies: string; frequency: string; frequencyDaily: string; frequencyWeekly: string; frequencyMonthly: string;
      createBackup: string; restoreBackup: string;
      infoTitle: string; infoText: string;
    };
    systemInfo: {
      title: string; version: string; build: string; license: string; licenseActive: string; licenseType: string; licenseTypeValue: string;
      validUntil: string; usersLabel: string; storageLabel: string; storageOf: string;
    };
    systemActivity: {
      title: string; viewLog: string;
      login: string; documentCreated: string; dataChanged: string; userDeleted: string; backupCreated: string;
    };
  };
}

export const APP_STRINGS: Record<Language, AppStrings> = {
  ru: {
    sidebar: {
      dashboard: "Обзор", objects: "Объекты", estimatesAndBudgets: "Сметы и бюджеты", estimates: "Сметы", budgets: "Бюджеты",
      works: "Работы", brigades: "Бригады", brigadesList: "Список бригад", brigadesComposition: "Состав бригад",
      assignments: "Назначения", myBrigade: "Моя бригада", assignedWorks: "Назначение работ", employees: "Сотрудники",
      attendance: "Посещаемость", warehouse: "Склад и материалы", materials: "Материалы", receipts: "Поступления",
      writeOffs: "Списания", transfers: "Перемещения", stock: "Остатки", payroll: "Зарплаты", reports: "Отчёты",
      users: "Пользователи", settings: "Настройки", closeMenu: "Закрыть меню", logout: "Выйти",
    },
    header: {
      openMenu: "Открыть меню", searchPlaceholder: "Поиск...", notifications: "Уведомления", profile: "Профиль", settings: "Настройки", logout: "Выйти",
      demoNotificationOverdue: "Заливка фундамента просрочена", demoNotificationPayroll: "Зарплата за июль готова к утверждению",
      criticalMaterialsNotification: (count) => `${count} ${pluralizeRu(count, "материал", "материала", "материалов")} ${count === 1 ? "имеет" : "имеют"} критический остаток на складе`,
      justNow: "Только что",
      minutesAgo: (n) => `${n} ${pluralizeRu(n, "минуту", "минуты", "минут")} назад`,
      hoursAgo: (n) => `${n} ${pluralizeRu(n, "час", "часа", "часов")} назад`,
    },
    common: {
      statusInProgress: "В работе", statusAtRisk: "Есть риск", statusAlmostDone: "Почти готов", statusCompleted: "Завершён",
      open: "Открыть",
      paginationShown: (from, to, total, itemLabel) => `Показано ${from}–${to} из ${total} ${itemLabel}`,
      showPerPage: "Показывать по:", prevPage: "Предыдущая страница", nextPage: "Следующая страница",
      confirmLabel: "Подтвердить", cancelLabel: "Отмена",
      selectPlaceholder: "Выберите...", selectEmpty: "Ничего не найдено", selectSearch: "Поиск...", selectClear: "Очистить",
      placeholderTitle: "Раздел в разработке",
      placeholderNote: "Этот раздел скоро будет доступен. Мы работаем над тем, чтобы перенести сюда те же данные и интерактивность, что и на страницах «Обзор» и «Объекты».",
      roleLabels: { owner: "Владелец", administrator: "Администратор", accountant: "Бухгалтер", prorab: "Прораб", brigadir: "Бригадир", worker: "Работник", storekeeper: "Снабженец" },
      profileTitle: "Профиль", profileRole: "Роль", profilePhone: "Телефон", profileEmail: "Email", profileRegisteredAt: "Дата регистрации",
      save: "Сохранить", delete: "Удалить", edit: "Редактировать", view: "Просмотр",
      tableActions: "Действия", editUnavailableInDemo: "Редактирование пока недоступно в демо",
      emptyStateHint: "Измените параметры поиска или сбросьте фильтры", resetFiltersButton: "Сбросить фильтры",
      filtersButton: "Фильтры", resetButton: "Сбросить", applyButton: "Применить",
      colObject: "Объект", colStatus: "Статус", colDate: "Дата", colAmountSomoni: "Сумма, сомони",
      periodWeek: "Неделя", periodMonth: "Месяц", periodQuarter: "Квартал", periodYear: "Год",
      seriesPlanned: "Запланировано", seriesSpent: "Потрачено",
      responsibleLabel: "Ответственный", spentLabel: "Потрачено", remainingBudgetLabel: "Остаток бюджета", budgetUsageLabel: "Использование бюджета",
      totalBudgetLabel: "Общий бюджет", totalBudgetSomoniLabel: "Общий бюджет, сомони", dateCreatedLabel: "Дата создания",
      errorBudgetPositive: "Укажите бюджет больше нуля",
      statusDraft: "Черновик",
      riskBadgeLabels: { "Превышение": "Превышение", "Ожидает проверки": "Ожидает проверки", "Черновик": "Черновик" },
      colBrigade: "Бригада", colPhone: "Телефон",
      duplicateLabel: "Дублировать", completeLabel: "Завершить", progressLabel: "Прогресс", commentLabel: "Комментарий",
      exportButton: "Экспорт", descriptionLabel: "Описание",
      upcomingAssignmentsTitle: "Ближайшие назначения", allAssignmentsLink: "Все назначения →",
    },
    works: {
      pageTitle: "Работы", pageSubtitle: "Планирование, контроль и отслеживание выполнения работ", searchPlaceholder: "Поиск по работам...", addWork: "Добавить работу",
      tabAll: "Все работы", tabInProgress: "В процессе", tabCompleted: "Завершенные", tabOverdue: "Просроченные",
      kpiTotal: "Всего работ", kpiTotalFooter: "Включая подзадачи", kpiCompleted: "Завершено", kpiInProgress: "В процессе", kpiOverdue: "Просрочено",
      kpiPercentOfTotal: (n) => `${n}% от общего объёма`,
      filterObjectAriaLabel: "Объект", allObjectsOption: "Все объекты",
      filterSectionAriaLabel: "Раздел", allSectionsOption: "Все разделы",
      filterStatusAriaLabel: "Статус", statusAllLabel: "Статус: Все",
      statusCompleted: "Завершено", statusInProgress: "В процессе", statusOverdue: "Просрочено", statusPlanned: "Запланировано",
      statusOnReview: "На проверке", statusPaused: "Приостановлено", statusCancelled: "Отменено",
      selectedCount: (n) => `Выбрано работ: ${n}`,
      colWork: "Работа", colObjectSection: "Объект / Раздел", colResponsible: "Ответственный", colPlanFact: "План / Факт", colStatusProgress: "Статус / Прогресс",
      selectAllAriaLabel: "Выбрать все работы на странице", selectRowAriaLabel: (title) => `Выбрать работу ${title}`,
      daysShort: "дн.",
      emptyTitle: "Работы не найдены", paginationItemLabel: "работ",
      dynamicsTitle: "Динамика выполнения работ", bySectionsTitle: "Работы по разделам", colSection: "Раздел", colWorksCount: "Работ",
      summaryTitle: "Сводка по работам", donutSuffix: "работ",
      periodLabel: "Период", filterResponsibleAriaLabel: "Ответственный", allResponsibleOption: "Все ответственные", allBrigadesOption: "Все бригады",
      criticalTitle: "Критические работы", criticalNone: "Критических работ нет", overdueDaysLabel: (n) => `${n} ${pluralizeRu(n, "день", "дня", "дней")}`, allCriticalLink: "Все критические работы →",
      exportPdf: "Экспорт PDF", exportExcel: "Экспорт Excel", printReport: "Печать отчёта",
      exportingPdf: "Экспорт в PDF", exportingExcel: "Экспорт в Excel", preparingPrint: "Подготовка отчёта к печати", exportDone: (label) => `${label}: готово`,
      formAddTitle: "Добавить работу", formEditTitle: "Редактировать работу", formDescription: "Заполните параметры работы, сроки и ответственных",
      fieldTitle: "Название работы", fieldTitlePlaceholder: "Например, Устройство фундамента",
      fieldCode: "Код работы", fieldCodePlaceholder: "1.1",
      fieldPriority: "Приоритет", fieldSection: "Раздел", fieldDescriptionPlaceholder: "Краткое описание содержания работы",
      fieldPlannedStart: "Плановая дата начала", fieldPlannedEnd: "Плановая дата завершения", fieldPlannedDuration: "Плановая продолжительность",
      durationDaysValue: (n) => `${n} дней`, noValue: "—",
      fieldInitialProgress: "Начальный прогресс, %", fieldBudget: "Бюджет работы, сомони",
      fieldParentWork: "Родительская работа", noneOption: "Нет",
      fieldDependencies: "Зависимости", noDependenciesAvailable: "Нет доступных работ",
      fieldAttachments: "Вложения", attachButton: "Прикрепить файлы", removeAttachmentAriaLabel: (name) => `Удалить ${name}`,
      saveChanges: "Сохранить изменения", createWork: "Создать работу",
      errorTitleRequired: "Укажите название работы", errorCodeRequired: "Укажите код работы", errorCodeTaken: "Такой код уже используется",
      errorPlannedStartRequired: "Укажите дату начала", errorPlannedEndRequired: "Укажите дату завершения", errorPlannedEndBeforeStart: "Завершение не может быть раньше начала",
      errorProgressRange: "Прогресс от 0 до 100", errorBudgetPositive: "Бюджет должен быть больше нуля",
      priorityLow: "Низкий", priorityMedium: "Средний", priorityHigh: "Высокий", priorityCritical: "Критический",
      sectionPrep: "Подготовительные работы", sectionFoundation: "Фундаменты", sectionStructure: "Монтажные работы",
      sectionFinishing: "Отделочные работы", sectionEngineering: "Инженерные сети", sectionOther: "Прочие работы",
      actionProgress: "Изменить прогресс", actionAssignResponsible: "Назначить ответственного", actionAssignBrigade: "Назначить бригаду", actionPause: "Приостановить",
      progressModalTitle: "Изменить прогресс", progressPercentLabel: "Прогресс, %",
      commentUpdateLabel: "Комментарий к обновлению", commentPlaceholderExample: "Например, залито 40 м³ бетона",
      detailsDefaultTitle: "Работа", updateProgressButton: "Обновить прогресс", completeWorkButton: "Завершить работу",
      changeStatusLabel: "Изменить статус", plannedTermsLabel: "Плановые сроки", actualTermsLabel: "Фактические сроки", notStartedLabel: "Не начато",
      actualDurationLabel: "Фактическая продолжительность", budgetLabel: "Бюджет работы", priorityLabel: "Приоритет", progressExecutionLabel: "Прогресс выполнения",
      dependenciesLabel: "Зависимости", noAttachments: "Нет вложений", progressHistoryLabel: "История прогресса",
      commentsLabel: "Комментарии", noCommentsYet: "Комментариев пока нет", addCommentPlaceholder: "Добавить комментарий...", addButton: "Добавить",
      historyNoteCompleted: "Работа завершена", historyNoteProgressUpdated: "Обновление прогресса", historyNoteCreated: "Работа создана", historyNoteDuplicated: "Работа дублирована",
      toastCompleted: "Работа завершена", toastPaused: "Работа приостановлена", toastStatusUpdated: "Статус обновлён", toastProgressUpdated: "Прогресс обновлён",
      toastDuplicated: "Работа дублирована", toastUpdated: "Работа обновлена", toastCreated: "Работа добавлена", toastDeleted: "Работа удалена",
      toastBulkCompleted: (n) => `Завершено работ: ${n}`, toastBulkDeleted: (n) => `Удалено работ: ${n}`,
      deleteConfirmTitle: "Удалить работу?", deleteConfirmDescription: (title, code) => `Работа «${title}» (${code}) будет удалена.`,
      copyTitle: (title) => `${title} (копия)`,
    },
    brigades: {
      pageTitle: "Бригады", pageSubtitle: "Управление бригадами и их составом", searchPlaceholder: "Поиск по бригадам, прорабам...", createBrigade: "Создать бригаду",
      kpiTotalBrigades: "Всего бригад", kpiActiveBrigadesFooter: (n) => `Активных: ${n}`,
      kpiTotalMembers: "Сотрудников в бригадах", kpiWorkersFooter: (n) => `Из них рабочих: ${n}`,
      kpiAssignedWorks: "Назначено на работы", kpiObjectsFooter: "Объектов",
      kpiAverageEfficiency: "Средняя эффективность", kpiCurrentPeriodFooter: "За текущий период",
      listTitle: "Список бригад", emptyTitle: "Бригады не найдены", paginationItemLabel: "бригад",
      distributionBySpecialtyTitle: "Распределение по специальностям", peopleUnitLabel: "человек",
      activityTitle: "Активность бригад", distributionByRoleTitle: "Распределение по ролям",
      statusActive: "Активна", statusPaused: "На паузе", statusInactive: "Неактивна", statusForming: "Формируется", statusOverloaded: "Перегружена",
      employeeStatusOnShift: "На смене", employeeStatusOnSite: "На объекте", employeeStatusAvailable: "Свободен", employeeStatusOnTrip: "На выезде",
      employeeStatusAbsent: "Отсутствует", employeeStatusOnLeave: "В отпуске", employeeStatusSickLeave: "На больничном",
      shiftDay: "Дневная", shiftEvening: "Вечерняя", shiftNight: "Ночная", shiftDayOff: "Выходной",
      colComposition: "Состав", membersCountLabel: (n) => `${n} чел.`, workersHelpersLabel: (workers, helpers) => `Рабочих: ${workers}, Разнораб.: ${helpers}`,
      colObjectWorks: "Объект / Работы", remainingDaysLabel: (n) => `Осталось ${n} ${pluralizeRu(n, "день", "дня", "дней")}`,
      actionChangeComposition: "Изменить состав", actionAssignWork: "Назначить на работу", actionChangeForeman: "Изменить прораба", actionActivate: "Активировать", actionPauseBrigade: "Поставить на паузу",
      toastCreatedDraft: "Бригада сохранена как черновик", toastCreated: "Бригада создана", toastPaused: "Бригада поставлена на паузу", toastActivated: "Бригада активирована", toastDuplicated: "Бригада дублирована", toastDeleted: "Бригада удалена",
      deleteConfirmTitle: "Удалить бригаду?", deleteConfirmDescription: (name) => `«${name}» будет удалена из списка бригад.`,
      createModalTitle: "Создать бригаду", createModalDescription: "Заполните параметры бригады и сформируйте состав", saveDraftButton: "Сохранить как черновик", defaultNamePrefix: (n) => `Бригада №${n}`,
      fieldName: "Название бригады", fieldSpecialization: "Специализация", fieldSpecializationPlaceholder: "Например, Монолитные работы",
      fieldForemanName: "Прораб", fieldForemanNamePlaceholder: "ФИО прораба",
      fieldDescriptionPlaceholderBrigade: "Краткое описание бригады",
      fieldCurrentWork: "Текущая работа", fieldCurrentWorkPlaceholder: "Например, Устройство котлована",
      fieldTargetEfficiency: "Целевая эффективность, %", fieldCreatedDate: "Дата создания",
      errorNameRequired: "Укажите название бригады", errorSpecializationRequired: "Укажите специализацию", errorForemanRequired: "Укажите прораба",
      errorMembersRequired: "Добавьте хотя бы одного участника", errorForemanIsMember: "Прораб не может одновременно быть рядовым участником",
      errorPlannedEndBeforeStartBrigade: "Окончание не может быть раньше начала", errorEfficiencyRange: "Эффективность от 0 до 100",
      notDefined: "Не определено", notAssigned: "Не назначено",
      teamBuilderTitle: "Состав бригады", searchEmployeePlaceholder: "Поиск сотрудника...", allSpecialtiesOption: "Все специальности", nobodyFound: "Никого не найдено",
      selectedCountLabel: (n) => `Выбрано: ${n}`, addMembersHint: "Добавьте участников слева", removeMemberAriaLabel: (name) => `Убрать ${name}`,
      detailsDefaultTitle: "Бригада",
      compositionLabel: (count, workers, helpers) => `${count} чел. (${workers} раб. / ${helpers} разнораб.)`,
      remainingDaysPlain: (n) => `Осталось ${n} дней`,
      efficiencyLabel: "Эффективность", hoursWorkedLabel: (n) => `${n} ч.`, hoursWorkedTitle: "Отработано часов",
      attendanceTitle: "Посещаемость", payrollFundTitle: "Фонд оплаты труда (30 дней)", compositionCountTitle: (n) => `Состав бригады (${n})`,
      foremanTag: "(прораб)", brigadirTag: "(бригадир)", documentsTitle: "Документы", noDocuments: "Нет прикреплённых документов",
      compositionPageTitle: "Состав бригад", compositionPageSubtitle: "Управление участниками бригад, ролями и распределением по объектам", compositionSearchPlaceholder: "Поиск по сотрудникам...",
      kpiTotalInBrigades: "Всего сотрудников в бригадах", kpiActiveOnShift: "Активны на смене", kpiActiveOnShiftFooter: (pct) => `${pct}% от общего состава`,
      kpiFreeSpecialists: "Свободные специалисты", kpiReadyToAssign: "Готовы к назначению", kpiAverageCompleteness: "Средняя укомплектованность", kpiAllBrigadesFooter: "По всем бригадам",
      addEmployeeButton: "Добавить сотрудника", compositionEmptyTitle: "Сотрудники не найдены", compositionPaginationItemLabel: "сотрудников",
      upcomingChangesTitle: "Ближайшие изменения состава", allChangesLink: "Все изменения состава →",
      changeTypeTransfer: "Перевод", changeTypeAssignment: "Назначение", changeTypeReplacement: "Замена",
      completenessTitle: "Укомплектованность бригад", completenessExcellent: "Отличная укомплектованность", completenessGood: "Хорошая укомплектованность",
      completenessAverage: "Средняя укомплектованность", completenessLow: "Низкая укомплектованность",
      colEmployee: "Сотрудник", gradeSuffix: (n) => `${n} разряд`, colBrigadeRole: "Бригада / Роль", colObjectShift: "Объект / Смена",
      roleFilterAriaLabel: "Роль", roleAllLabel: "Роль: Все",
      actionTransfer: "Перевести", actionChangeRole: "Изменить роль", actionChangeShift: "Изменить смену", actionChangeStatus: "Изменить статус", actionRemoveFromBrigade: "Удалить из бригады",
      toastEmployeeAdded: "Сотрудник добавлен", toastShiftUpdated: "Смена обновлена", toastStatusUpdated: "Статус обновлён", toastEmployeeTransferred: "Сотрудник переведён", toastEmployeeRemoved: "Сотрудник удалён из бригады",
      removeConfirmTitle: "Удалить сотрудника из бригады?", removeConfirmDescription: (name, brigade) => `«${name}» будет удалён из «${brigade}» и переведён в свободные специалисты.`,
      transferModalTitle: "Перевести сотрудника", transferModalDescription: "Перемещение сотрудника в другую бригаду", confirmTransferButton: "Подтвердить перевод",
      currentBrigadeLabel: "Текущая бригада", newBrigadeLabel: "Новая бригада", newRoleLabel: "Новая роль",
      roleWorker: "Рабочий", roleHelper: "Разнорабочий", roleBrigadir: "Бригадир", roleForeman: "Прораб",
      transferDateLabel: "Дата перевода", reasonLabel: "Причина", reasonPlaceholder: "Например, нехватка кадров",
      replaceEmployeeLabel: "Заменить другого сотрудника", doNotReplaceOption: "Не заменять",
      warningOverCapacity: "Целевая бригада укомплектована на пределе штатной численности.",
      warningActiveWork: "У сотрудника есть текущее активное назначение — перевод завершит его участие в нём.",
      errorNewBrigadeDifferent: "Новая бригада должна отличаться от текущей", errorTransferDateRequired: "Укажите дату перевода",
      toastChangeCompositionUnavailable: "Изменение состава пока недоступно в демо", toastAssignWorkUnavailable: "Назначение на работу пока недоступно в демо", toastChangeForemanUnavailable: "Смена прораба пока недоступна в демо",
      toastFullAssignmentsListUnavailable: "Полный список назначений пока недоступен в демо", toastFullChangesListUnavailable: "Полный список изменений пока недоступен в демо",
      addEmployeeModalTitle: "Добавить сотрудника", addEmployeeModalDescription: "Заполните данные сотрудника и назначьте в бригаду",
      photoLabel: "Фото сотрудника", replacePhotoButton: "Заменить", uploadPhotoButton: "Загрузить фото", removePhotoButton: "Убрать", photoPreviewAlt: "Предпросмотр фото",
      errorPhotoType: "Выберите файл изображения (JPG, PNG)", errorPhotoSize: "Размер файла не должен превышать 5 МБ",
      fieldFirstName: "Имя", fieldLastName: "Фамилия",
      fieldSpecialty: "Специальность", fieldSpecialtyPlaceholder: "Например, Бетонщик",
      fieldGrade: "Квалификационный разряд", fieldMemberRole: "Роль в бригаде", fieldShift: "Смена", fieldAssignedDate: "Дата назначения",
      errorFirstNameRequired: "Укажите имя", errorLastNameRequired: "Укажите фамилию", errorPhoneFormat: "Формат: +992 XX XXX XX XX", errorPhoneTaken: "Этот номер уже используется",
      errorSpecialtyRequired: "Укажите специальность", errorBrigadeRequired: "Выберите бригаду", errorGradeRange: "Разряд от 1 до 6",
      detailsEmployeeDefaultTitle: "Сотрудник", brigadeAndObjectTitle: "Бригада и объект",
      performanceLabel: "Показатель эффективности", accruedTitle: "Начислено (30 дней)", qualificationLabel: "Квалификация", noBrigadeAssigned: "Не назначен",
      weekdayMon: "Пн", weekdayTue: "Вт", weekdayWed: "Ср", weekdayThu: "Чт", weekdayFri: "Пт", weekdaySat: "Сб", weekdaySun: "Вс",
      calendarTitle: "Календарь назначений", prevMonthAriaLabel: "Предыдущий месяц", nextMonthAriaLabel: "Следующий месяц", clearDateSelection: "Сбросить выбор даты ×",
      monthJan: "январь", monthFeb: "февраль", monthMar: "март", monthApr: "апрель", monthMay: "май", monthJun: "июнь",
      monthJul: "июль", monthAug: "август", monthSep: "сентябрь", monthOct: "октябрь", monthNov: "ноябрь", monthDec: "декабрь",
      assignmentStatusActive: "В работе", assignmentStatusCompleted: "Завершено", assignmentStatusCancelled: "Отменено", assignmentStatusOverdue: "Просрочено",
    },
    employees: {
      pageTitle: "Сотрудники", pageSubtitle: "Управление сотрудниками компании", searchPlaceholder: "Поиск по ФИО, должности, телефону...", searchPlaceholderShort: "Поиск по ФИО, должности...",
      statusAll: "Все", statusActive: "Активен", statusVacation: "Отпуск", statusDismissed: "Уволен",
      kpiTotal: "Всего сотрудников", kpiActiveFooterPrefix: "Активные:",
      kpiWorkers: "Рабочие", kpiEngineers: "Инженеры и ИТР", kpiAdmins: "Администрация", kpiPercentOfTotal: (n) => `${n}% от общего числа`,
      filterPositionAriaLabel: "Должность", allPositionsOption: "Должность: Все", allBrigadesOption: "Бригада: Все", allStatusesOption: "Статус: Все",
      resetFiltersAriaLabel: "Сбросить фильтры",
      colEmployee: "Сотрудник", idPrefixLabel: (id) => `ID: ${id}`,
      colPosition: "Должность", colUnit: "Бригада / Отдел", colHireDate: "Дата принятия",
      selectAllRowsAriaLabel: "Выбрать все строки", selectRowAriaLabel: (name) => `Выбрать ${name}`,
      viewEmployeeAriaLabel: "Просмотреть сотрудника", editEmployeeAriaLabel: "Редактировать сотрудника",
      emptyTitle: "Сотрудники не найдены", paginationItemLabel: "сотрудников", addEmployeeButton: "Добавить сотрудника",
      csvId: "ID", csvFullName: "ФИО", csvUnit: "Бригада/Отдел", csvHireDate: "Дата принятия", csvPosition: "Должность", csvPhone: "Телефон", csvStatus: "Статус",
      toastUpdated: "Данные сотрудника обновлены", toastCreated: "Сотрудник добавлен", toastTransferred: (name) => `${name} переведён(а) в новое подразделение`, toastDeleted: "Сотрудник удалён", toastExported: "Список сотрудников экспортирован",
      deleteConfirmTitle: "Удалить сотрудника?", deleteConfirmDescription: (name) => `«${name}» будет удалён из списка сотрудников.`,
      contactInfoTitle: "Контактная информация", genderMale: "Мужской", workInfoTitle: "Рабочая информация", ageYearsLabel: (age) => `${age} ${pluralizeRu(age, "год", "года", "лет")}`,
      tenureYearsMonths: (years, months) => `${years} ${pluralizeRu(years, "год", "года", "лет")} ${months} ${pluralizeRu(months, "месяц", "месяца", "месяцев")}`,
      tenureYearsOnly: (years) => `${years} ${pluralizeRu(years, "год", "года", "лет")}`,
      tenureMonthsOnly: (months) => `${months} ${pluralizeRu(months, "месяц", "месяца", "месяцев")}`,
      fieldEmploymentType: "Тип занятости", fieldTenure: "Стаж работы", fieldSalary: "Оклад",
      documentsTitle: "Документы", fieldPassport: "Паспорт", fieldInn: "ИНН",
      laborContractLabel: "Трудовой договор", downloadButton: "Скачать", contractDownloadedToast: (name) => `Договор сотрудника ${name} скачан`,
      filterCategoryTitle: "Категория персонала", categoryWorkers: "Рабочие", categoryEngineers: "Инженеры и ИТР", categoryAdmin: "Администрация",
      hireDateFromLabel: "Дата принятия с", hireDateToLabel: "Дата принятия по",
      transferModalTitle: "Перевести сотрудника", transferModalDescription: (name, unit) => `${name} — текущее подразделение: ${unit}`, transferButton: "Перевести",
      unitTypeLabel: "Тип подразделения", unitTypeBrigade: "Бригада", unitTypeDepartment: "Отдел", newDepartmentLabel: "Новый отдел",
      formAddTitle: "Добавить сотрудника", formEditTitle: "Редактировать сотрудника", formDescription: "Заполните основные данные сотрудника",
      fieldFullName: "ФИО", fieldFullNamePlaceholder: "Например, Мирзоев Шахром",
      fieldPositionInput: "Должность", fieldPositionPlaceholder: "Например, Прораб",
      fieldCategory: "Категория", categoryWorker: "Рабочий", categoryEngineer: "Инженер / ИТР", categoryAdminOpt: "Администрация",
      fieldDepartment: "Отдел", fieldPhonePlaceholder: "+992 90 000 00 00",
      fieldEmail: "Email", fieldEmailPlaceholder: "name@example.com", fieldBirthDate: "Дата рождения",
      fieldAddress: "Адрес", fieldAddressPlaceholder: "г. Душанбе, ул. Рудаки 123", fieldSalaryForm: "Оклад, сомони",
      errorFullNameRequired: "Укажите ФИО", errorPositionRequired: "Укажите должность", errorPhoneRequired: "Укажите телефон",
      errorHireDateRequired: "Укажите дату принятия", errorEmailRequired: "Укажите email", errorBirthDateRequired: "Укажите дату рождения", errorSalaryPositive: "Укажите оклад больше нуля",
    },
    assignments: {
      pageTitle: "Назначения", pageSubtitle: "Назначение бригад и прорабов на объекты и работы", searchPlaceholder: "Поиск по назначениям...", createAssignment: "Создать назначение",
      kpiTotal: "Всего назначений", kpiTotalFooter: "За выбранный период", kpiActive: "Активные назначения", kpiCompleted: "Завершено", kpiCancelledOrOverdue: "Отменено / просрочено",
      kpiPercentOfTotal: (n) => `${n}% от всех назначений`,
      listTitle: "Список назначений",
      statusAllLabel: "Статус: Все", objectAllLabel: "Объект: Все", brigadeAllLabel: "Бригада: Все", foremanAllLabel: "Прораб: Все", allForemenOption: "Все прорабы",
      emptyTitle: "Назначения не найдены", paginationItemLabel: "назначений",
      colNumber: "№", colObjectWork: "Объект / Работа", colBrigadeForeman: "Бригада / Прораб", colAmountShort: "Сумма, с.",
      actionView: "Просмотр", actionCancel: "Отменить",
      toastCompleted: "Назначение завершено", toastCancelled: "Назначение отменено", toastUpdated: "Назначение обновлено", toastCreated: "Назначение создано", toastDeleted: "Назначение удалено",
      deleteConfirmTitle: "Удалить назначение?", deleteConfirmDescription: (number, objectName) => `Назначение №${number} (${objectName}) будет удалено.`,
      defaultTitle: "Назначение", numberTitle: (n) => `Назначение №${n}`, periodWorksLabel: "Период работ", amountLabel: "Сумма",
      completeButton: "Завершить назначение", cancelButton: "Отменить назначение",
      editModalTitle: "Редактировать назначение", formDescription: "Назначьте бригаду и прораба на объект и работу",
      fieldWorkTitle: "Работа", fieldPeriodStart: "Начало периода", fieldPeriodEnd: "Окончание периода", fieldAmountSomoni: "Сумма, сомони", fieldProgressPercent: "Прогресс, %",
      errorAmountPositive: "Укажите сумму больше нуля", errorPeriodStartRequired: "Укажите начало периода", errorPeriodEndRequired: "Укажите окончание периода",
      noUpcomingAssignments: "Нет предстоящих назначений",
    },
    brigadirDashboard: {
      pageTitle: "Панель бригадира", pageSubtitle: "Контроль бригады, посещаемости и выполнения работ",
      brigadeNotFoundTitle: "Бригада не найдена", brigadeNotFoundDescription: "Ваша учётная запись не привязана ни к одной бригаде. Обратитесь к администратору.",
      crewCompositionLabel: "Состав бригады", crewCountValue: (n) => `${n} человек`, crewNote: (onSite, absent) => `${onSite} на объекте · ${absent} отсутствуют`,
      assignedWorksLabel: "Назначенные работы", assignedWorksNote: (inProgress, overdue) => `${inProgress} в работе · ${overdue} просрочено`,
      attendanceLabel: "Посещаемость", attendanceNote: (n) => `${n} отметок за период`, noDataLabel: "Нет данных",
      efficiencyLabel: "Эффективность бригады", statusNote: (label) => `Статус: ${label}`,
      myCrewTitle: "Моя бригада", allCrewLink: "Вся бригада →", colSpecialty: "Специальность", noCrewYet: "В бригаде пока нет сотрудников",
      crewWorksTitle: "Работы бригады", allWorksLink: "Все работы →", noActiveWorks: "Нет активных работ у бригады",
      worksSummaryTitle: "Сводка по работам бригады",
      criticalMaterialsTitle: "Критичные материалы", noCriticalMaterials: "Критичных материалов нет", goToMaterialsButton: "Перейти к материалам",
      briefSummaryTitle: "Краткая сводка", summaryRemainingDaysLabel: "Осталось дней", callForemanButton: "Позвонить прорабу",
    },
    brigadirWorks: {
      pageTitle: "Мои работы", pageSubtitle: "Работы, назначенные вашей бригаде",
      tabAllShort: "Все",
      kpiTotalAssigned: "Всего назначено", kpiPercentOfAssigned: (n) => `${n}% от назначенных`,
      emptyDescription: "Для этой вкладки нет назначенных работ",
      thisWeekTitle: "На этой неделе", noWeekWorks: "На эту неделю работ не запланировано",
    },
    brigadirTeam: {
      pageSubtitle: "Состав бригады, роли, посещаемость и производительность",
      kpiTotalEmployees: "Всего сотрудников", kpiOnSiteNow: "На объекте сейчас", onSiteFooter: "На смене / на объекте",
      kpiAbsentEmployees: "Отсутствуют", absentFooter: "Отпуск / больничный / неявка",
      crewCompositionTitle: (n) => `Состав бригады (${n})`, fullEmployeeListLink: "Полный список сотрудников →",
      specialtiesInCrewTitle: "Специальности в бригаде",
      upcomingWorksTitle: "Ближайшие работы бригады",
      attendancePeriodTitle: "Посещаемость за период", presentLabel: "Присутствовали", lateLabel: "Опоздания", absentLabel: "Отсутствия",
      noAttendanceRecords: "Нет отметок посещаемости за период", openAttendanceButton: "Открыть посещаемость",
      briefInfoTitle: "Краткая информация", brigadirLabel: "Бригадир:", foremanLabel: "Прораб:", objectLabel: "Объект:", brigadeStatusLabel: "Статус бригады:",
      callForemanWithPhone: (phone) => `Позвонить прорабу (${phone})`,
    },
    brigadirMaterials: {
      pageTitle: "Материалы", pageSubtitle: "Остатки на складе, заявки и движение материалов",
      kpiTotalMaterials: "Всего материалов", kpiTotalMaterialsFooter: "наименований",
      kpiTotalStock: "Общий остаток", kpiTotalStockFooter: "единиц",
      kpiInTransit: "В пути", kpiInTransitFooter: "наименований",
      kpiLowStock: "Низкий остаток", kpiLowStockFooter: "наименований",
      kpiRequestsPeriod: "Заявок за период", kpiRequestsPeriodFooter: "всего заявок",
      tabStock: "Остатки на складе", tabRequests: "Заявки на материалы", tabTransit: "В пути", tabHistory: "История движения", tabCategories: "Категории",
      searchMaterialPlaceholder: "Поиск материала...", searchRequestPlaceholder: "Поиск заявки...",
      allCategoriesOption: "Все категории", filterButton: "Фильтр", exportButton: "Экспорт", exportedToast: "Материалы экспортированы",
      filterStatusLabel: "Статус остатка", allStatusesOption: "Все статусы", applyFilterButton: "Применить",
      lowStockOnlyChip: "Только с низким остатком",
      colMaterial: "Материал", colCategory: "Категория", colUnit: "Ед. изм.", colStock: "Остаток", colMinStock: "Мин. остаток", colStatus: "Статус", colAction: "Действие",
      detailsButton: "Подробнее",
      emptyMaterialsTitle: "Материалы не найдены", emptyMaterialsDescription: "Измените параметры поиска или сбросьте фильтры",
      paginationMaterialsLabel: "материалов", paginationRequestsLabel: "заявок", paginationHistoryLabel: "записей",
      statusNormal: "В норме", statusLow: "Низкий остаток", statusCritical: "Критический", statusOutOfStock: "Нет в наличии",
      warehouseStatusTitle: "Статус склада", totalLabel: "всего",
      attentionBanner: (n) => `${n} ${pluralizeRu(n, "материал", "материала", "материалов")} ${n === 1 ? "требует" : "требуют"} внимания`,
      attentionBannerHint: "Проверьте список с низким остатком",
      recentRequestsTitle: "Последние заявки", allRequestsLink: "Все заявки →", noRequestsYet: "Заявок пока нет", createRequestButton: "Создать заявку",
      colRequestNumber: "№ заявки", colRequestMaterial: "Материал", colRequestQuantity: "Кол-во", colRequestDate: "Дата", colRequestStatus: "Статус",
      requestStatusNew: "Новая", requestStatusApproved: "Одобрена", requestStatusInTransit: "В пути", requestStatusIssued: "Выдана", requestStatusRejected: "Отклонена",
      emptyRequestsTitle: "Заявок не найдено", emptyRequestsDescription: "Создайте новую заявку на материал",
      colTransitDocument: "Документ", colTransitMaterials: "Материалы", colTransitRoute: "Маршрут", colTransitDate: "Дата", colTransitStatus: "Статус",
      emptyTransitTitle: "Нет материалов в пути", emptyTransitDescription: "Все перемещения материалов завершены",
      unitsShortLabel: "ед.",
      emptyHistoryTitle: "Движений пока нет",
      receivedLabel: (name) => `Поступление: ${name}`, writtenOffLabel: (name) => `Списание: ${name}`, movedLabel: (from, to) => `Перемещение: ${from} → ${to}`,
      categoryItemsLabel: (n) => `${n} ${pluralizeRu(n, "наименование", "наименования", "наименований")}`, somoniLabel: "сомони",
      createModalTitle: "Новая заявка на материал", createModalDescription: "Заявка будет отправлена прорабу на согласование",
      fieldMaterial: "Материал", fieldQuantity: "Количество", fieldNote: "Комментарий", fieldNotePlaceholder: "Например, срочно нужно для заливки фундамента", fieldNoteOptionalSuffix: "необязательно",
      cancelButton: "Отмена", submitRequestButton: "Отправить заявку",
      errorSelectMaterial: "Выберите материал", errorQuantityInvalid: "Укажите корректное количество",
      requestCreatedToast: "Заявка отправлена на согласование",
      drawerTitle: "Материал", warehouseLabel: "Склад", unitLabel: "Единица измерения", currentStockLabel: "Текущий остаток", minStockLabel: "Минимальный остаток",
      priceLabel: "Цена за единицу", totalValueLabel: "Общая стоимость", noteLabel: "Примечание",
      recentReceiptsTitle: "Последние поступления", recentWriteOffsTitle: "Последние списания", transferHistoryTitle: "История перемещений", noDataLabel: "Нет данных",
    },
    brigadirReports: {
      pageTitle: "Отчёты", pageSubtitle: "Аналитика по работам, материалам, бригаде и финансам",
      tabOverview: "Обзор", tabWorks: "Работы", tabMaterials: "Материалы", tabFinance: "Финансы", tabBrigade: "Бригада", tabAttendance: "Посещаемость",
      kpiTotalWorks: "Всего работ", kpiCompletedWorks: "Выполнено работ", kpiCompletedWorksFooter: (percent) => `${percent}% от общего объёма`,
      kpiOverdueWorks: "Просрочено работ", kpiAverageProgress: "Средний прогресс", kpiTotalExpenses: "Общие расходы", expensesFooter: "материалы за период",
      allObjectsOption: "Все объекты", allBrigadesOption: "Все бригады", filterButton: "Фильтр", exportButton: "Экспорт",
      dynamicsTitle: "Динамика выполнения работ", seriesPlanned: "План", seriesActual: "Факт", seriesRate: "% выполнения",
      statusDistributionTitle: "Распределение работ по статусам", priorityTitle: "Работы по приоритету",
      topObjectsTitle: "Топ объектов по прогрессу", colObject: "Объект", colTotalWorks: "Всего работ", colCompleted: "Выполнено", colProgress: "Прогресс", colChange: "Изменение", allObjectsLink: "Все объекты →",
      expensesByCategoryTitle: "Расходы по категориям", colCategory: "Категория", colAmount: "Сумма", expenseMaterials: "Материалы", expenseLabor: "Оплата труда",
      periodSummaryTitle: "Сводка за период", summaryPeriod: "Период", summaryObjects: "Объекты", summaryBrigades: "Бригады", summaryWorkers: "Работники", summaryWorkDays: "Рабочих дней",
      exportPanelTitle: "Экспорт отчётов", exportPanelHint: "Скачайте отчёты в нужном формате", exportPdf: "PDF", exportExcel: "Excel", exportCsv: "CSV", configureReportButton: "Настроить отчёт",
      noBrigadeTitle: "Бригада не найдена", noBrigadeDescription: "Ваш аккаунт не привязан ни к одной бригаде",
      emptyChartData: "Нет данных за выбранный период", emptyTableData: "Нет данных",
      csvExportedToast: "Отчёт экспортирован", printPreparedToast: "Отчёт подготовлен для печати",
      workStatusCompleted: "Завершено", workStatusInProgress: "В работе", workStatusOnReview: "На проверке", workStatusOverdue: "Просрочено", workStatusOther: "Прочее",
      priorityHigh: "Высокий", priorityMedium: "Средний", priorityLow: "Низкий",
      worksTabColWork: "Работа", worksTabColObject: "Объект", worksTabColProgress: "Прогресс", worksTabColStatus: "Статус",
      materialsTabTotal: "Всего материалов", materialsTabLowStock: "Низкий остаток", materialsTabRequests: "Заявок за период", materialsTabOpenButton: "Открыть материалы",
      financeTabBudgetTitle: "Бюджет объекта", financeTabPlanLabel: "План", financeTabActualLabel: "Факт", financeTabVarianceLabel: "Отклонение", financeTabNoBudget: "Бюджет объекта не найден",
      brigadeTabTitle: "Состав бригады", brigadeTabMembers: "Сотрудников", brigadeTabEfficiency: "Эффективность", brigadeTabForeman: "Прораб", brigadeTabObject: "Объект",
      attendanceTabPresent: "Присутствовали", attendanceTabLate: "Опоздания", attendanceTabAbsent: "Отсутствия",
      vsPreviousPeriod: "к прошлому периоду", allObjectsLinkGeneric: "Все объекты →", expensesDetailsLink: "Подробнее о расходах →", specialtiesTitle: "Специальности",
    },
    worker: {
      sidebarDashboard: "Главная", sidebarTasks: "Мои работы", sidebarAttendance: "Посещаемость", sidebarSchedule: "График", sidebarMaterials: "Материалы",
      sidebarPhotoReports: "Фотоотчёт", sidebarNotifications: "Уведомления", sidebarProfile: "Профиль", sidebarReportProblem: "Сообщить о проблеме",
      greetingMorning: "Доброе утро", greetingDay: "Добрый день", greetingEvening: "Добрый вечер", dashboardSubtitle: "Вот что происходит сегодня на объекте",
      kpiTasksTitle: "Мои задачи", kpiTasksFooter: "Всего назначено", kpiInProgressTitle: "В работе", kpiInProgressFooter: "Активные задачи",
      kpiCompletedTitle: "Выполнено", kpiCompletedFooter: "За этот месяц", kpiHoursTitle: "Отработано часов", kpiHoursFooter: "За этот месяц",
      tasksTitle: "Мои задачи", tasksTabAll: (n) => `Все (${n})`, tasksTabInProgress: (n) => `В работе (${n})`,
      tasksTabReview: (n) => `На проверке (${n})`, tasksTabCompleted: (n) => `Завершено (${n})`, sortByPriority: "По приоритету", viewAllTasks: "Смотреть все задачи →",
      statusAssigned: "Назначено", statusInProgress: "В работе", statusReview: "На проверке", statusCompleted: "Завершено", statusOverdue: "Просрочено", statusPlanned: "Запланировано", statusPaused: "Приостановлено", statusCancelled: "Отменено",
      priorityLow: "Низкий", priorityMedium: "Средний", priorityHigh: "Высокий", priorityCritical: "Критический",
      emptyTasks: "Нет назначенных задач", emptySchedule: "На сегодня задач не запланировано", emptyNotifications: "Нет новых уведомлений", emptyDocuments: "Нет доступных документов",
      colTotalWorks: "Всего работ", colCompleted: "Выполнено",
      taskDetailTitle: "Задача", taskDetailObject: "Объект", taskDetailDates: "Сроки", taskDetailProgress: "Прогресс",
      taskDetailStatus: "Статус", taskDetailPriority: "Приоритет", taskDetailAssignedBy: "Назначил", taskDetailComments: "Комментарии",
      actionStart: "Начать работу", actionSubmitReview: "Отправить на проверку", actionUploadPhoto: "Загрузить фото", actionReportProblemLong: "Сообщить о проблеме", actionUpdateProgress: "Обновить прогресс", actionSaveProgress: "Сохранить прогресс",
      scheduleTitle: (date) => `Сегодня, ${date}`, scheduleBreak: "Перерыв", scheduleMeeting: "Планёрка с прорабом", viewFullSchedule: "Полный график →",
      notificationsTitle: "Уведомления", notificationsAllLink: "Все",
      statsTitle: "Моя статистика", statsHours: "Отработано часов", statsCompleted: "Выполнено задач", statsRating: "Рейтинг", statsViolations: "Нарушений",
      ratingHigh: "Высокий уровень", ratingMedium: "Средний уровень", ratingLow: "Требует внимания", violationsGood: "Отлично!", violationsPresent: "Есть замечания",
      documentsTitle: "Мои документы", allDocumentsLink: "Все документы →",
      quickActionsTitle: "Быстрые действия", actionPhotoReport: "Фотоотчёт", actionRequestMaterial: "Запросить материал", actionReportProblemShort: "Сообщить о проблеме",
      actionMessageProrab: "Написать прорабу", actionCall: "Позвонить", actionViewSchedule: "Узнать график",
      photoModalTitle: "Фотоотчёт", photoModalTask: "Задача", photoModalTaskPlaceholder: "Выберите задачу", photoModalImage: "Фотография", photoModalComment: "Комментарий", photoModalCommentPlaceholder: "Опишите, что сделано...", photoModalSubmit: "Отправить отчёт",
      materialModalTitle: "Запросить материал", materialModalName: "Материал", materialModalQty: "Количество", materialModalUnit: "Единица", materialModalNote: "Комментарий", materialModalSubmit: "Отправить заявку",
      problemModalTitle: "Сообщить о проблеме", problemModalCategory: "Категория", problemModalTask: "Связанная задача", problemModalNoTask: "Не выбрана", problemModalDescription: "Описание проблемы", problemModalPriority: "Приоритет", problemModalSubmit: "Отправить",
      problemCategorySafety: "Безопасность", problemCategoryMaterials: "Материалы", problemCategoryEquipment: "Оборудование", problemCategoryOther: "Другое",
      messageModalTitle: "Написать прорабу", messageModalText: "Сообщение", messageModalPlaceholder: "Введите сообщение для прораба...", messageModalSubmit: "Отправить",
      toastPhotoSubmitted: "Фотоотчёт отправлен", toastMaterialRequested: "Заявка на материал отправлена", toastProblemReported: "Сообщение о проблеме отправлено", toastMessageSent: "Сообщение прорабу отправлено", toastMarkedRead: "Отмечено как прочитанное",
      attendancePageTitle: "Посещаемость", attendancePageSubtitle: "Моя явка, опоздания и рабочее время", attendanceColDate: "Дата", attendanceColArrival: "Приход", attendanceColDeparture: "Уход", attendanceColStatus: "Статус", attendanceColHours: "Часов",
      attendanceColObject: "Объект", attendanceColNote: "Примечание",
      kpiAttendanceTotalTitle: "Всего отметок", kpiAttendanceTotalFooter: "за выбранный период", kpiPresentTitle: "Присутствовал", kpiPresentFooter: "рабочих дней", kpiLateTitle: "Опоздания", kpiLateFooter: "за выбранный период", kpiAbsentTitle: "Отсутствия", kpiAbsentFooter: "за выбранный период",
      attendanceHistoryTitle: "Моя посещаемость", attendanceTabAll: "Все", attendanceTabPresent: "Присутствовал", attendanceTabLate: "Опоздания", attendanceTabAbsent: "Отсутствия",
      statusDayOff: "Выходной", noteDayOff: "Выходной день", attendanceStatusPresent: "Присутствовал", attendanceStatusLate: "Опоздал", attendanceStatusAbsent: "Отсутствовал", statusNoData: "Нет данных",
      weeklyAnalyticsTitle: "Посещаемость за неделю", normLabel: "Норма", factLabel: "Факт", latesLabel: "Опоздания", absencesLabel: "Пропуски",
      tooltipStatusLabel: "Статус", tooltipCheckIn: "Приход", tooltipCheckOut: "Уход", tooltipLate: "Опоздание", tooltipWorked: "Отработано",
      todayTimelineArrival: "Утренний приход", todayTimelineLunchStart: "Обеденный перерыв", todayTimelineLunchEnd: "Возвращение", todayTimelineDeparture: "Окончание смены", emptyTimeline: "Нет данных за сегодня",
      dailySummaryTitle: "Сводка за день", dailySummaryPresence: "Присутствие", dailySummaryLate: "Опоздание", dailySummaryOvertime: "Переработка", dailySummaryAttendance: "Явка", dailySummaryYes: "Да", dailySummaryNo: "Нет",
      remindersTitle: "Напоминания", emptyReminders: "Нет напоминаний",
      shortSummaryTitle: "Краткая сводка", shortSummaryObject: "Объект", shortSummaryProrab: "Прораб", shortSummaryNextCheck: "Следующий рабочий день", shortSummaryActiveTasks: "Активных задач", contactProrabButton: "Связаться с прорабом",
      emptyAttendance: "Нет записей за выбранный период", thisMonth: "Текущий месяц", lastSevenDays: "Последние 7 дней", lastThirtyDays: "Последние 30 дней",
      schedulePageTitle: "График", schedulePageSubtitle: "Мои смены, рабочее время и план на неделю",
      kpiWorkdaysTitle: "Рабочих дней", kpiWorkdaysFooter: "в этом месяце", kpiTodayShiftTitle: "Сегодня", kpiTodayShiftFooter: "текущая смена",
      kpiNextDayOffTitle: "Следующий выходной", kpiNextDayOffFooter: (days) => (days <= 0 ? "сегодня" : `через ${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`), kpiWorkedHoursTitle: "Отработано", kpiWorkedHoursFooter: "за этот месяц",
      calendarShiftsTitle: "Календарь смен", legendWorkday: "Рабочий день", legendDayOff: "Выходной", legendOvertime: "Сверхурочно", legendBriefing: "Планёрка",
      weekScheduleTitle: "График на неделю", weekScheduleColDay: "День", weekScheduleColDate: "Дата", weekScheduleColTime: "Время", weekScheduleColStatus: "Статус", weekScheduleColObject: "Объект",
      statusFullShift: "Рабочая смена", statusShortShift: "Сокращённый день",
      upcomingEventsTitle: "Ближайшие события", hoursWorkedTitle: "Отработанные часы", planHoursLabel: "План", overtimeHoursLabel: "Сверхурочно",
      monthSummaryTitle: "Сводка за месяц", summaryWorkdays: "Рабочих дней", summaryDaysOff: "Выходных", summaryOvertime: "Сверхурочно", summaryAvgAttendance: "Средняя явка",
      materialsPageTitle: "Материалы", materialsPageSubtitle: "Материалы на объекте и ваши заявки", materialsRequestButton: "Запросить материал", materialsColMaterial: "Материал", materialsColQty: "Количество", materialsColStatus: "Статус", materialsColDate: "Дата", emptyMaterialRequests: "Нет заявок на материалы",
      materialsTabAvailable: "Доступные материалы", materialsTabMyRequests: "Мои заявки", materialsTabHistory: "История",
      materialsKpiTotalTitle: "Всего на складе", materialsKpiAvailableTitle: "Доступно", materialsKpiReservedTitle: "В резерве", materialsKpiExpectedTitle: "Ожидается", materialsKpiFooter: (amount) => `на сумму ${amount} сом.`, materialsUnitsSuffix: "ед.", materialsCurrencySuffix: "сом.",
      materialsSearchPlaceholder: "Поиск материала...", materialsAllCategories: "Все категории", materialsUnitFilterPlaceholder: "Ед. изм.", materialsAvailabilityFilterLabel: "В наличии", materialsAllAvailability: "Все материалы", materialsResetFilters: "Сбросить",
      materialsColCategory: "Категория", materialsColUnit: "Ед. изм.", materialsColInStock: "В наличии", materialsColReserved: "Резерв", materialsColAvailable: "Доступно", materialsColPrice: "Цена",
      materialsResultsSummary: (from, to, total) => `Показано ${from}–${to} из ${total} материалов`,
      emptyMaterialsSearch: "Материалы не найдены", emptyMaterialsSearchDescription: "Попробуйте изменить параметры поиска или сбросить фильтры", emptyMaterialRequestsHistory: "История заявок пуста",
      materialsRequestCardTitle: "Запросить материал", materialsRequestMaterialPlaceholder: "Выберите материал", materialsRequestQtyPlaceholder: "Количество", materialsRequestUnitPlaceholder: "Единица измерения", materialsRequestCommentPlaceholder: "Комментарий (необязательно)",
      materialsErrorMaterialRequired: "Выберите материал", materialsErrorQtyRequired: "Укажите количество больше нуля",
      categoryStockTitle: "Остатки по категориям", categoryStockCollapseAction: "Свернуть",
      recentRequestsTitle: "Последние заявки", recentRequestsAllAction: "Все заявки",
      photoReportsPageTitle: "Фотоотчёт", photoReportsPageSubtitle: "Фотографии выполненных работ, этапов и замечаний", photoReportsNewButton: "Новый фотоотчёт", emptyPhotoReports: "Пока нет фотоотчётов", photoReportsCardTitle: "Мои фотоотчёты",
      photoKpiUploadedTitle: "Загружено фото", photoKpiUploadedFooter: "за этот месяц", photoKpiTodayTitle: "Сегодня", photoKpiTodayFooter: "новых фото",
      photoKpiPendingTitle: "На проверке", photoKpiPendingFooter: "ожидают подтверждения", photoKpiApprovedTitle: "Одобрено", photoKpiApprovedFooter: "подтверждено прорабом",
      photoStatusPending: "На проверке", photoStatusApproved: "Одобрено", photoStatusRejected: "Отклонено",
      photoFilterAll: "Все", photoFilterToday: "Сегодня", photoFilterAllWorks: "Все работы", photoUploadButton: "Загрузить фото",
      photoResultsSummary: (from, to, total) => `Показано ${from}–${to} из ${total} фотоотчётов`, photoViewAction: "Просмотреть",
      emptyPhotoReportsFiltered: "Фотоотчёты не найдены", emptyPhotoReportsFilteredDescription: "Измените фильтры или загрузите новый фотоотчёт", photoReviewerCommentLabel: "Комментарий прораба",
      photoUploadCardTitle: "Загрузить отчёт", photoDropzoneTitle: "Перетащите фото сюда", photoDropzoneSubtitle: "или нажмите для выбора",
      photoUploadWorkLabel: "Работа", photoUploadWorkPlaceholder: "Выберите работу", photoUploadObjectLabel: "Объект", photoUploadObjectPlaceholder: "Определяется по работе",
      photoErrorMaxImages: "Можно прикрепить не более 10 фото", photoErrorFileType: "Поддерживаются только JPG, PNG и WEBP", photoErrorFileSize: "Размер файла не должен превышать 10 МБ", photoErrorWorkRequired: "Выберите работу", photoErrorImagesRequired: "Добавьте хотя бы одно фото",
      photoActivityTitle: "Активность по фотоотчётам", photoActivityUploaded: "Загружено", photoActivityApproved: "Одобрено",
      photoCommentsTitle: "Последние комментарии", photoCommentsToday: "Сегодня", photoCommentsYesterday: "Вчера",
      photoSummaryTitle: "Краткая сводка", photoSummaryTotalTasks: "Всего задач", photoSummaryPendingPhotos: "Фото к сдаче", photoSummaryNextCheck: "Следующая проверка", photoSummaryRemarks: "Замечания", photoSummaryGoToTasks: "Перейти к задачам",
      photoQuickActionsTitle: "Быстрые действия", photoActionTakePhoto: "Сделать фото", photoActionChooseGallery: "Выбрать из галереи", photoActionMyTasks: "Мои задачи", photoActionContactProrab: "Связаться с прорабом",
      notificationsPageTitle: "Уведомления", notificationsPageSubtitle: "Все важные уведомления и сообщения", markAllRead: "Отметить все как прочитанные",
      notificationTabAll: "Все", notificationTabUnread: "Непрочитанные", notificationTabImportant: "Важные", notificationTabSystem: "Системные",
      emptyNotificationsFiltered: "Уведомления не найдены", emptyNotificationsFilteredDescription: "Измените фильтры или проверьте другие категории", notificationUnreadLabel: "непрочитано",
      notificationPriorityImportant: "Важное", notificationPriorityNormal: "Обычное", notificationPrioritySystem: "Системное",
      notificationsResultsSummary: (count) => `Показано 1–${count} из ${count} уведомлений`,
      notificationFiltersTitle: "Фильтры", notificationFilterTypeLabel: "Тип уведомления", notificationAllTypes: "Все типы",
      notificationTypeTask: "Задачи", notificationTypeMaterials: "Материалы", notificationTypeSchedule: "График", notificationTypePhotoReport: "Фотоотчёты", notificationTypeReminder: "Напоминания", notificationTypeSystem: "Системные",
      notificationFilterDateLabel: "Дата", notificationFilterPriorityLabel: "Приоритет", notificationAllPriorities: "Все приоритеты", notificationResetFilters: "Сбросить фильтры",
      notificationSummaryTitle: "Сводка", notificationSummaryTotal: "Всего уведомлений", notificationSummaryUnread: "Непрочитанные", notificationSummaryImportant: "Важные", notificationSummarySystem: "Системные",
      notificationPushTitle: "Не пропустите важное!", notificationPushDescription: "Включите push-уведомления, чтобы получать мгновенные оповещения о новых задачах и изменениях.",
      notificationPushEnabled: "Уведомления включены", notificationPushDenied: "Уведомления заблокированы в браузере", notificationPushUnsupported: "Браузер не поддерживает push-уведомления", notificationPushEnableButton: "Включить уведомления",
      documentsPageTitle: "Мои документы", documentsPageSubtitle: "Документы по вашему объекту",
      profilePageTitle: "Профиль", profilePageSubtitle: "Личные данные, настройки и информация о работнике", profileBrigade: "Бригада", profileObject: "Объект", profileSpecialty: "Специализация", profileGrade: "Разряд", profilePhone: "Телефон",
      profileStatusActive: "Активен", profileStatusInactive: "Неактивен", profileEditButton: "Редактировать профиль", profileChangePhotoButton: "Изменить фото", profileSaveButton: "Сохранить изменения",
      profileErrorFirstNameRequired: "Укажите имя", profileErrorLastNameRequired: "Укажите фамилию", profileErrorPhoneInvalid: "Введите корректный номер телефона", profileErrorEmailInvalid: "Введите корректный email",
      profileToastUpdated: "Профиль обновлён", profileToastPhotoUpdated: "Фото профиля обновлено",
      profileFieldFirstName: "Имя", profileFieldLastName: "Фамилия", profileFieldEmail: "Email", profileFieldAddress: "Адрес", profileFieldEmergencyContact: "Экстренный контакт",
      profileFieldBirthDate: "Дата рождения", profileFieldPassport: "Паспорт/ID", profileFieldHiredAt: "Дата найма", profileFieldSection: "Текущая секция", profileFieldExperience: "Опыт в строительстве", profileFieldForeman: "Прораб",
      profileProfessionalInfoTitle: "Профессиональная информация", profilePersonalInfoTitle: "Личная информация", profileSkillsTitle: "Навыки",
      profileGradeValue: (grade) => `${grade} разряд`, profileYearsValue: (years) => `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`,
      profileStatsTitle: "Статистика профиля", profileStatsTotalLabel: "всего", profileStatCompletedTasks: "Завершено задач", profileStatPhotoReports: "Фотоотчёты", profileStatRemarks: "Замечания", profileStatAttendance: "Средняя явка",
      profileActivityTitle: "Последняя активность", profileActivityAttendance: "Посещаемость отмечена", profileActivityPhoto: "Фотоотчёт загружен", profileActivityMaterials: "Запрошены материалы", profileActivityTask: "Задача завершена",
      profileSettingsTitle: "Настройки", profileSettingPush: "Push-уведомления", profileSettingSms: "SMS-уведомления", profileSettingTelegram: "Telegram-уведомления", profileSettingVisibility: "Видимость профиля", profileSettingLanguage: "Язык интерфейса",
      profileDocumentsTitle: "Документы и доступ", profileDocumentValidUntil: (date) => `Действует до ${date}`, profileDocumentUploaded: "Загружено", profileDocumentOpenButton: "Открыть", profileDocumentOpened: "Документ открыт", profileDocumentMissing: "Документ не загружен",
      profileKpiExperienceTitle: "Стаж", profileKpiTasksTitle: "Мои задачи", profileKpiTasksFooter: "Активных задач", profileKpiHoursTitle: "Отработано часов", profileKpiHoursFooter: "За этот месяц", profileKpiAttendanceTitle: "Средняя явка", profileKpiAttendanceFooter: "За последний месяц",
      materialStatusNew: "Новая", materialStatusApproved: "Одобрена", materialStatusInTransit: "В пути", materialStatusIssued: "Выдана", materialStatusRejected: "Отклонена",
      kpiTotalTasksTitle: "Всего задач", kpiReviewTitle: "На проверке", kpiReviewFooter: "Ожидают проверки", kpiOverdueTitle: "Просрочено", kpiOverdueFooter: "Просроченных задач",
      filterButton: "Фильтр", sortByPriorityOption: "По приоритету", sortByDueDate: "По сроку", sortByProgress: "По прогрессу", sortNewest: "Сначала новые", sortOldest: "Сначала старые",
      filterPriorityLabel: "Приоритет", filterObjectLabel: "Объект", filterOverdueOnly: "Только просроченные", filterAllObjects: "Все объекты", filterApply: "Применить", filterReset: "Сбросить",
      tasksResultsSummary: (from, to, total) => `Показано ${from}–${to} из ${total} задач`, paginationPrev: "Назад", paginationNext: "Далее",
      monthlyStatsTitle: "Статистика за месяц", monthlyStatsCompletedTasks: "Выполнено задач", monthlyStatsCompletedWorks: "Выполнено работ", monthlyStatsHours: "Отработано часов", monthlyStatsAvgProgress: "Средний прогресс",
      upcomingTasksTitle: "Ближайшие задачи", upcomingTasksAll: "Все", upcomingTasksEmpty: "Нет ближайших задач",
      tasksQuickActionsTitle: "Быстрые действия",
    },
    objects: {
      pageTitle: "Объекты", pageSubtitle: "Управление строительными объектами и их статусами", searchPlaceholder: "Поиск объектов, локаций, прораба...",
      tabAll: "Все", tabActive: "Активные", tabAtRisk: "С риском", tabCompleted: "Завершённые",
      kpiTotal: "Всего объектов", kpiTotalFooter: "Все проекты компании",
      kpiInWork: "В работе", kpiCompleted: "Завершены", kpiAtRisk: "Есть риск", kpiPercentOfTotal: (n) => `${n}% от общего количества`,
      listTitle: "Список объектов", addObject: "Добавить объект",
      colCity: "Локация", colForeman: "Прораб", colProgress: "Прогресс", colBudget: "Бюджет", colDeadline: "Срок",
      actionViewObject: "Просмотреть объект",
      emptyTitle: "Объекты не найдены",
      chartTitle: "Динамика по объектам", chartModeProgress: "Прогресс", chartModeBudget: "Бюджет", chartPeriodAriaLabel: "Период",
      chartSeriesPlanned: "Плановый прогресс", chartSeriesActual: "Фактический прогресс",
      summaryTitle: "Сводка по выбранному объекту", summaryDeadlineChip: (date) => `Срок: ${date}`,
      summaryStartDate: "Дата начала", summaryDeadline: "Крайний срок", summaryBudget: "Бюджет", summarySpent: "Потрачено", summaryRemaining: "Остаток бюджета",
      summaryProgress: "Прогресс выполнения", summaryOpenDetail: "Открыть детальную страницу",
      taskListTitle: "Ближайшие задачи", taskOverdue: "Просрочено", taskToday: "Сегодня", taskPlanned: "В планах", taskListAllLink: "Все задачи по объекту →",
      addModalTitle: "Добавить объект", addModalDescription: "Заполните основные данные строительного объекта", saveObjectButton: "Сохранить объект",
      fieldName: "Название объекта", fieldNamePlaceholder: "Например, Жилой комплекс «Заря»",
      fieldType: "Тип объекта",
      fieldCity: "Город", fieldCityPlaceholder: "Например, Душанбе",
      fieldAddress: "Адрес", fieldAddressPlaceholder: "Улица, дом",
      fieldForeman: "Прораб", fieldForemanPlaceholder: "ФИО прораба",
      fieldStatus: "Статус",
      fieldStartDate: "Дата начала", fieldDeadline: "Крайний срок",
      fieldBudget: "Общий бюджет, сомони", fieldProgress: "Начальный прогресс, %",
      fieldImage: "Изображение объекта", fieldImageUploadHint: "Нажмите, чтобы загрузить изображение", fieldImagePreviewAlt: "Предпросмотр объекта",
      fieldDescription: "Описание", fieldDescriptionPlaceholder: "Краткое описание объекта и объёма работ",
      errorNameRequired: "Укажите название объекта", errorCityRequired: "Укажите город", errorAddressRequired: "Укажите адрес", errorForemanRequired: "Укажите прораба",
      errorStartDateRequired: "Укажите дату начала", errorDeadlineRequired: "Укажите крайний срок", errorDeadlineBeforeStart: "Срок не может быть раньше даты начала",
      errorProgressRange: "Прогресс должен быть от 0 до 100",
      objectTypeOptions: {
        residential: "Жилой комплекс", business: "Бизнес-центр", cottage: "Коттедж", warehouse: "Складской комплекс",
        school: "Школа / образование", clinic: "Медицинская клиника", mall: "Торговый центр", service: "Автосервис",
        hotel: "Гостиница", sport: "Спортивный комплекс", factory: "Производственный цех",
      },
      filterDrawerTitle: "Фильтры", filterCity: "Город", filterForeman: "Прораб",
      filterMinProgress: "Мин. прогресс, %", filterMaxProgress: "Макс. прогресс, %", filterMinBudget: "Мин. бюджет", filterMaxBudget: "Макс. бюджет",
      deleteConfirmTitle: "Удалить объект?", deleteConfirmDescription: (name) => `«${name}» будет удалён из списка объектов.`,
      toastCreated: "Объект успешно добавлен", toastDeleted: "Объект удалён",
    },
    estimates: {
      pageTitle: "Сметы", pageSubtitle: "Управление сметами по объектам", searchPlaceholder: "Поиск смет...", newEstimateButton: "Новая смета",
      kpiTotal: "Всего смет", kpiTotalOfPrefix: "На сумму",
      kpiApproved: "Утверждённые", kpiPendingReview: "На рассмотрении", kpiDraft: "Черновики",
      colNumber: "№ сметы", colVersion: "Версия", colAmount: "Сумма, сомони", colResponsible: "Ответственный",
      filterObjectAriaLabel: "Объект", filterStatusAriaLabel: "Статус",
      statusAllLabel: "Статус: Все", allObjectsOption: "Все объекты",
      statusDraft: "Черновик", statusPendingReview: "На рассмотрении", statusApproved: "Утверждена",
      emptyTitle: "Сметы не найдены", paginationItemLabel: "смет",
      budgetChartTitle: "Бюджет и фактические расходы",
      categorySpendTitle: "Расходы по категориям", categorySpendCenterLabel: "Всего расходов",
      summaryTitle: "Сводка по выбранной смете", summaryNumberLabel: "Смета №", summaryDateCreated: "Дата создания", summaryDateUpdated: "Дата обновления",
      summaryTotalBudget: "Общий бюджет",
      openEstimateButton: "Открыть смету", downloadPdfButton: "Скачать PDF",
      riskCardTitle: "Сметы, требующие внимания", riskAllLink: "Все сметы с рисками →",
      filterResponsiblePlaceholder: "Имя прораба", filterMinAmount: "Мин. сумма", filterMaxAmount: "Макс. сумма",
      deleteConfirmTitle: "Удалить смету?", deleteConfirmDescription: (number) => `Смета «${number}» будет удалена.`,
      toastCreated: "Смета создана", toastDeleted: "Смета удалена", toastOpenUnavailable: "Открытие детальной страницы сметы пока недоступно в демо",
      toastRiskOpened: (title) => `Открыта смета: ${title}`,
      addModalTitle: "Новая смета", addModalDescription: (number) => `Номер сметы будет присвоен автоматически: ${number}`,
      fieldVersion: "Версия", fieldAmount: "Сумма, сомони", fieldDate: "Дата",
      fieldResponsiblePlaceholder: "ФИО прораба",
      errorAmountPositive: "Укажите сумму больше нуля", errorDateRequired: "Укажите дату сметы", errorResponsibleRequired: "Укажите ответственного",
      categoryLabels: {
        "Строительные материалы": "Строительные материалы", "Оплата труда": "Оплата труда", "Техника и оборудование": "Техника и оборудование",
        "Транспорт и логистика": "Транспорт и логистика", "Электромонтаж": "Электромонтаж", "Прочие расходы": "Прочие расходы",
      },
      riskDescriptionLabels: {
        "Превышение на 450 000 сомони": "Превышение на 450 000 сомони",
        "Превышение на 120 000 сомони": "Превышение на 120 000 сомони",
        "Не подтверждены затраты на 310 000 сомони": "Не подтверждены затраты на 310 000 сомони",
        "Смета не утверждена": "Смета не утверждена",
      },
    },
    budgets: {
      pageTitle: "Бюджеты", pageSubtitle: "Планирование, контроль и анализ бюджетов по объектам", searchPlaceholder: "Поиск бюджетов, объектов...",
      tabAll: "Все", tabActive: "Активные", tabCompleted: "Завершённые", tabOverBudget: "С превышением",
      kpiTotalBudget: "Общий бюджет", kpiTotalBudgetFooter: "По всем активным объектам",
      kpiApprovedBudget: "Утверждённые бюджеты", kpiApprovedFooter: (pct) => `${pct}% от общего бюджета`,
      kpiActualSpent: "Фактические расходы", kpiActualSpentFooter: (pct) => `${pct}% бюджета использовано`,
      kpiOverBudget: "Превышение бюджета", kpiOverBudgetFooter: (n) => `${n} объекта с превышением`,
      listTitle: "Бюджеты по объектам", addBudget: "Добавить бюджет", paginationItemLabel: "бюджетов",
      colSpent: "Потрачено", colRemaining: "Остаток", colUsage: "Использование", colOverspend: "Превышение",
      actionViewBudget: "Просмотреть бюджет",
      emptyTitle: "Бюджеты не найдены",
      chartTitle: "Динамика бюджета", distributionTitle: "Распределение бюджета", centerLabel: "Всего бюджет",
      seriesTotalBudget: "Общий бюджет", seriesRemaining: "Остаток бюджета",
      operationsTitle: "Последние операции по бюджетам", opColAction: "Действие", allOperationsLink: "Все операции →",
      riskCardTitle: "Бюджеты с превышением", riskAllLink: "Все бюджеты с рисками →",
      summaryTitle: "Сводка по выбранному бюджету", summaryPeriodLabel: "Период бюджета", summaryUpdatedDate: "Последнее обновление",
      editBudgetButton: "Редактировать бюджет", exportPdfButton: "Экспорт PDF",
      addModalTitle: "Добавить бюджет", addModalDescription: "Заполните основные параметры бюджета объекта",
      fieldPeriodStart: "Начало периода", fieldPeriodEnd: "Окончание периода",
      statusPendingApproval: "На согласовании", statusOverBudget: "Превышение",
      errorPeriodStartRequired: "Укажите начало периода", errorPeriodEndRequired: "Укажите окончание периода", errorPeriodEndBeforeStart: "Окончание не может быть раньше начала",
      deleteConfirmTitle: "Удалить бюджет?", deleteConfirmDescription: (name) => `Бюджет объекта «${name}» будет удалён.`,
      toastCreated: "Бюджет добавлен", toastDeleted: "Бюджет удалён", toastEditUnavailable: "Редактирование пока недоступно в демо",
      toastRiskOpened: (title) => `Открыт бюджет: ${title}`,
      categoryLabels: {
        "Строительные работы": "Строительные работы", "Материалы": "Материалы", "Оборудование": "Оборудование",
        "Непредвиденные расходы": "Непредвиденные расходы", "Прочие расходы": "Прочие расходы",
      },
      operationActionLabels: {
        "Добавлены расходы": "Добавлены расходы", "Утверждён бюджет": "Утверждён бюджет", "Обновлён бюджет": "Обновлён бюджет", "Создан бюджет": "Создан бюджет",
      },
      riskDescriptionLabels: {
        "Превышение на 45 000 сомони": "Превышение на 45 000 сомони",
        "Превышение на 15 000 сомони": "Превышение на 15 000 сомони",
        "Ожидает подтверждения расходов на 85 000 сомони": "Ожидает подтверждения расходов на 85 000 сомони",
        "Бюджет в черновике": "Бюджет в черновике",
      },
    },
    users: {
      pageTitle: "Пользователи", pageSubtitle: "Управление учетными записями и правами доступа", searchPlaceholder: "Поиск по пользователям...",
      kpiTotal: "Всего пользователей", kpiTotalSuffix: "учётных записей",
      kpiActive: "Активные", kpiActiveSuffix: "пользователя",
      kpiInactive: "Неактивные", kpiInactiveSuffix: "пользователя",
      kpiAdmins: "Администраторы", kpiAdminsSuffix: "пользователя",
      kpiRoles: "Роли", kpiRolesSuffix: "ролей в системе",
      addUser: "Добавить пользователя", export: "Экспорт",
      tabAll: "Все пользователи", tabActive: "Активные", tabInactive: "Неактивные",
      colSelectAll: "Выбрать всех", colUser: "Пользователь", colRole: "Роль", colPhone: "Телефон", colEmail: "Email", colStatus: "Статус", colRegisteredAt: "Дата регистрации", colActions: "Действия",
      selectUser: (name) => `Выбрать ${name}`,
      statusActive: "Активен", statusInactive: "Неактивен", statusBlocked: "Заблокирован",
      actionView: "Просмотреть", actionEdit: "Редактировать", actionChangeStatus: "Изменить статус", actionChangeStatusDisabled: "Нельзя изменить статус своей учётной записи",
      paginationItemLabel: "пользователей",
      filtersTitle: "Фильтры", filterSearch: "Поиск", filterSearchPlaceholder: "Имя, email или телефон...",
      filterRole: "Роль", filterAllRoles: "Все роли",
      filterStatus: "Статус", filterAllStatuses: "Все статусы", filterActiveStatus: "Активные", filterInactiveStatus: "Неактивные", filterBlockedStatus: "Заблокированные",
      filterRegisteredDate: "Дата регистрации", filterApply: "Применить", filterReset: "Сбросить",
      roleDistributionTitle: "Пользователей по ролям",
      modalAddTitle: "Добавить пользователя", modalEditTitle: "Редактировать пользователя", modalViewTitle: "Профиль пользователя", modalAddDescription: "Создайте новую учётную запись",
      fieldFullName: "ФИО", fieldFullNamePlaceholder: "Имя и фамилия",
      fieldLogin: "Логин", fieldLoginPlaceholder: "username",
      fieldEmail: "Email", fieldEmailPlaceholder: "name@binosoz.tj",
      fieldPhone: "Телефон", fieldPhonePlaceholder: "+992 00 000 00 00",
      fieldRole: "Роль", fieldStatus: "Статус",
      buttonClose: "Закрыть", buttonCancel: "Отмена", buttonAdd: "Добавить", buttonSave: "Сохранить",
      errorRequiredFields: "Заполните имя, логин и email", errorPhoneFormat: "Формат телефона: +992 XX XXX XX XX", errorLoginTaken: "Этот логин уже занят другим пользователем",
      csvUser: "Пользователь", csvRole: "Роль", csvPhone: "Телефон", csvEmail: "Email", csvStatus: "Статус",
    },
    dashboard: {
      pageTitle: "Обзор компании", pageSubtitle: "Контроль объектов, финансов и выполнения работ",
      kpiTotalBudget: "Общий бюджет", kpiSpent: (v) => `Израсходовано: ${v}`,
      kpiActiveObjects: "Активные объекты", kpiInProgress: (n) => `${n} в работе`, kpiCompletedObjects: (n) => `${n} завершены`,
      kpiPayrollDebt: "Задолженность по зарплате", kpiNextPayment: (d) => `Следующая выплата: ${d}`, kpiNotScheduled: "не запланирована",
      kpiCompletedWorks: "Выполненные работы", kpiOverallProgress: "Общий прогресс по всем объектам",
      periodWeek: "Неделя", periodMonth: "Месяц", periodQuarter: "Квартал", periodYear: "Год",
      objectsStateTitle: "Состояние объектов", viewAllObjects: "Все объекты →",
      colObject: "Объект", colForeman: "Прораб", colProgress: "Прогресс", colBudget: "Бюджет", colStatus: "Статус",
      attentionTitle: "Работы, требующие внимания", attentionOpen: "Открыть", overdueBy: (n) => `Просрочено на ${n} дн.`, stockDepleted: "Остаток исчерпан", stockLow: "Остаток ниже минимума",
      budgetChartTitle: "Бюджет и фактические расходы",
      budgetTotal: "Общий бюджет", budgetSpent: "Фактические расходы", budgetRemaining: "Остаток", budgetOver: "Превышение бюджета",
      payrollApprovedTitle: "Зарплата утверждена", payrollPeriod: (p) => `Период: ${p}`, payrollToPay: (v) => `К выплате ${v}`,
      payrollToApproveTitle: "Зарплата к утверждению", payrollPeriodLabel: "Период:", payrollEmployeeCount: "Количество сотрудников:", payrollAccrued: "Начислено:", payrollDeductions: "Удержания:", payrollTotalToPay: "Итого к выплате:", payrollPreparedBy: (n) => `Подготовил: ${n}`,
      payrollReturned: "Возвращено бухгалтеру на доработку",
      payrollApprove: "Утвердить зарплату", payrollReturnToAccountant: "Вернуть бухгалтеру",
      payrollApproveConfirmTitle: "Утвердить зарплату?", payrollApproveConfirmDescription: (p, v) => `Период: ${p}. Итого к выплате: ${v}.`, payrollApproveConfirmLabel: "Утвердить",
      payrollReturnModalTitle: "Вернуть бухгалтеру", payrollReturnModalDescription: "Опишите, что нужно исправить перед повторной проверкой.",
      payrollReturnCancel: "Отмена", payrollReturnConfirm: "Вернуть",
      payrollCommentLabel: "Комментарий", payrollCommentPlaceholder: "Например: пересчитать удержания по бригаде №3",
      toastApproved: "Зарплата утверждена", toastReturned: "Расчёт возвращён бухгалтеру",
    },
    settings: {
      pageTitle: "Настройки", pageSubtitle: "Управление системой и параметрами компании",
      searchPlaceholder: "Поиск по настройкам...", searchResults: "Результаты поиска", noResultsFound: "Настройки не найдены",
      openAction: "Открыть →", save: "Сохранить", savedAt: "Сохранено в", support: "Поддержка", documentation: "Документация",
      footerCopyright: "© 2026 BINOSOZ. Все права защищены.",
      tabs: { general: "Общие", company: "Компания", finance: "Финансы", notifications: "Уведомления", security: "Безопасность", integrations: "Интеграции", backups: "Резервные копии" },
      general: {
        generalCardTitle: "Общие настройки",
        language: "Язык интерфейса", languageDescription: "Выберите язык системы",
        timezone: "Часовой пояс", timezoneDescription: "Установите часовой пояс",
        dateFormat: "Формат даты", dateFormatDescription: "Выберите формат отображения даты",
        timeFormat: "Формат времени", timeFormatDescription: "Выберите формат времени",
        currency: "Валюта по умолчанию", currencyDescription: "Основная валюта системы",
        measurement: "Единицы измерения", measurementDescription: "Система единиц измерения",
        displayCardTitle: "Настройки отображения",
        theme: "Тема интерфейса", themeDescription: "Выберите тему оформления",
        themeLight: "Светлая", themeDark: "Тёмная", themeSystem: "Системная",
        accent: "Основной цвет", accentDescription: "Цветовая тема системы",
        density: "Плотность интерфейса", densityDescription: "Размер элементов и отступы",
        densityCompact: "Компактная", densityComfortable: "Удобная", densitySpacious: "Просторная",
        sidebarMode: "Отображение бокового меню", sidebarModeDescription: "Режим отображения меню",
        sidebarCollapsed: "Сжато", sidebarExpanded: "Развернуто",
        animations: "Анимации интерфейса", animationsDescription: "Включить плавные анимации",
        workCardTitle: "Настройки работы",
        automaticBackup: "Автоматическое резервное копирование", automaticBackupDescription: "Создавать резервные копии базы данных",
        confirmDelete: "Подтверждение удаления", confirmDeleteDescription: "Запрашивать подтверждение при удалении",
        activityLog: "Журнал действий", activityLogDescription: "Вести журнал всех действий в системе",
        autoCloseTasks: "Автозавершение задач", autoCloseTasksDescription: "Автоматически завершать просроченные задачи",
        stockCheck: "Проверка остатков на складе", stockCheckDescription: "Контроль минимальных остатков материалов",
        documentsCardTitle: "Настройки документов",
        documentNumbering: "Нумерация документов", documentNumberingDescription: "Автоматическая нумерация документов",
        documentPrefix: "Префикс документов", documentPrefixDescription: "Префикс для номеров документов",
        printForms: "Печатные формы", printFormsDescription: "Использовать фирменные шаблоны",
        documentSignature: "Подпись в документах", documentSignatureDescription: "Автоматическая подпись в документах",
        watermark: "Водяной знак", watermarkDescription: "Добавлять водяной знак к документам",
        notImplemented: "Требует серверной части — пока недоступно",
      },
      company: {
        cardTitle: "Реквизиты компании", companyName: "Название компании", companyPhone: "Телефон", companyEmail: "Email",
        companyAddress: "Адрес", taxId: "ИНН",
        infoTitle: "Профиль компании", infoText: "Эти данные используются в печатных формах, отчётах и экспортируемых документах.",
      },
      finance: {
        cardTitle: "Финансовые параметры", currency: "Основная валюта", vatRate: "Ставка НДС, %", fiscalYear: "Финансовый год",
        fiscalYearCalendar: "Календарный год", fiscalYearApril: "Апрель — март",
        infoTitle: "Форматы расчётов", infoText: "Финансовые параметры применяются к новым сметам, бюджетам, зарплатам и отчётам.",
      },
      notifications: {
        cardTitle: "Каналы уведомлений", email: "Email-уведомления", browser: "Уведомления браузера",
        deadlines: "Сроки и просрочки", stock: "Критические остатки",
        infoTitle: "Центр уведомлений", infoText: "Выбранные события отображаются в колокольчике и отправляются по разрешённым каналам.",
      },
      security: {
        cardTitle: "Безопасность доступа", sessionMinutes: "Время сессии", twoFactor: "Двухфакторная аутентификация",
        passwordExpiry: "Срок действия паролей", loginAlerts: "Оповещения о входе",
        infoTitle: "Политика паролей", infoText: "Пароли не сохраняются в настройках. В production проверка выполняется сервером аутентификации.",
      },
      integrations: {
        cardTitle: "API и интеграции", apiEnabled: "Доступ к API", apiUrl: "API URL", webhookUrl: "Webhook URL",
        oneC: "Интеграция с 1С", telegram: "Telegram-уведомления",
        infoTitle: "Статус интеграций", infoText: "Интеграции включаются только после указания действующих адресов и серверных ключей.",
      },
      backups: {
        cardTitle: "Резервное копирование", automaticCopies: "Автоматические копии", frequency: "Периодичность",
        frequencyDaily: "Ежедневно", frequencyWeekly: "Еженедельно", frequencyMonthly: "Ежемесячно",
        createBackup: "Создать копию", restoreBackup: "Восстановить",
        infoTitle: "Локальная копия", infoText: "Копия содержит только данные приложения из localStorage. Пароли и секретные ключи в неё не включаются.",
      },
      systemInfo: {
        title: "Информация о системе", version: "Версия системы", build: "Сборка", license: "Лицензия", licenseActive: "Активна",
        licenseType: "Тип лицензии", licenseTypeValue: "Профессиональная", validUntil: "Действует до", usersLabel: "Пользователей",
        storageLabel: "Место в хранилище", storageOf: "из",
      },
      systemActivity: {
        title: "Активность системы", viewLog: "Просмотреть журнал",
        login: "Вход в систему", documentCreated: "Создан документ", dataChanged: "Изменены данные",
        userDeleted: "Удалён пользователь", backupCreated: "Резервное копирование",
      },
    },
  },
  tj: {
    sidebar: {
      dashboard: "Хулоса", objects: "Объектҳо", estimatesAndBudgets: "Сметаҳо ва буҷетҳо", estimates: "Сметаҳо", budgets: "Буҷетҳо",
      works: "Корҳо", brigades: "Бригадаҳо", brigadesList: "Рӯйхати бригадаҳо", brigadesComposition: "Таркиби бригадаҳо",
      assignments: "Таъйинот", myBrigade: "Бригадаи ман", assignedWorks: "Таъиноти корҳо", employees: "Кормандон",
      attendance: "Ҳузур", warehouse: "Анбор ва маводҳо", materials: "Маводҳо", receipts: "Воридот",
      writeOffs: "Ҳисоббарорӣ", transfers: "Интиқолҳо", stock: "Мондаҳо", payroll: "Маош", reports: "Ҳисоботҳо",
      users: "Корбарон", settings: "Танзимот", closeMenu: "Пӯшидани меню", logout: "Баромадан",
    },
    header: {
      openMenu: "Кушодани меню", searchPlaceholder: "Ҷустуҷӯ...", notifications: "Огоҳиномаҳо", profile: "Профил", settings: "Танзимот", logout: "Баромадан",
      demoNotificationOverdue: "Рехтани фундамент таъхир кард", demoNotificationPayroll: "Маоши июл барои тасдиқ омода аст",
      criticalMaterialsNotification: (count) => `${count} мавод дар анбор мондаи интиқодӣ дорад`,
      justNow: "Ҳозир",
      minutesAgo: (n) => `${n} дақиқа пеш`,
      hoursAgo: (n) => `${n} соат пеш`,
    },
    common: {
      statusInProgress: "Дар кор", statusAtRisk: "Хатарнок", statusAlmostDone: "Қариб тайёр", statusCompleted: "Анҷомёфта",
      open: "Кушодан",
      paginationShown: (from, to, total, itemLabel) => `Намоиш дода шуд ${from}–${to} аз ${total} ${itemLabel}`,
      showPerPage: "Намоиш додан аз рӯи:", prevPage: "Саҳифаи гузашта", nextPage: "Саҳифаи оянда",
      confirmLabel: "Тасдиқ кардан", cancelLabel: "Бекор кардан",
      selectPlaceholder: "Интихоб кунед...", selectEmpty: "Чизе ёфт нашуд", selectSearch: "Ҷустуҷӯ...", selectClear: "Пок кардан",
      placeholderTitle: "Бахш дар ҳоли таҳия",
      placeholderNote: "Ин бахш ба зудӣ дастрас мешавад. Мо кор мекунем, ки ҳамон маълумот ва интерактивиро, ки дар саҳифаҳои «Хулоса» ва «Объектҳо» ҳастанд, ба ин ҷо интиқол диҳем.",
      roleLabels: { owner: "Соҳиб", administrator: "Маъмур", accountant: "Бухгалтер", prorab: "Прораб", brigadir: "Бригадир", worker: "Коргар", storekeeper: "Анборчӣ" },
      profileTitle: "Профил", profileRole: "Нақш", profilePhone: "Телефон", profileEmail: "Email", profileRegisteredAt: "Санаи бақайдгирӣ",
      save: "Нигоҳ доштан", delete: "Нест кардан", edit: "Таҳрир кардан", view: "Дидан",
      tableActions: "Амалҳо", editUnavailableInDemo: "Таҳрир дар демо ҳоло дастрас нест",
      emptyStateHint: "Параметрҳои ҷустуҷӯро тағйир диҳед ё филтрҳоро бозсозӣ кунед", resetFiltersButton: "Бозсозии филтрҳо",
      filtersButton: "Филтрҳо", resetButton: "Бозсозӣ", applyButton: "Татбиқ кардан",
      colObject: "Объект", colStatus: "Ҳолат", colDate: "Сана", colAmountSomoni: "Маблағ, сомонӣ",
      periodWeek: "Ҳафта", periodMonth: "Моҳ", periodQuarter: "Семоҳа", periodYear: "Сол",
      seriesPlanned: "Ба нақша гирифташуда", seriesSpent: "Сарф шуд",
      responsibleLabel: "Масъул", spentLabel: "Сарф шуд", remainingBudgetLabel: "Монда", budgetUsageLabel: "Истифодаи буҷет",
      totalBudgetLabel: "Буҷети умумӣ", totalBudgetSomoniLabel: "Буҷети умумӣ, сомонӣ", dateCreatedLabel: "Санаи эҷод",
      errorBudgetPositive: "Буҷети зиёда аз сифрро нишон диҳед",
      statusDraft: "Лоиҳа",
      riskBadgeLabels: { "Превышение": "Зиёдатӣ", "Ожидает проверки": "Дар интизори санҷиш", "Черновик": "Лоиҳа" },
      colBrigade: "Бригада", colPhone: "Телефон",
      duplicateLabel: "Дубликат кардан", completeLabel: "Анҷом додан", progressLabel: "Пешрафт", commentLabel: "Шарҳ",
      exportButton: "Содирот", descriptionLabel: "Тавсиф",
      upcomingAssignmentsTitle: "Таъиноти наздик", allAssignmentsLink: "Ҳамаи таъинот →",
    },
    works: {
      pageTitle: "Корҳо", pageSubtitle: "Банақшагирӣ, назорат ва пайгирии иҷрои корҳо", searchPlaceholder: "Ҷустуҷӯ аз рӯи корҳо...", addWork: "Илова кардани кор",
      tabAll: "Ҳамаи корҳо", tabInProgress: "Дар ҷараён", tabCompleted: "Анҷомёфта", tabOverdue: "Таъхиршуда",
      kpiTotal: "Ҳамаи корҳо", kpiTotalFooter: "Бо назардошти вазифаҳои зерин", kpiCompleted: "Анҷомёфта", kpiInProgress: "Дар ҷараён", kpiOverdue: "Таъхиршуда",
      kpiPercentOfTotal: (n) => `${n}% аз ҳаҷми умумӣ`,
      filterObjectAriaLabel: "Объект", allObjectsOption: "Ҳамаи объектҳо",
      filterSectionAriaLabel: "Бахш", allSectionsOption: "Ҳамаи бахшҳо",
      filterStatusAriaLabel: "Ҳолат", statusAllLabel: "Ҳолат: Ҳама",
      statusCompleted: "Анҷомёфта", statusInProgress: "Дар ҷараён", statusOverdue: "Таъхиршуда", statusPlanned: "Ба нақша гирифташуда",
      statusOnReview: "Дар санҷиш", statusPaused: "Муваққатан истода", statusCancelled: "Бекоршуда",
      selectedCount: (n) => `Интихобшуда: ${n} кор`,
      colWork: "Кор", colObjectSection: "Объект / Бахш", colResponsible: "Масъул", colPlanFact: "Нақша / Воқеият", colStatusProgress: "Ҳолат / Пешрафт",
      selectAllAriaLabel: "Интихоби ҳамаи корҳо дар саҳифа", selectRowAriaLabel: (title) => `Интихоби кори ${title}`,
      daysShort: "рӯз",
      emptyTitle: "Корҳо ёфт нашуданд", paginationItemLabel: "кор",
      dynamicsTitle: "Динамикаи иҷрои корҳо", bySectionsTitle: "Корҳо аз рӯи бахшҳо", colSection: "Бахш", colWorksCount: "Корҳо",
      summaryTitle: "Хулоса аз рӯи корҳо", donutSuffix: "кор",
      periodLabel: "Давра", filterResponsibleAriaLabel: "Масъул", allResponsibleOption: "Ҳамаи масъулон", allBrigadesOption: "Ҳамаи бригадаҳо",
      criticalTitle: "Корҳои муҳим", criticalNone: "Корҳои муҳим нестанд", overdueDaysLabel: (n) => `${n} рӯз`, allCriticalLink: "Ҳамаи корҳои муҳим →",
      exportPdf: "Содироти PDF", exportExcel: "Содироти Excel", printReport: "Чопи ҳисобот",
      exportingPdf: "Содирот ба PDF", exportingExcel: "Содирот ба Excel", preparingPrint: "Омодасозии ҳисобот барои чоп", exportDone: (label) => `${label}: тайёр`,
      formAddTitle: "Илова кардани кор", formEditTitle: "Таҳрири кор", formDescription: "Параметрҳои кор, мӯҳлатҳо ва масъулонро пур кунед",
      fieldTitle: "Номи кор", fieldTitlePlaceholder: "Масалан, Гузоштани фундамент",
      fieldCode: "Рамзи кор", fieldCodePlaceholder: "1.1",
      fieldPriority: "Дараҷаи аҳамият", fieldSection: "Бахш", fieldDescriptionPlaceholder: "Тавсифи мухтасари мазмуни кор",
      fieldPlannedStart: "Санаи оғози нақшавӣ", fieldPlannedEnd: "Санаи анҷоми нақшавӣ", fieldPlannedDuration: "Давомнокии нақшавӣ",
      durationDaysValue: (n) => `${n} рӯз`, noValue: "—",
      fieldInitialProgress: "Пешрафти ибтидоӣ, %", fieldBudget: "Буҷети кор, сомонӣ",
      fieldParentWork: "Кори асосӣ", noneOption: "Нест",
      fieldDependencies: "Вобастагиҳо", noDependenciesAvailable: "Корҳои дастрас нестанд",
      fieldAttachments: "Замимаҳо", attachButton: "Замима кардани файлҳо", removeAttachmentAriaLabel: (name) => `Нест кардани ${name}`,
      saveChanges: "Нигоҳ доштани тағйирот", createWork: "Сохтани кор",
      errorTitleRequired: "Номи корро нишон диҳед", errorCodeRequired: "Рамзи корро нишон диҳед", errorCodeTaken: "Ин рамз аллакай истифода мешавад",
      errorPlannedStartRequired: "Санаи оғозро нишон диҳед", errorPlannedEndRequired: "Санаи анҷомро нишон диҳед", errorPlannedEndBeforeStart: "Анҷом наметавонад пеш аз оғоз бошад",
      errorProgressRange: "Пешрафт бояд аз 0 то 100 бошад", errorBudgetPositive: "Буҷет бояд зиёда аз сифр бошад",
      priorityLow: "Паст", priorityMedium: "Миёна", priorityHigh: "Баланд", priorityCritical: "Ҳалкунанда",
      sectionPrep: "Корҳои тайёрӣ", sectionFoundation: "Фундаментҳо", sectionStructure: "Корҳои васлкунӣ",
      sectionFinishing: "Корҳои ороишӣ", sectionEngineering: "Шабакаҳои муҳандисӣ", sectionOther: "Корҳои дигар",
      actionProgress: "Тағйири пешрафт", actionAssignResponsible: "Таъини масъул", actionAssignBrigade: "Таъини бригада", actionPause: "Муваққатан боздоштан",
      progressModalTitle: "Тағйири пешрафт", progressPercentLabel: "Пешрафт, %",
      commentUpdateLabel: "Шарҳ ба навсозӣ", commentPlaceholderExample: "Масалан, 40 м³ бетон рехта шуд",
      detailsDefaultTitle: "Кор", updateProgressButton: "Навсозии пешрафт", completeWorkButton: "Анҷом додани кор",
      changeStatusLabel: "Тағйири ҳолат", plannedTermsLabel: "Мӯҳлатҳои нақшавӣ", actualTermsLabel: "Мӯҳлатҳои воқеӣ", notStartedLabel: "Оғоз нашудааст",
      actualDurationLabel: "Давомнокии воқеӣ", budgetLabel: "Буҷети кор", priorityLabel: "Дараҷаи аҳамият", progressExecutionLabel: "Пешрафти иҷро",
      dependenciesLabel: "Вобастагиҳо", noAttachments: "Замима нест", progressHistoryLabel: "Таърихи пешрафт",
      commentsLabel: "Шарҳҳо", noCommentsYet: "Шарҳе ҳанӯз нест", addCommentPlaceholder: "Илова кардани шарҳ...", addButton: "Илова кардан",
      historyNoteCompleted: "Кор анҷом ёфт", historyNoteProgressUpdated: "Навсозии пешрафт", historyNoteCreated: "Кор сохта шуд", historyNoteDuplicated: "Кор дубора сохта шуд",
      toastCompleted: "Кор анҷом ёфт", toastPaused: "Кор муваққатан боздошта шуд", toastStatusUpdated: "Ҳолат навсозӣ шуд", toastProgressUpdated: "Пешрафт навсозӣ шуд",
      toastDuplicated: "Кор дубора сохта шуд", toastUpdated: "Кор навсозӣ шуд", toastCreated: "Кор илова карда шуд", toastDeleted: "Кор нест карда шуд",
      toastBulkCompleted: (n) => `Корҳои анҷомёфта: ${n}`, toastBulkDeleted: (n) => `Корҳои нест шуда: ${n}`,
      deleteConfirmTitle: "Кор нест карда шавад?", deleteConfirmDescription: (title, code) => `Кори «${title}» (${code}) нест карда мешавад.`,
      copyTitle: (title) => `${title} (нусха)`,
    },
    brigades: {
      pageTitle: "Бригадаҳо", pageSubtitle: "Идоракунии бригадаҳо ва таркиби онҳо", searchPlaceholder: "Ҷустуҷӯ аз рӯи бригадаҳо, прорабон...", createBrigade: "Сохтани бригада",
      kpiTotalBrigades: "Ҳамаи бригадаҳо", kpiActiveBrigadesFooter: (n) => `Фаъол: ${n}`,
      kpiTotalMembers: "Кормандон дар бригадаҳо", kpiWorkersFooter: (n) => `Аз онҳо коргарон: ${n}`,
      kpiAssignedWorks: "Ба корҳо таъиншуда", kpiObjectsFooter: "Объект",
      kpiAverageEfficiency: "Самаранокии миёна", kpiCurrentPeriodFooter: "Барои давраи ҷорӣ",
      listTitle: "Рӯйхати бригадаҳо", emptyTitle: "Бригадаҳо ёфт нашуданд", paginationItemLabel: "бригада",
      distributionBySpecialtyTitle: "Тақсимот аз рӯи ихтисос", peopleUnitLabel: "нафар",
      activityTitle: "Фаъолияти бригадаҳо", distributionByRoleTitle: "Тақсимот аз рӯи нақшҳо",
      statusActive: "Фаъол", statusPaused: "Дар таваққуф", statusInactive: "Ғайрифаъол", statusForming: "Дар ҳоли ташаккул", statusOverloaded: "Серкор аз ҳад",
      employeeStatusOnShift: "Дар смена", employeeStatusOnSite: "Дар объект", employeeStatusAvailable: "Озод", employeeStatusOnTrip: "Дар сафар",
      employeeStatusAbsent: "Ғоиб", employeeStatusOnLeave: "Дар рухсатӣ", employeeStatusSickLeave: "Дар беморхобӣ",
      shiftDay: "Рӯзона", shiftEvening: "Бегоҳӣ", shiftNight: "Шабона", shiftDayOff: "Рӯзи истироҳат",
      colComposition: "Таркиб", membersCountLabel: (n) => `${n} нафар`, workersHelpersLabel: (workers, helpers) => `Коргарон: ${workers}, Ёрдамчиён: ${helpers}`,
      colObjectWorks: "Объект / Корҳо", remainingDaysLabel: (n) => `${n} рӯз монд`,
      actionChangeComposition: "Тағйири таркиб", actionAssignWork: "Таъин ба кор", actionChangeForeman: "Иваз кардани прораб", actionActivate: "Фаъол кардан", actionPauseBrigade: "Муваққатан боздоштан",
      toastCreatedDraft: "Бригада ҳамчун лоиҳа нигоҳ дошта шуд", toastCreated: "Бригада сохта шуд", toastPaused: "Бригада муваққатан боздошта шуд", toastActivated: "Бригада фаъол карда шуд", toastDuplicated: "Бригада дубора сохта шуд", toastDeleted: "Бригада нест карда шуд",
      deleteConfirmTitle: "Бригада нест карда шавад?", deleteConfirmDescription: (name) => `«${name}» аз рӯйхати бригадаҳо нест карда мешавад.`,
      createModalTitle: "Сохтани бригада", createModalDescription: "Параметрҳои бригадаро пур карда, таркибро ташкил кунед", saveDraftButton: "Нигоҳ доштан ҳамчун лоиҳа", defaultNamePrefix: (n) => `Бригадаи №${n}`,
      fieldName: "Номи бригада", fieldSpecialization: "Ихтисос", fieldSpecializationPlaceholder: "Масалан, Корҳои монолитӣ",
      fieldForemanName: "Прораб", fieldForemanNamePlaceholder: "Ному насаби прораб",
      fieldDescriptionPlaceholderBrigade: "Тавсифи мухтасари бригада",
      fieldCurrentWork: "Кори ҷорӣ", fieldCurrentWorkPlaceholder: "Масалан, Кофтани чуқурӣ",
      fieldTargetEfficiency: "Самаранокии ҳадаф, %", fieldCreatedDate: "Санаи таъсис",
      errorNameRequired: "Номи бригадаро нишон диҳед", errorSpecializationRequired: "Ихтисосро нишон диҳед", errorForemanRequired: "Прорабро нишон диҳед",
      errorMembersRequired: "Ҳадди ақал як иштирокчиро илова кунед", errorForemanIsMember: "Прораб наметавонад ҳамзамон узви оддӣ бошад",
      errorPlannedEndBeforeStartBrigade: "Хотима наметавонад пеш аз оғоз бошад", errorEfficiencyRange: "Самаранокӣ бояд аз 0 то 100 бошад",
      notDefined: "Муайян нашудааст", notAssigned: "Таъин нашудааст",
      teamBuilderTitle: "Таркиби бригада", searchEmployeePlaceholder: "Ҷустуҷӯи корманд...", allSpecialtiesOption: "Ҳамаи ихтисосҳо", nobodyFound: "Ҳеҷ кас ёфт нашуд",
      selectedCountLabel: (n) => `Интихобшуда: ${n}`, addMembersHint: "Иштирокчиёнро аз тарафи чап илова кунед", removeMemberAriaLabel: (name) => `Бартараф кардани ${name}`,
      detailsDefaultTitle: "Бригада",
      compositionLabel: (count, workers, helpers) => `${count} нафар (${workers} коргар / ${helpers} ёрдамчӣ)`,
      remainingDaysPlain: (n) => `${n} рӯз монд`,
      efficiencyLabel: "Самаранокӣ", hoursWorkedLabel: (n) => `${n} соат`, hoursWorkedTitle: "Соатҳои коркарда",
      attendanceTitle: "Ҳузур", payrollFundTitle: "Фонди музди кор (30 рӯз)", compositionCountTitle: (n) => `Таркиби бригада (${n})`,
      foremanTag: "(прораб)", brigadirTag: "(бригадир)", documentsTitle: "Ҳуҷҷатҳо", noDocuments: "Ҳуҷҷати замимашуда нест",
      compositionPageTitle: "Таркиби бригадаҳо", compositionPageSubtitle: "Идоракунии аъзоёни бригадаҳо, нақшҳо ва тақсимот аз рӯи объектҳо", compositionSearchPlaceholder: "Ҷустуҷӯ аз рӯи кормандон...",
      kpiTotalInBrigades: "Ҳамаи кормандон дар бригадаҳо", kpiActiveOnShift: "Фаъол дар смена", kpiActiveOnShiftFooter: (pct) => `${pct}% аз таркиби умумӣ`,
      kpiFreeSpecialists: "Мутахассисони озод", kpiReadyToAssign: "Омода барои таъинот", kpiAverageCompleteness: "Пуррагии миёна", kpiAllBrigadesFooter: "Аз рӯи ҳамаи бригадаҳо",
      addEmployeeButton: "Илова кардани корманд", compositionEmptyTitle: "Кормандон ёфт нашуданд", compositionPaginationItemLabel: "корманд",
      upcomingChangesTitle: "Тағйироти наздики таркиб", allChangesLink: "Ҳамаи тағйироти таркиб →",
      changeTypeTransfer: "Гузариш", changeTypeAssignment: "Таъинот", changeTypeReplacement: "Иваз",
      completenessTitle: "Пуррагии бригадаҳо", completenessExcellent: "Пуррагии аъло", completenessGood: "Пуррагии хуб",
      completenessAverage: "Пуррагии миёна", completenessLow: "Пуррагии паст",
      colEmployee: "Корманд", gradeSuffix: (n) => `Дараҷаи ${n}`, colBrigadeRole: "Бригада / Нақш", colObjectShift: "Объект / Смена",
      roleFilterAriaLabel: "Нақш", roleAllLabel: "Нақш: Ҳама",
      actionTransfer: "Гузарондан", actionChangeRole: "Тағйири нақш", actionChangeShift: "Тағйири смена", actionChangeStatus: "Тағйири ҳолат", actionRemoveFromBrigade: "Нест кардан аз бригада",
      toastEmployeeAdded: "Корманд илова карда шуд", toastShiftUpdated: "Смена навсозӣ шуд", toastStatusUpdated: "Ҳолат навсозӣ шуд", toastEmployeeTransferred: "Корманд гузаронида шуд", toastEmployeeRemoved: "Корманд аз бригада нест карда шуд",
      removeConfirmTitle: "Корманд аз бригада нест карда шавад?", removeConfirmDescription: (name, brigade) => `«${name}» аз «${brigade}» нест карда шуда, ба мутахассисони озод гузаронида мешавад.`,
      transferModalTitle: "Гузарондани корманд", transferModalDescription: "Гузарондани корманд ба бригадаи дигар", confirmTransferButton: "Тасдиқи гузариш",
      currentBrigadeLabel: "Бригадаи ҷорӣ", newBrigadeLabel: "Бригадаи нав", newRoleLabel: "Нақши нав",
      roleWorker: "Коргар", roleHelper: "Ёрдамчӣ", roleBrigadir: "Бригадир", roleForeman: "Прораб",
      transferDateLabel: "Санаи гузариш", reasonLabel: "Сабаб", reasonPlaceholder: "Масалан, норасоии кадрҳо",
      replaceEmployeeLabel: "Иваз кардани корманди дигар", doNotReplaceOption: "Иваз накардан",
      warningOverCapacity: "Бригадаи мақсаднок то ҳадди ниҳоии штат пур шудааст.",
      warningActiveWork: "Корманд таъиноти ҷории фаъол дорад — гузариш иштироки ӯро дар он анҷом медиҳад.",
      errorNewBrigadeDifferent: "Бригадаи нав бояд аз ҷории он фарқ кунад", errorTransferDateRequired: "Санаи гузаришро нишон диҳед",
      toastChangeCompositionUnavailable: "Тағйири таркиб дар демо ҳоло дастрас нест", toastAssignWorkUnavailable: "Таъин ба кор дар демо ҳоло дастрас нест", toastChangeForemanUnavailable: "Иваз кардани прораб дар демо ҳоло дастрас нест",
      toastFullAssignmentsListUnavailable: "Рӯйхати пурраи таъинот дар демо ҳоло дастрас нест", toastFullChangesListUnavailable: "Рӯйхати пурраи тағйирот дар демо ҳоло дастрас нест",
      addEmployeeModalTitle: "Илова кардани корманд", addEmployeeModalDescription: "Маълумоти кормандро пур карда, ба бригада таъин кунед",
      photoLabel: "Акси корманд", replacePhotoButton: "Иваз кардан", uploadPhotoButton: "Бор кардани акс", removePhotoButton: "Бартараф кардан", photoPreviewAlt: "Пешнамоиши акс",
      errorPhotoType: "Файли тасвирро интихоб кунед (JPG, PNG)", errorPhotoSize: "Андозаи файл набояд аз 5 МБ зиёд бошад",
      fieldFirstName: "Ном", fieldLastName: "Насаб",
      fieldSpecialty: "Ихтисос", fieldSpecialtyPlaceholder: "Масалан, Бетонрез",
      fieldGrade: "Дараҷаи ихтисос", fieldMemberRole: "Нақш дар бригада", fieldShift: "Смена", fieldAssignedDate: "Санаи таъинот",
      errorFirstNameRequired: "Номро нишон диҳед", errorLastNameRequired: "Насабро нишон диҳед", errorPhoneFormat: "Формат: +992 XX XXX XX XX", errorPhoneTaken: "Ин рақам аллакай истифода мешавад",
      errorSpecialtyRequired: "Ихтисосро нишон диҳед", errorBrigadeRequired: "Бригадаро интихоб кунед", errorGradeRange: "Дараҷа аз 1 то 6",
      detailsEmployeeDefaultTitle: "Корманд", brigadeAndObjectTitle: "Бригада ва объект",
      performanceLabel: "Нишондиҳандаи самаранокӣ", accruedTitle: "Ҳисоб шуд (30 рӯз)", qualificationLabel: "Ихтисоснокӣ", noBrigadeAssigned: "Таъин нашудааст",
      weekdayMon: "Дш", weekdayTue: "Сш", weekdayWed: "Чш", weekdayThu: "Пш", weekdayFri: "Ҷм", weekdaySat: "Шн", weekdaySun: "Як",
      calendarTitle: "Тақвими таъинот", prevMonthAriaLabel: "Моҳи гузашта", nextMonthAriaLabel: "Моҳи оянда", clearDateSelection: "Бекор кардани интихоби сана ×",
      monthJan: "январ", monthFeb: "феврал", monthMar: "март", monthApr: "апрел", monthMay: "май", monthJun: "июн",
      monthJul: "июл", monthAug: "август", monthSep: "сентябр", monthOct: "октябр", monthNov: "ноябр", monthDec: "декабр",
      assignmentStatusActive: "Дар кор", assignmentStatusCompleted: "Анҷомёфта", assignmentStatusCancelled: "Бекоршуда", assignmentStatusOverdue: "Таъхиршуда",
    },
    employees: {
      pageTitle: "Кормандон", pageSubtitle: "Идоракунии кормандони ширкат", searchPlaceholder: "Ҷустуҷӯ аз рӯи ФИО, вазифа, телефон...", searchPlaceholderShort: "Ҷустуҷӯ аз рӯи ФИО, вазифа...",
      statusAll: "Ҳама", statusActive: "Фаъол", statusVacation: "Дар рухсатӣ", statusDismissed: "Аз кор озодшуда",
      kpiTotal: "Ҳамаи кормандон", kpiActiveFooterPrefix: "Фаъол:",
      kpiWorkers: "Коргарон", kpiEngineers: "Муҳандисон ва ХТР", kpiAdmins: "Маъмурият", kpiPercentOfTotal: (n) => `${n}% аз шумораи умумӣ`,
      filterPositionAriaLabel: "Вазифа", allPositionsOption: "Вазифа: Ҳама", allBrigadesOption: "Бригада: Ҳама", allStatusesOption: "Ҳолат: Ҳама",
      resetFiltersAriaLabel: "Бозсозии филтрҳо",
      colEmployee: "Корманд", idPrefixLabel: (id) => `ID: ${id}`,
      colPosition: "Вазифа", colUnit: "Бригада / Шуъба", colHireDate: "Санаи қабул",
      selectAllRowsAriaLabel: "Интихоби ҳамаи сатрҳо", selectRowAriaLabel: (name) => `Интихоби ${name}`,
      viewEmployeeAriaLabel: "Дидани корманд", editEmployeeAriaLabel: "Таҳрири корманд",
      emptyTitle: "Кормандон ёфт нашуданд", paginationItemLabel: "корманд", addEmployeeButton: "Илова кардани корманд",
      csvId: "ID", csvFullName: "ФИО", csvUnit: "Бригада/Шуъба", csvHireDate: "Санаи қабул", csvPosition: "Вазифа", csvPhone: "Телефон", csvStatus: "Ҳолат",
      toastUpdated: "Маълумоти корманд навсозӣ шуд", toastCreated: "Корманд илова карда шуд", toastTransferred: (name) => `${name} ба шуъбаи нав гузаронида шуд`, toastDeleted: "Корманд нест карда шуд", toastExported: "Рӯйхати кормандон содир карда шуд",
      deleteConfirmTitle: "Корманд нест карда шавад?", deleteConfirmDescription: (name) => `«${name}» аз рӯйхати кормандон нест карда мешавад.`,
      contactInfoTitle: "Маълумоти тамос", genderMale: "Мард", workInfoTitle: "Маълумоти корӣ", ageYearsLabel: (age) => `${age} сола`,
      tenureYearsMonths: (years, months) => `${years} сол ${months} моҳ`,
      tenureYearsOnly: (years) => `${years} сол`,
      tenureMonthsOnly: (months) => `${months} моҳ`,
      fieldEmploymentType: "Навъи шуғл", fieldTenure: "Собиқаи корӣ", fieldSalary: "Маош",
      documentsTitle: "Ҳуҷҷатҳо", fieldPassport: "Шиноснома", fieldInn: "РМА",
      laborContractLabel: "Шартномаи меҳнатӣ", downloadButton: "Боргирӣ", contractDownloadedToast: (name) => `Шартномаи корманди ${name} боргирӣ шуд`,
      filterCategoryTitle: "Категорияи кормандон", categoryWorkers: "Коргарон", categoryEngineers: "Муҳандисон ва ХТР", categoryAdmin: "Маъмурият",
      hireDateFromLabel: "Санаи қабул аз", hireDateToLabel: "Санаи қабул то",
      transferModalTitle: "Гузарондани корманд", transferModalDescription: (name, unit) => `${name} — шуъбаи ҷорӣ: ${unit}`, transferButton: "Гузарондан",
      unitTypeLabel: "Навъи шуъба", unitTypeBrigade: "Бригада", unitTypeDepartment: "Шуъба", newDepartmentLabel: "Шуъбаи нав",
      formAddTitle: "Илова кардани корманд", formEditTitle: "Таҳрири корманд", formDescription: "Маълумоти асосии кормандро пур кунед",
      fieldFullName: "ФИО", fieldFullNamePlaceholder: "Масалан, Мирзоев Шаҳром",
      fieldPositionInput: "Вазифа", fieldPositionPlaceholder: "Масалан, Прораб",
      fieldCategory: "Категория", categoryWorker: "Коргар", categoryEngineer: "Муҳандис / ХТР", categoryAdminOpt: "Маъмурият",
      fieldDepartment: "Шуъба", fieldPhonePlaceholder: "+992 90 000 00 00",
      fieldEmail: "Email", fieldEmailPlaceholder: "name@example.com", fieldBirthDate: "Санаи таваллуд",
      fieldAddress: "Суроға", fieldAddressPlaceholder: "ш. Душанбе, кӯч. Рӯдакӣ 123", fieldSalaryForm: "Маош, сомонӣ",
      errorFullNameRequired: "ФИО-ро нишон диҳед", errorPositionRequired: "Вазифаро нишон диҳед", errorPhoneRequired: "Телефонро нишон диҳед",
      errorHireDateRequired: "Санаи қабулро нишон диҳед", errorEmailRequired: "Email-ро нишон диҳед", errorBirthDateRequired: "Санаи таваллудро нишон диҳед", errorSalaryPositive: "Маоши зиёда аз сифрро нишон диҳед",
    },
    assignments: {
      pageTitle: "Таъинот", pageSubtitle: "Таъин кардани бригадаҳо ва прорабҳо ба объектҳо ва корҳо", searchPlaceholder: "Ҷустуҷӯ аз рӯи таъинот...", createAssignment: "Таъини нав",
      kpiTotal: "Ҳамаи таъинот", kpiTotalFooter: "Барои давраи интихобшуда", kpiActive: "Таъиноти фаъол", kpiCompleted: "Анҷомёфта", kpiCancelledOrOverdue: "Бекоршуда / таъхиршуда",
      kpiPercentOfTotal: (n) => `${n}% аз ҳамаи таъинот`,
      listTitle: "Рӯйхати таъинот",
      statusAllLabel: "Ҳолат: Ҳама", objectAllLabel: "Объект: Ҳама", brigadeAllLabel: "Бригада: Ҳама", foremanAllLabel: "Прораб: Ҳама", allForemenOption: "Ҳамаи прорабҳо",
      emptyTitle: "Таъинот ёфт нашуд", paginationItemLabel: "таъинот",
      colNumber: "№", colObjectWork: "Объект / Кор", colBrigadeForeman: "Бригада / Прораб", colAmountShort: "Маблағ, с.",
      actionView: "Дидан", actionCancel: "Бекор кардан",
      toastCompleted: "Таъинот анҷом ёфт", toastCancelled: "Таъинот бекор карда шуд", toastUpdated: "Таъинот навсозӣ шуд", toastCreated: "Таъинот сохта шуд", toastDeleted: "Таъинот нест карда шуд",
      deleteConfirmTitle: "Таъинотро нест кунам?", deleteConfirmDescription: (number, objectName) => `Таъиноти №${number} (${objectName}) нест карда мешавад.`,
      defaultTitle: "Таъинот", numberTitle: (n) => `Таъиноти №${n}`, periodWorksLabel: "Давраи корҳо", amountLabel: "Маблағ",
      completeButton: "Анҷом додани таъинот", cancelButton: "Бекор кардани таъинот",
      editModalTitle: "Таҳрири таъинот", formDescription: "Бригада ва прорабро ба объект ва кор таъин кунед",
      fieldWorkTitle: "Кор", fieldPeriodStart: "Оғози давра", fieldPeriodEnd: "Анҷоми давра", fieldAmountSomoni: "Маблағ, сомонӣ", fieldProgressPercent: "Пешрафт, %",
      errorAmountPositive: "Маблағи аз сифр зиёдро нишон диҳед", errorPeriodStartRequired: "Оғози давраро нишон диҳед", errorPeriodEndRequired: "Анҷоми давраро нишон диҳед",
      noUpcomingAssignments: "Таъиноти наздик нест",
    },
    brigadirDashboard: {
      pageTitle: "Лавҳаи бригадир", pageSubtitle: "Назорати бригада, ҳозирӣ ва иҷрои корҳо",
      brigadeNotFoundTitle: "Бригада ёфт нашуд", brigadeNotFoundDescription: "Ҳисоби шумо ба ягон бригада пайваст нашудааст. Ба маъмур муроҷиат кунед.",
      crewCompositionLabel: "Таркиби бригада", crewCountValue: (n) => `${n} нафар`, crewNote: (onSite, absent) => `${onSite} дар объект · ${absent} ғоиб`,
      assignedWorksLabel: "Корҳои таъиншуда", assignedWorksNote: (inProgress, overdue) => `${inProgress} дар кор · ${overdue} таъхиршуда`,
      attendanceLabel: "Ҳозирӣ", attendanceNote: (n) => `${n} қайд барои давра`, noDataLabel: "Маълумот нест",
      efficiencyLabel: "Самаранокии бригада", statusNote: (label) => `Ҳолат: ${label}`,
      myCrewTitle: "Бригадаи ман", allCrewLink: "Ҳамаи бригада →", colSpecialty: "Ихтисос", noCrewYet: "Дар бригада ҳанӯз корманд нест",
      crewWorksTitle: "Корҳои бригада", allWorksLink: "Ҳамаи корҳо →", noActiveWorks: "Бригада кори фаъол надорад",
      worksSummaryTitle: "Ҷамъбасти корҳои бригада",
      criticalMaterialsTitle: "Маводҳои муҳим", noCriticalMaterials: "Маводи муҳим нест", goToMaterialsButton: "Гузаштан ба маводҳо",
      briefSummaryTitle: "Ҷамъбасти мухтасар", summaryRemainingDaysLabel: "Рӯзҳои боқимонда", callForemanButton: "Занг задан ба прораб",
    },
    brigadirWorks: {
      pageTitle: "Корҳои ман", pageSubtitle: "Корҳои ба бригадаи шумо таъиншуда",
      tabAllShort: "Ҳама",
      kpiTotalAssigned: "Ҳамаи таъиншуда", kpiPercentOfAssigned: (n) => `${n}% аз таъиншуда`,
      emptyDescription: "Барои ин варақа кори таъиншуда нест",
      thisWeekTitle: "Дар ин ҳафта", noWeekWorks: "Барои ин ҳафта кор ба нақша гирифта нашудааст",
    },
    brigadirTeam: {
      pageSubtitle: "Таркиби бригада, нақшҳо, ҳозирӣ ва натиҷанокӣ",
      kpiTotalEmployees: "Ҳамаи кормандон", kpiOnSiteNow: "Ҳозир дар объект", onSiteFooter: "Дар навбат / дар объект",
      kpiAbsentEmployees: "Ғоибанд", absentFooter: "Рухсатӣ / беморӣ / наомадан",
      crewCompositionTitle: (n) => `Таркиби бригада (${n})`, fullEmployeeListLink: "Рӯйхати пурраи кормандон →",
      specialtiesInCrewTitle: "Ихтисосҳо дар бригада",
      upcomingWorksTitle: "Корҳои наздики бригада",
      attendancePeriodTitle: "Ҳозирӣ барои давра", presentLabel: "Ҳозир буданд", lateLabel: "Дер омадан", absentLabel: "Ғоибӣ",
      noAttendanceRecords: "Барои давра қайди ҳозирӣ нест", openAttendanceButton: "Кушодани ҳозирӣ",
      briefInfoTitle: "Маълумоти мухтасар", brigadirLabel: "Бригадир:", foremanLabel: "Прораб:", objectLabel: "Объект:", brigadeStatusLabel: "Ҳолати бригада:",
      callForemanWithPhone: (phone) => `Занг задан ба прораб (${phone})`,
    },
    brigadirMaterials: {
      pageTitle: "Маводҳо", pageSubtitle: "Мондаи анбор, дархостҳо ва ҳаракати маводҳо",
      kpiTotalMaterials: "Ҳамаи маводҳо", kpiTotalMaterialsFooter: "ном",
      kpiTotalStock: "Мондаи умумӣ", kpiTotalStockFooter: "воҳид",
      kpiInTransit: "Дар роҳ", kpiInTransitFooter: "ном",
      kpiLowStock: "Мондаи кам", kpiLowStockFooter: "ном",
      kpiRequestsPeriod: "Дархостҳо барои давра", kpiRequestsPeriodFooter: "ҳамаи дархостҳо",
      tabStock: "Мондаи анбор", tabRequests: "Дархостҳои мавод", tabTransit: "Дар роҳ", tabHistory: "Таърихи ҳаракат", tabCategories: "Категорияҳо",
      searchMaterialPlaceholder: "Ҷустуҷӯи мавод...", searchRequestPlaceholder: "Ҷустуҷӯи дархост...",
      allCategoriesOption: "Ҳамаи категорияҳо", filterButton: "Филтр", exportButton: "Содирот", exportedToast: "Маводҳо содир карда шуданд",
      filterStatusLabel: "Ҳолати мондагӣ", allStatusesOption: "Ҳамаи ҳолатҳо", applyFilterButton: "Татбиқ",
      lowStockOnlyChip: "Танҳо бо мондаи кам",
      colMaterial: "Мавод", colCategory: "Категория", colUnit: "Воҳиди ченак", colStock: "Мондагӣ", colMinStock: "Мондаи ҳадди ақал", colStatus: "Ҳолат", colAction: "Амал",
      detailsButton: "Тафсилот",
      emptyMaterialsTitle: "Маводҳо ёфт нашуданд", emptyMaterialsDescription: "Параметрҳои ҷустуҷӯро иваз кунед ё филтрҳоро тоза кунед",
      paginationMaterialsLabel: "мавод", paginationRequestsLabel: "дархост", paginationHistoryLabel: "сабт",
      statusNormal: "Дар меъёр", statusLow: "Мондаи кам", statusCritical: "Ҳолати интиқодӣ", statusOutOfStock: "Мавҷуд нест",
      warehouseStatusTitle: "Ҳолати анбор", totalLabel: "ҳамагӣ",
      attentionBanner: (n) => `${n} мавод диққат металабад`,
      attentionBannerHint: "Рӯйхати мондаи камро санҷед",
      recentRequestsTitle: "Дархостҳои охирин", allRequestsLink: "Ҳамаи дархостҳо →", noRequestsYet: "Ҳанӯз дархост нест", createRequestButton: "Дархост фиристодан",
      colRequestNumber: "№ дархост", colRequestMaterial: "Мавод", colRequestQuantity: "Миқдор", colRequestDate: "Сана", colRequestStatus: "Ҳолат",
      requestStatusNew: "Нав", requestStatusApproved: "Тасдиқшуда", requestStatusInTransit: "Дар роҳ", requestStatusIssued: "Дода шуд", requestStatusRejected: "Рад шуд",
      emptyRequestsTitle: "Дархост ёфт нашуд", emptyRequestsDescription: "Дархости нав барои мавод эҷод кунед",
      colTransitDocument: "Ҳуҷҷат", colTransitMaterials: "Маводҳо", colTransitRoute: "Масир", colTransitDate: "Сана", colTransitStatus: "Ҳолат",
      emptyTransitTitle: "Дар роҳ мавод нест", emptyTransitDescription: "Ҳамаи интиқоли маводҳо анҷом ёфтааст",
      unitsShortLabel: "воҳид",
      emptyHistoryTitle: "Ҳанӯз ҳаракат нест",
      receivedLabel: (name) => `Воридот: ${name}`, writtenOffLabel: (name) => `Хориҷшавӣ: ${name}`, movedLabel: (from, to) => `Интиқол: ${from} → ${to}`,
      categoryItemsLabel: (n) => `${n} ном`, somoniLabel: "сомонӣ",
      createModalTitle: "Дархости нав барои мавод", createModalDescription: "Дархост барои тасдиқ ба прораб фиристода мешавад",
      fieldMaterial: "Мавод", fieldQuantity: "Миқдор", fieldNote: "Шарҳ", fieldNotePlaceholder: "Масалан, барои рехтани фундамент таъҷилӣ лозим аст", fieldNoteOptionalSuffix: "ихтиёрӣ",
      cancelButton: "Бекор кардан", submitRequestButton: "Дархостро фиристодан",
      errorSelectMaterial: "Мавод интихоб кунед", errorQuantityInvalid: "Миқдори дурустро нишон диҳед",
      requestCreatedToast: "Дархост барои тасдиқ фиристода шуд",
      drawerTitle: "Мавод", warehouseLabel: "Анбор", unitLabel: "Воҳиди ченак", currentStockLabel: "Мондаи ҷорӣ", minStockLabel: "Мондаи ҳадди ақал",
      priceLabel: "Нархи воҳид", totalValueLabel: "Арзиши умумӣ", noteLabel: "Шарҳ",
      recentReceiptsTitle: "Воридоти охирин", recentWriteOffsTitle: "Хориҷшавии охирин", transferHistoryTitle: "Таърихи интиқол", noDataLabel: "Маълумот нест",
    },
    brigadirReports: {
      pageTitle: "Ҳисоботҳо", pageSubtitle: "Таҳлил оид ба корҳо, маводҳо, бригада ва молия",
      tabOverview: "Хулоса", tabWorks: "Корҳо", tabMaterials: "Маводҳо", tabFinance: "Молия", tabBrigade: "Бригада", tabAttendance: "Ҳузур",
      kpiTotalWorks: "Ҳамаи корҳо", kpiCompletedWorks: "Корҳои иҷрошуда", kpiCompletedWorksFooter: (percent) => `${percent}% аз ҳаҷми умумӣ`,
      kpiOverdueWorks: "Корҳои дермонда", kpiAverageProgress: "Пешрафти миёна", kpiTotalExpenses: "Хароҷоти умумӣ", expensesFooter: "маводҳо барои давра",
      allObjectsOption: "Ҳамаи объектҳо", allBrigadesOption: "Ҳамаи бригадаҳо", filterButton: "Филтр", exportButton: "Содирот",
      dynamicsTitle: "Динамикаи иҷрои корҳо", seriesPlanned: "Нақша", seriesActual: "Натиҷаи воқеӣ", seriesRate: "Фоизи иҷро",
      statusDistributionTitle: "Тақсимоти корҳо аз рӯи ҳолат", priorityTitle: "Корҳо аз рӯи муҳимият",
      topObjectsTitle: "Объектҳои беҳтарин аз рӯи пешрафт", colObject: "Объект", colTotalWorks: "Ҳамаи корҳо", colCompleted: "Иҷрошуда", colProgress: "Пешрафт", colChange: "Тағйирот", allObjectsLink: "Ҳамаи объектҳо →",
      expensesByCategoryTitle: "Хароҷот аз рӯи категорияҳо", colCategory: "Категория", colAmount: "Маблағ", expenseMaterials: "Маводҳо", expenseLabor: "Музди меҳнат",
      periodSummaryTitle: "Хулосаи давра", summaryPeriod: "Давра", summaryObjects: "Объектҳо", summaryBrigades: "Бригадаҳо", summaryWorkers: "Коргарон", summaryWorkDays: "Рӯзҳои корӣ",
      exportPanelTitle: "Содироти ҳисоботҳо", exportPanelHint: "Ҳисоботҳоро дар шакли лозима боргирӣ кунед", exportPdf: "PDF", exportExcel: "Excel", exportCsv: "CSV", configureReportButton: "Танзими ҳисобот",
      noBrigadeTitle: "Бригада ёфт нашуд", noBrigadeDescription: "Аккаунти шумо ба ягон бригада пайваст нашудааст",
      emptyChartData: "Барои давраи интихобшуда маълумот нест", emptyTableData: "Маълумот нест",
      csvExportedToast: "Ҳисобот содир карда шуд", printPreparedToast: "Ҳисобот барои чоп омода шуд",
      workStatusCompleted: "Иҷрошуда", workStatusInProgress: "Дар кор", workStatusOnReview: "Дар тафтиш", workStatusOverdue: "Дермонда", workStatusOther: "Дигар",
      priorityHigh: "Баланд", priorityMedium: "Миёна", priorityLow: "Паст",
      worksTabColWork: "Кор", worksTabColObject: "Объект", worksTabColProgress: "Пешрафт", worksTabColStatus: "Ҳолат",
      materialsTabTotal: "Ҳамаи маводҳо", materialsTabLowStock: "Мондаи кам", materialsTabRequests: "Дархостҳо барои давра", materialsTabOpenButton: "Кушодани маводҳо",
      financeTabBudgetTitle: "Буҷети объект", financeTabPlanLabel: "Нақша", financeTabActualLabel: "Воқеӣ", financeTabVarianceLabel: "Фарқият", financeTabNoBudget: "Буҷети объект ёфт нашуд",
      brigadeTabTitle: "Таркиби бригада", brigadeTabMembers: "Кормандон", brigadeTabEfficiency: "Натиҷанокӣ", brigadeTabForeman: "Прораб", brigadeTabObject: "Объект",
      attendanceTabPresent: "Ҳозир буданд", attendanceTabLate: "Дер омадан", attendanceTabAbsent: "Ғоибӣ",
      vsPreviousPeriod: "нисбат ба давраи қаблӣ", allObjectsLinkGeneric: "Ҳамаи объектҳо →", expensesDetailsLink: "Дар бораи хароҷот бештар →", specialtiesTitle: "Ихтисосҳо",
    },
    worker: {
      sidebarDashboard: "Асосӣ", sidebarTasks: "Корҳои ман", sidebarAttendance: "Ҳозиршавӣ", sidebarSchedule: "Ҷадвал", sidebarMaterials: "Маводҳо",
      sidebarPhotoReports: "Ҳисоботи фотоӣ", sidebarNotifications: "Огоҳиномаҳо", sidebarProfile: "Профил", sidebarReportProblem: "Хабар додан дар бораи мушкилот",
      greetingMorning: "Субҳ ба хайр", greetingDay: "Рӯз ба хайр", greetingEvening: "Шом ба хайр", dashboardSubtitle: "Имрӯз дар объект чӣ рӯй медиҳад",
      kpiTasksTitle: "Корҳои ман", kpiTasksFooter: "Ҳамагӣ таъингардида", kpiInProgressTitle: "Дар кор", kpiInProgressFooter: "Корҳои фаъол",
      kpiCompletedTitle: "Иҷрошуда", kpiCompletedFooter: "Дар ин моҳ", kpiHoursTitle: "Соатҳои коркард", kpiHoursFooter: "Дар ин моҳ",
      tasksTitle: "Корҳои ман", tasksTabAll: (n) => `Ҳама (${n})`, tasksTabInProgress: (n) => `Дар кор (${n})`,
      tasksTabReview: (n) => `Дар тафтиш (${n})`, tasksTabCompleted: (n) => `Иҷрошуда (${n})`, sortByPriority: "Аз рӯи муҳимият", viewAllTasks: "Ҳамаи корҳоро дидан →",
      statusAssigned: "Таъингардида", statusInProgress: "Дар кор", statusReview: "Дар тафтиш", statusCompleted: "Иҷрошуда", statusOverdue: "Мӯҳлаташ гузашта", statusPlanned: "Банақшагирифташуда", statusPaused: "Таваққуфшуда", statusCancelled: "Бекоршуда",
      priorityLow: "Паст", priorityMedium: "Миёна", priorityHigh: "Баланд", priorityCritical: "Ҳалкунанда",
      emptyTasks: "Корҳои таъингардида нест", emptySchedule: "Барои имрӯз кор банақша гирифта нашудааст", emptyNotifications: "Огоҳиномаи нав нест", emptyDocuments: "Ҳуҷҷат дастрас нест",
      colTotalWorks: "Ҳамагӣ корҳо", colCompleted: "Иҷрошуда",
      taskDetailTitle: "Кор", taskDetailObject: "Объект", taskDetailDates: "Мӯҳлатҳо", taskDetailProgress: "Пешрафт",
      taskDetailStatus: "Ҳолат", taskDetailPriority: "Муҳимият", taskDetailAssignedBy: "Таъингар", taskDetailComments: "Шарҳҳо",
      actionStart: "Кор сар кардан", actionSubmitReview: "Ба тафтиш фиристодан", actionUploadPhoto: "Сурат бор кардан", actionReportProblemLong: "Хабар додан дар бораи мушкилот", actionUpdateProgress: "Пешрафтро нав кардан", actionSaveProgress: "Пешрафтро нигоҳ доштан",
      scheduleTitle: (date) => `Имрӯз, ${date}`, scheduleBreak: "Танаффус", scheduleMeeting: "Ҷаласа бо прораб", viewFullSchedule: "Ҷадвали пурра →",
      notificationsTitle: "Огоҳиномаҳо", notificationsAllLink: "Ҳама",
      statsTitle: "Омори ман", statsHours: "Соатҳои коркард", statsCompleted: "Корҳои иҷрошуда", statsRating: "Рейтинг", statsViolations: "Вайронкуниҳо",
      ratingHigh: "Сатҳи баланд", ratingMedium: "Сатҳи миёна", ratingLow: "Диққат лозим", violationsGood: "Аъло!", violationsPresent: "Мулоҳиза мавҷуд",
      documentsTitle: "Ҳуҷҷатҳои ман", allDocumentsLink: "Ҳамаи ҳуҷҷатҳо →",
      quickActionsTitle: "Амалҳои зуд", actionPhotoReport: "Ҳисоботи фотоӣ", actionRequestMaterial: "Мавод дархост кардан", actionReportProblemShort: "Хабар додан дар бораи мушкилот",
      actionMessageProrab: "Ба прораб навиштан", actionCall: "Занг задан", actionViewSchedule: "Ҷадвалро дидан",
      photoModalTitle: "Ҳисоботи фотоӣ", photoModalTask: "Кор", photoModalTaskPlaceholder: "Корро интихоб кунед", photoModalImage: "Сурат", photoModalComment: "Шарҳ", photoModalCommentPlaceholder: "Тавсиф кунед, чӣ иҷро шуд...", photoModalSubmit: "Ҳисобот фиристодан",
      materialModalTitle: "Мавод дархост кардан", materialModalName: "Мавод", materialModalQty: "Миқдор", materialModalUnit: "Воҳид", materialModalNote: "Шарҳ", materialModalSubmit: "Дархост фиристодан",
      problemModalTitle: "Хабар додан дар бораи мушкилот", problemModalCategory: "Категория", problemModalTask: "Кори алоқаманд", problemModalNoTask: "Интихоб нашудааст", problemModalDescription: "Тавсифи мушкилот", problemModalPriority: "Муҳимият", problemModalSubmit: "Фиристодан",
      problemCategorySafety: "Бехатарӣ", problemCategoryMaterials: "Маводҳо", problemCategoryEquipment: "Таҷҳизот", problemCategoryOther: "Дигар",
      messageModalTitle: "Ба прораб навиштан", messageModalText: "Паём", messageModalPlaceholder: "Паёмро барои прораб нависед...", messageModalSubmit: "Фиристодан",
      toastPhotoSubmitted: "Ҳисоботи фотоӣ фиристода шуд", toastMaterialRequested: "Дархости мавод фиристода шуд", toastProblemReported: "Хабар дар бораи мушкилот фиристода шуд", toastMessageSent: "Паём ба прораб фиристода шуд", toastMarkedRead: "Ҳамчун хондашуда қайд шуд",
      attendancePageTitle: "Ҳозиршавӣ", attendancePageSubtitle: "Ҳозиршавӣ, дерравиҳо ва вақти корӣ", attendanceColDate: "Сана", attendanceColArrival: "Омадан", attendanceColDeparture: "Рафтан", attendanceColStatus: "Ҳолат", attendanceColHours: "Соатҳо",
      attendanceColObject: "Объект", attendanceColNote: "Қайд",
      kpiAttendanceTotalTitle: "Ҳамагӣ қайдҳо", kpiAttendanceTotalFooter: "барои давраи интихобшуда", kpiPresentTitle: "Ҳозир буд", kpiPresentFooter: "рӯзи корӣ", kpiLateTitle: "Дерравиҳо", kpiLateFooter: "барои давраи интихобшуда", kpiAbsentTitle: "Набудҳо", kpiAbsentFooter: "барои давраи интихобшуда",
      attendanceHistoryTitle: "Ҳозиршавии ман", attendanceTabAll: "Ҳама", attendanceTabPresent: "Ҳозир буд", attendanceTabLate: "Дерравиҳо", attendanceTabAbsent: "Набудҳо",
      statusDayOff: "Истироҳат", noteDayOff: "Рӯзи истироҳат", attendanceStatusPresent: "Ҳозир буд", attendanceStatusLate: "Дер монд", attendanceStatusAbsent: "Ҳозир набуд", statusNoData: "Маълумот нест",
      weeklyAnalyticsTitle: "Ҳозиршавӣ дар як ҳафта", normLabel: "Меъёр", factLabel: "Воқеӣ", latesLabel: "Дерравиҳо", absencesLabel: "Набудҳо",
      tooltipStatusLabel: "Ҳолат", tooltipCheckIn: "Омадан", tooltipCheckOut: "Рафтан", tooltipLate: "Дерравӣ", tooltipWorked: "Кор карда шуд",
      todayTimelineArrival: "Омадани субҳ", todayTimelineLunchStart: "Танаффуси хӯрокхӯрӣ", todayTimelineLunchEnd: "Бозгашт", todayTimelineDeparture: "Хотимаи смена", emptyTimeline: "Барои имрӯз маълумот нест",
      dailySummaryTitle: "Ҳисоботи рӯз", dailySummaryPresence: "Ҳузур", dailySummaryLate: "Дерравӣ", dailySummaryOvertime: "Кори иловагӣ", dailySummaryAttendance: "Ҳозиршавӣ", dailySummaryYes: "Ҳа", dailySummaryNo: "Не",
      remindersTitle: "Ёдоварӣ", emptyReminders: "Ёдоварӣ нест",
      shortSummaryTitle: "Хулосаи мухтасар", shortSummaryObject: "Объект", shortSummaryProrab: "Прораб", shortSummaryNextCheck: "Рӯзи кории оянда", shortSummaryActiveTasks: "Корҳои фаъол", contactProrabButton: "Бо прораб тамос гирифтан",
      emptyAttendance: "Барои давраи интихобшуда сабт нест", thisMonth: "Моҳи ҷорӣ", lastSevenDays: "7 рӯзи охир", lastThirtyDays: "30 рӯзи охир",
      schedulePageTitle: "Ҷадвал", schedulePageSubtitle: "Сменаҳо, вақти корӣ ва нақшаи ҳафта",
      kpiWorkdaysTitle: "Рӯзҳои корӣ", kpiWorkdaysFooter: "дар ин моҳ", kpiTodayShiftTitle: "Имрӯз", kpiTodayShiftFooter: "смени ҷорӣ",
      kpiNextDayOffTitle: "Истироҳати оянда", kpiNextDayOffFooter: (days) => (days <= 0 ? "имрӯз" : `баъди ${days} рӯз`), kpiWorkedHoursTitle: "Кор карда шуд", kpiWorkedHoursFooter: "дар ин моҳ",
      calendarShiftsTitle: "Тақвими сменаҳо", legendWorkday: "Рӯзи корӣ", legendDayOff: "Истироҳат", legendOvertime: "Кори иловагӣ", legendBriefing: "Ҷаласа",
      weekScheduleTitle: "Ҷадвал барои ҳафта", weekScheduleColDay: "Рӯз", weekScheduleColDate: "Сана", weekScheduleColTime: "Вақт", weekScheduleColStatus: "Ҳолат", weekScheduleColObject: "Объект",
      statusFullShift: "Смени корӣ", statusShortShift: "Рӯзи кӯтоҳ",
      upcomingEventsTitle: "Рӯйдодҳои наздик", hoursWorkedTitle: "Соатҳои коркард", planHoursLabel: "Нақша", overtimeHoursLabel: "Кори иловагӣ",
      monthSummaryTitle: "Ҳисоботи моҳ", summaryWorkdays: "Рӯзҳои корӣ", summaryDaysOff: "Рӯзҳои истироҳат", summaryOvertime: "Кори иловагӣ", summaryAvgAttendance: "Ҳозиршавии миёна",
      materialsPageTitle: "Маводҳо", materialsPageSubtitle: "Маводҳо дар объект ва дархостҳои шумо", materialsRequestButton: "Мавод дархост кардан", materialsColMaterial: "Мавод", materialsColQty: "Миқдор", materialsColStatus: "Ҳолат", materialsColDate: "Сана", emptyMaterialRequests: "Дархости мавод нест",
      materialsTabAvailable: "Маводҳои дастрас", materialsTabMyRequests: "Дархостҳои ман", materialsTabHistory: "Таърих",
      materialsKpiTotalTitle: "Ҳамагӣ дар анбор", materialsKpiAvailableTitle: "Дастрас", materialsKpiReservedTitle: "Дар захира", materialsKpiExpectedTitle: "Интизорӣ", materialsKpiFooter: (amount) => `ба маблағи ${amount} сом.`, materialsUnitsSuffix: "адад", materialsCurrencySuffix: "сом.",
      materialsSearchPlaceholder: "Ҷустуҷӯи мавод...", materialsAllCategories: "Ҳамаи категорияҳо", materialsUnitFilterPlaceholder: "Воҳиди ченак", materialsAvailabilityFilterLabel: "Дар дастрасӣ", materialsAllAvailability: "Ҳамаи маводҳо", materialsResetFilters: "Тоза кардан",
      materialsColCategory: "Категория", materialsColUnit: "Воҳиди ченак", materialsColInStock: "Дар анбор", materialsColReserved: "Захира", materialsColAvailable: "Дастрас", materialsColPrice: "Нарх",
      materialsResultsSummary: (from, to, total) => `Нишон дода шуд ${from}–${to} аз ${total} мавод`,
      emptyMaterialsSearch: "Мавод ёфт нашуд", emptyMaterialsSearchDescription: "Параметрҳои ҷустуҷӯро тағир диҳед ё филтрҳоро тоза кунед", emptyMaterialRequestsHistory: "Таърихи дархостҳо холӣ аст",
      materialsRequestCardTitle: "Мавод дархост кардан", materialsRequestMaterialPlaceholder: "Маводро интихоб кунед", materialsRequestQtyPlaceholder: "Миқдор", materialsRequestUnitPlaceholder: "Воҳиди ченак", materialsRequestCommentPlaceholder: "Шарҳ (ихтиёрӣ)",
      materialsErrorMaterialRequired: "Маводро интихоб кунед", materialsErrorQtyRequired: "Миқдори аз сифр зиёдро нишон диҳед",
      categoryStockTitle: "Мондаҳо аз рӯи категорияҳо", categoryStockCollapseAction: "Пинҳон кардан",
      recentRequestsTitle: "Дархостҳои охирин", recentRequestsAllAction: "Ҳамаи дархостҳо",
      photoReportsPageTitle: "Ҳисоботи фотоӣ", photoReportsPageSubtitle: "Суратҳои корҳои иҷрошуда, марҳилаҳо ва мулоҳизаҳо", photoReportsNewButton: "Ҳисоботи нав", emptyPhotoReports: "Ҳанӯз ҳисоботи фотоӣ нест", photoReportsCardTitle: "Ҳисоботҳои фотоии ман",
      photoKpiUploadedTitle: "Сурат бор карда шуд", photoKpiUploadedFooter: "дар ин моҳ", photoKpiTodayTitle: "Имрӯз", photoKpiTodayFooter: "суратҳои нав",
      photoKpiPendingTitle: "Дар тафтиш", photoKpiPendingFooter: "интизори тасдиқ", photoKpiApprovedTitle: "Тасдиқшуда", photoKpiApprovedFooter: "аз ҷониби прораб тасдиқ шуд",
      photoStatusPending: "Дар тафтиш", photoStatusApproved: "Тасдиқшуда", photoStatusRejected: "Радшуда",
      photoFilterAll: "Ҳама", photoFilterToday: "Имрӯз", photoFilterAllWorks: "Ҳамаи корҳо", photoUploadButton: "Сурат бор кардан",
      photoResultsSummary: (from, to, total) => `Нишон дода шуд ${from}–${to} аз ${total} ҳисобот`, photoViewAction: "Дидан",
      emptyPhotoReportsFiltered: "Ҳисобот ёфт нашуд", emptyPhotoReportsFilteredDescription: "Филтрҳоро тағир диҳед ё ҳисоботи нав бор кунед", photoReviewerCommentLabel: "Шарҳи прораб",
      photoUploadCardTitle: "Ҳисобот бор кардан", photoDropzoneTitle: "Суратҳоро ба ин ҷо кашед", photoDropzoneSubtitle: "ё барои интихоб клик кунед",
      photoUploadWorkLabel: "Кор", photoUploadWorkPlaceholder: "Корро интихоб кунед", photoUploadObjectLabel: "Объект", photoUploadObjectPlaceholder: "Аз рӯи кор муайян мешавад",
      photoErrorMaxImages: "На бештар аз 10 сурат", photoErrorFileType: "Танҳо JPG, PNG ва WEBP дастгирӣ мешаванд", photoErrorFileSize: "Андозаи файл набояд аз 10 МБ зиёд бошад", photoErrorWorkRequired: "Корро интихоб кунед", photoErrorImagesRequired: "Ҳадди ақал як сурат илова кунед",
      photoActivityTitle: "Фаъолият аз рӯи ҳисоботҳо", photoActivityUploaded: "Бор карда шуд", photoActivityApproved: "Тасдиқшуда",
      photoCommentsTitle: "Шарҳҳои охирин", photoCommentsToday: "Имрӯз", photoCommentsYesterday: "Дирӯз",
      photoSummaryTitle: "Хулосаи мухтасар", photoSummaryTotalTasks: "Ҳамагӣ корҳо", photoSummaryPendingPhotos: "Сурат лозим аст", photoSummaryNextCheck: "Тафтиши навбатӣ", photoSummaryRemarks: "Мулоҳизаҳо", photoSummaryGoToTasks: "Гузаштан ба корҳо",
      photoQuickActionsTitle: "Амалҳои зуд", photoActionTakePhoto: "Сурат гирифтан", photoActionChooseGallery: "Аз галерея интихоб кардан", photoActionMyTasks: "Корҳои ман", photoActionContactProrab: "Бо прораб тамос гирифтан",
      notificationsPageTitle: "Огоҳиномаҳо", notificationsPageSubtitle: "Ҳамаи огоҳиномаҳои муҳим ва паёмҳо", markAllRead: "Ҳамаро хондашуда қайд кардан",
      notificationTabAll: "Ҳама", notificationTabUnread: "Хонданашуда", notificationTabImportant: "Муҳим", notificationTabSystem: "Системавӣ",
      emptyNotificationsFiltered: "Огоҳинома ёфт нашуд", emptyNotificationsFilteredDescription: "Филтрҳоро тағир диҳед ё категорияҳои дигарро санҷед", notificationUnreadLabel: "хонда нашудааст",
      notificationPriorityImportant: "Муҳим", notificationPriorityNormal: "Оддӣ", notificationPrioritySystem: "Системавӣ",
      notificationsResultsSummary: (count) => `Нишон дода шуд 1–${count} аз ${count} огоҳинома`,
      notificationFiltersTitle: "Филтрҳо", notificationFilterTypeLabel: "Навъи огоҳинома", notificationAllTypes: "Ҳамаи навъҳо",
      notificationTypeTask: "Корҳо", notificationTypeMaterials: "Маводҳо", notificationTypeSchedule: "Ҷадвал", notificationTypePhotoReport: "Ҳисоботҳои фотоӣ", notificationTypeReminder: "Хотиррасонӣ", notificationTypeSystem: "Системавӣ",
      notificationFilterDateLabel: "Сана", notificationFilterPriorityLabel: "Аҳамият", notificationAllPriorities: "Ҳамаи аҳамиятҳо", notificationResetFilters: "Тоза кардани филтрҳо",
      notificationSummaryTitle: "Хулоса", notificationSummaryTotal: "Ҳамагӣ огоҳиномаҳо", notificationSummaryUnread: "Хонданашуда", notificationSummaryImportant: "Муҳим", notificationSummarySystem: "Системавӣ",
      notificationPushTitle: "Муҳимро аз даст надиҳед!", notificationPushDescription: "Огоҳиномаҳои push-ро фаъол кунед, то дар бораи корҳои нав ва тағиротҳо фавран огоҳ шавед.",
      notificationPushEnabled: "Огоҳиномаҳо фаъол аст", notificationPushDenied: "Огоҳиномаҳо дар браузер баста шудаанд", notificationPushUnsupported: "Браузер огоҳиномаҳои push-ро дастгирӣ намекунад", notificationPushEnableButton: "Фаъол кардани огоҳиномаҳо",
      documentsPageTitle: "Ҳуҷҷатҳои ман", documentsPageSubtitle: "Ҳуҷҷатҳо оид ба объекти шумо",
      profilePageTitle: "Профил", profilePageSubtitle: "Маълумоти шахсӣ, танзимот ва иттилоот дар бораи корманд", profileBrigade: "Бригада", profileObject: "Объект", profileSpecialty: "Ихтисос", profileGrade: "Дараҷа", profilePhone: "Телефон",
      profileStatusActive: "Фаъол", profileStatusInactive: "Ғайрифаъол", profileEditButton: "Профилро таҳрир кардан", profileChangePhotoButton: "Суратро иваз кардан", profileSaveButton: "Тағиротро нигоҳ доштан",
      profileErrorFirstNameRequired: "Номро нишон диҳед", profileErrorLastNameRequired: "Насабро нишон диҳед", profileErrorPhoneInvalid: "Рақами телефони дурустро ворид кунед", profileErrorEmailInvalid: "Email-и дурустро ворид кунед",
      profileToastUpdated: "Профил нав карда шуд", profileToastPhotoUpdated: "Суратҳи профил нав карда шуд",
      profileFieldFirstName: "Ном", profileFieldLastName: "Насаб", profileFieldEmail: "Email", profileFieldAddress: "Суроға", profileFieldEmergencyContact: "Тамоси фавқулодда",
      profileFieldBirthDate: "Санаи таваллуд", profileFieldPassport: "Шиноснома/ID", profileFieldHiredAt: "Санаи қабул ба кор", profileFieldSection: "Секцияи ҷорӣ", profileFieldExperience: "Таҷриба дар сохтмон", profileFieldForeman: "Прораб",
      profileProfessionalInfoTitle: "Маълумоти касбӣ", profilePersonalInfoTitle: "Маълумоти шахсӣ", profileSkillsTitle: "Малакаҳо",
      profileGradeValue: (grade) => `дараҷаи ${grade}`, profileYearsValue: (years) => `${years} сол`,
      profileStatsTitle: "Омори профил", profileStatsTotalLabel: "ҳамагӣ", profileStatCompletedTasks: "Корҳои иҷрошуда", profileStatPhotoReports: "Ҳисоботҳои фотоӣ", profileStatRemarks: "Мулоҳизаҳо", profileStatAttendance: "Ҳузури миёна",
      profileActivityTitle: "Фаъолияти охирин", profileActivityAttendance: "Ҳозиршавӣ қайд шуд", profileActivityPhoto: "Ҳисоботи фотоӣ бор карда шуд", profileActivityMaterials: "Мавод дархост шуд", profileActivityTask: "Кор ба анҷом расид",
      profileSettingsTitle: "Танзимот", profileSettingPush: "Огоҳиномаҳои Push", profileSettingSms: "Огоҳиномаҳои SMS", profileSettingTelegram: "Огоҳиномаҳои Telegram", profileSettingVisibility: "Намоёнии профил", profileSettingLanguage: "Забони интерфейс",
      profileDocumentsTitle: "Ҳуҷҷатҳо ва дастрасӣ", profileDocumentValidUntil: (date) => `Эътибор то ${date}`, profileDocumentUploaded: "Бор карда шуд", profileDocumentOpenButton: "Кушодан", profileDocumentOpened: "Ҳуҷҷат кушода шуд", profileDocumentMissing: "Ҳуҷҷат бор карда нашудааст",
      profileKpiExperienceTitle: "Собиқа", profileKpiTasksTitle: "Корҳои ман", profileKpiTasksFooter: "Корҳои фаъол", profileKpiHoursTitle: "Соатҳои корӣ", profileKpiHoursFooter: "Дар ин моҳ", profileKpiAttendanceTitle: "Ҳузури миёна", profileKpiAttendanceFooter: "Дар моҳи гузашта",
      materialStatusNew: "Нав", materialStatusApproved: "Тасдиқшуда", materialStatusInTransit: "Дар роҳ", materialStatusIssued: "Дода шуда", materialStatusRejected: "Радшуда",
      kpiTotalTasksTitle: "Ҳамагӣ корҳо", kpiReviewTitle: "Дар тафтиш", kpiReviewFooter: "Мунтазири тафтиш", kpiOverdueTitle: "Мӯҳлаташ гузашта", kpiOverdueFooter: "Корҳои мӯҳлаташ гузашта",
      filterButton: "Филтр", sortByPriorityOption: "Аз рӯи муҳимият", sortByDueDate: "Аз рӯи мӯҳлат", sortByProgress: "Аз рӯи пешрафт", sortNewest: "Аввал навҳо", sortOldest: "Аввал куҳнаҳо",
      filterPriorityLabel: "Муҳимият", filterObjectLabel: "Объект", filterOverdueOnly: "Танҳо мӯҳлаташ гузашта", filterAllObjects: "Ҳамаи объектҳо", filterApply: "Татбиқ кардан", filterReset: "Бекор кардан",
      tasksResultsSummary: (from, to, total) => `Нишон дода шуд ${from}–${to} аз ${total} кор`, paginationPrev: "Қафо", paginationNext: "Пеш",
      monthlyStatsTitle: "Омори моҳона", monthlyStatsCompletedTasks: "Корҳои иҷрошуда", monthlyStatsCompletedWorks: "Вазифаҳои иҷрошуда", monthlyStatsHours: "Соатҳои коркард", monthlyStatsAvgProgress: "Пешрафти миёна",
      upcomingTasksTitle: "Корҳои наздик", upcomingTasksAll: "Ҳама", upcomingTasksEmpty: "Кори наздик нест",
      tasksQuickActionsTitle: "Амалҳои зуд",
    },
    objects: {
      pageTitle: "Объектҳо", pageSubtitle: "Идоракунии объектҳои сохтмонӣ ва ҳолати онҳо", searchPlaceholder: "Ҷустуҷӯи объектҳо, минтақаҳо, прораб...",
      tabAll: "Ҳама", tabActive: "Фаъол", tabAtRisk: "Бо хатар", tabCompleted: "Анҷомёфта",
      kpiTotal: "Ҳамаи объектҳо", kpiTotalFooter: "Ҳамаи лоиҳаҳои ширкат",
      kpiInWork: "Дар кор", kpiCompleted: "Анҷомёфта", kpiAtRisk: "Хатарнок", kpiPercentOfTotal: (n) => `${n}% аз шумораи умумӣ`,
      listTitle: "Рӯйхати объектҳо", addObject: "Илова кардани объект",
      colCity: "Минтақа", colForeman: "Прораб", colProgress: "Пешрафт", colBudget: "Буҷет", colDeadline: "Мӯҳлат",
      actionViewObject: "Дидани объект",
      emptyTitle: "Объектҳо ёфт нашуданд",
      chartTitle: "Динамикаи объектҳо", chartModeProgress: "Пешрафт", chartModeBudget: "Буҷет", chartPeriodAriaLabel: "Давра",
      chartSeriesPlanned: "Пешрафти ба нақша гирифташуда", chartSeriesActual: "Пешрафти воқеӣ",
      summaryTitle: "Хулоса аз рӯи объекти интихобшуда", summaryDeadlineChip: (date) => `Мӯҳлат: ${date}`,
      summaryStartDate: "Санаи оғоз", summaryDeadline: "Мӯҳлати ниҳоӣ", summaryBudget: "Буҷет", summarySpent: "Сарф шуд", summaryRemaining: "Монда",
      summaryProgress: "Пешрафти иҷро", summaryOpenDetail: "Кушодани саҳифаи муфассал",
      taskListTitle: "Вазифаҳои наздик", taskOverdue: "Таъхиршуда", taskToday: "Имрӯз", taskPlanned: "Дар нақша", taskListAllLink: "Ҳамаи вазифаҳои объект →",
      addModalTitle: "Илова кардани объект", addModalDescription: "Маълумоти асосии объекти сохтмониро пур кунед", saveObjectButton: "Нигоҳ доштани объект",
      fieldName: "Номи объект", fieldNamePlaceholder: "Масалан, Маҷмааи истиқоматии «Зарафшон»",
      fieldType: "Навъи объект",
      fieldCity: "Шаҳр", fieldCityPlaceholder: "Масалан, Душанбе",
      fieldAddress: "Суроға", fieldAddressPlaceholder: "Кӯча, хона",
      fieldForeman: "Прораб", fieldForemanPlaceholder: "Ному насаби прораб",
      fieldStatus: "Ҳолат",
      fieldStartDate: "Санаи оғоз", fieldDeadline: "Мӯҳлати ниҳоӣ",
      fieldBudget: "Буҷети умумӣ, сомонӣ", fieldProgress: "Пешрафти ибтидоӣ, %",
      fieldImage: "Тасвири объект", fieldImageUploadHint: "Барои бор кардани тасвир зер кунед", fieldImagePreviewAlt: "Пешнамоиши объект",
      fieldDescription: "Тавсиф", fieldDescriptionPlaceholder: "Тавсифи мухтасари объект ва ҳаҷми корҳо",
      errorNameRequired: "Номи объектро нишон диҳед", errorCityRequired: "Шаҳрро нишон диҳед", errorAddressRequired: "Суроғаро нишон диҳед", errorForemanRequired: "Прорабро нишон диҳед",
      errorStartDateRequired: "Санаи оғозро нишон диҳед", errorDeadlineRequired: "Мӯҳлати ниҳоиро нишон диҳед", errorDeadlineBeforeStart: "Мӯҳлат наметавонад пеш аз санаи оғоз бошад",
      errorProgressRange: "Пешрафт бояд аз 0 то 100 бошад",
      objectTypeOptions: {
        residential: "Маҷмааи истиқоматӣ", business: "Маркази тиҷоратӣ", cottage: "Коттедж", warehouse: "Маҷмааи анборӣ",
        school: "Мактаб / маориф", clinic: "Клиникаи тиббӣ", mall: "Маркази савдо", service: "Хидматрасонии мошинҳо",
        hotel: "Меҳмонхона", sport: "Маҷмааи варзишӣ", factory: "Цехи истеҳсолӣ",
      },
      filterDrawerTitle: "Филтрҳо", filterCity: "Шаҳр", filterForeman: "Прораб",
      filterMinProgress: "Пешрафти ҳадди ақал, %", filterMaxProgress: "Пешрафти ҳадди аксар, %", filterMinBudget: "Буҷети ҳадди ақал", filterMaxBudget: "Буҷети ҳадди аксар",
      deleteConfirmTitle: "Объект нест карда шавад?", deleteConfirmDescription: (name) => `«${name}» аз рӯйхати объектҳо нест карда мешавад.`,
      toastCreated: "Объект бомуваффақият илова карда шуд", toastDeleted: "Объект нест карда шуд",
    },
    estimates: {
      pageTitle: "Сметаҳо", pageSubtitle: "Идоракунии сметаҳо аз рӯи объектҳо", searchPlaceholder: "Ҷустуҷӯи сметаҳо...", newEstimateButton: "Сметаи нав",
      kpiTotal: "Ҳамаи сметаҳо", kpiTotalOfPrefix: "Ба маблағи",
      kpiApproved: "Тасдиқшуда", kpiPendingReview: "Дар баррасӣ", kpiDraft: "Лоиҳаҳо",
      colNumber: "№ смета", colVersion: "Версия", colAmount: "Маблағ, сомонӣ", colResponsible: "Масъул",
      filterObjectAriaLabel: "Объект", filterStatusAriaLabel: "Ҳолат",
      statusAllLabel: "Ҳолат: Ҳама", allObjectsOption: "Ҳамаи объектҳо",
      statusDraft: "Лоиҳа", statusPendingReview: "Дар баррасӣ", statusApproved: "Тасдиқшуда",
      emptyTitle: "Сметаҳо ёфт нашуданд", paginationItemLabel: "смета",
      budgetChartTitle: "Буҷет ва хароҷоти воқеӣ",
      categorySpendTitle: "Хароҷот аз рӯи категорияҳо", categorySpendCenterLabel: "Ҳамаи хароҷот",
      summaryTitle: "Хулоса аз рӯи сметаи интихобшуда", summaryNumberLabel: "Сметаи №", summaryDateCreated: "Санаи эҷод", summaryDateUpdated: "Санаи навсозӣ",
      summaryTotalBudget: "Буҷети умумӣ",
      openEstimateButton: "Кушодани смета", downloadPdfButton: "Боргирии PDF",
      riskCardTitle: "Сметаҳое, ки таваҷҷуҳ талаб мекунанд", riskAllLink: "Ҳамаи сметаҳои хатарнок →",
      filterResponsiblePlaceholder: "Ному насаби прораб", filterMinAmount: "Маблағи ҳадди ақал", filterMaxAmount: "Маблағи ҳадди аксар",
      deleteConfirmTitle: "Смета нест карда шавад?", deleteConfirmDescription: (number) => `Сметаи «${number}» нест карда мешавад.`,
      toastCreated: "Смета эҷод карда шуд", toastDeleted: "Смета нест карда шуд", toastOpenUnavailable: "Кушодани саҳифаи муфассали смета дар демо ҳоло дастрас нест",
      toastRiskOpened: (title) => `Смета кушода шуд: ${title}`,
      addModalTitle: "Сметаи нав", addModalDescription: (number) => `Рақами смета ба таври худкор таъин мешавад: ${number}`,
      fieldVersion: "Версия", fieldAmount: "Маблағ, сомонӣ", fieldDate: "Сана",
      fieldResponsiblePlaceholder: "Ному насаби прораб",
      errorAmountPositive: "Маблағи зиёда аз сифрро нишон диҳед", errorDateRequired: "Санаи сметаро нишон диҳед", errorResponsibleRequired: "Масъулро нишон диҳед",
      categoryLabels: {
        "Строительные материалы": "Маводи сохтмонӣ", "Оплата труда": "Музди кор", "Техника и оборудование": "Техника ва таҷҳизот",
        "Транспорт и логистика": "Нақлиёт ва логистика", "Электромонтаж": "Корҳои барқӣ", "Прочие расходы": "Хароҷоти дигар",
      },
      riskDescriptionLabels: {
        "Превышение на 450 000 сомони": "Зиёдатӣ ба маблағи 450 000 сомонӣ",
        "Превышение на 120 000 сомони": "Зиёдатӣ ба маблағи 120 000 сомонӣ",
        "Не подтверждены затраты на 310 000 сомони": "Хароҷот ба маблағи 310 000 сомонӣ тасдиқ нашудааст",
        "Смета не утверждена": "Смета тасдиқ нашудааст",
      },
    },
    budgets: {
      pageTitle: "Буҷетҳо", pageSubtitle: "Банақшагирӣ, назорат ва таҳлили буҷетҳо аз рӯи объектҳо", searchPlaceholder: "Ҷустуҷӯи буҷетҳо, объектҳо...",
      tabAll: "Ҳама", tabActive: "Фаъол", tabCompleted: "Анҷомёфта", tabOverBudget: "Бо зиёдатӣ",
      kpiTotalBudget: "Буҷети умумӣ", kpiTotalBudgetFooter: "Аз рӯи ҳамаи объектҳои фаъол",
      kpiApprovedBudget: "Буҷетҳои тасдиқшуда", kpiApprovedFooter: (pct) => `${pct}% аз буҷети умумӣ`,
      kpiActualSpent: "Хароҷоти воқеӣ", kpiActualSpentFooter: (pct) => `${pct}% буҷет истифода шудааст`,
      kpiOverBudget: "Зиёдатии буҷет", kpiOverBudgetFooter: (n) => `${n} объект бо зиёдатӣ`,
      listTitle: "Буҷетҳо аз рӯи объектҳо", addBudget: "Илова кардани буҷет", paginationItemLabel: "буҷет",
      colSpent: "Сарф шуд", colRemaining: "Монда", colUsage: "Истифода", colOverspend: "Зиёдатӣ",
      actionViewBudget: "Дидани буҷет",
      emptyTitle: "Буҷетҳо ёфт нашуданд",
      chartTitle: "Динамикаи буҷет", distributionTitle: "Тақсимоти буҷет", centerLabel: "Ҳамаи буҷет",
      seriesTotalBudget: "Буҷети умумӣ", seriesRemaining: "Монда",
      operationsTitle: "Амалиётҳои охирини буҷет", opColAction: "Амал", allOperationsLink: "Ҳамаи амалиётҳо →",
      riskCardTitle: "Буҷетҳо бо зиёдатӣ", riskAllLink: "Ҳамаи буҷетҳои хатарнок →",
      summaryTitle: "Хулоса аз рӯи буҷети интихобшуда", summaryPeriodLabel: "Давраи буҷет", summaryUpdatedDate: "Навсозии охирин",
      editBudgetButton: "Таҳрири буҷет", exportPdfButton: "Содироти PDF",
      addModalTitle: "Илова кардани буҷет", addModalDescription: "Параметрҳои асосии буҷети объектро пур кунед",
      fieldPeriodStart: "Оғози давра", fieldPeriodEnd: "Хотимаи давра",
      statusPendingApproval: "Дар мувофиқа", statusOverBudget: "Зиёдатӣ",
      errorPeriodStartRequired: "Оғози давраро нишон диҳед", errorPeriodEndRequired: "Хотимаи давраро нишон диҳед", errorPeriodEndBeforeStart: "Хотима наметавонад пеш аз оғоз бошад",
      deleteConfirmTitle: "Буҷет нест карда шавад?", deleteConfirmDescription: (name) => `Буҷети объекти «${name}» нест карда мешавад.`,
      toastCreated: "Буҷет илова карда шуд", toastDeleted: "Буҷет нест карда шуд", toastEditUnavailable: "Таҳрир дар демо ҳоло дастрас нест",
      toastRiskOpened: (title) => `Буҷет кушода шуд: ${title}`,
      categoryLabels: {
        "Строительные работы": "Корҳои сохтмонӣ", "Материалы": "Маводҳо", "Оборудование": "Таҷҳизот",
        "Непредвиденные расходы": "Хароҷоти пешбининашуда", "Прочие расходы": "Хароҷоти дигар",
      },
      operationActionLabels: {
        "Добавлены расходы": "Хароҷот илова карда шуд", "Утверждён бюджет": "Буҷет тасдиқ карда шуд", "Обновлён бюджет": "Буҷет навсозӣ шуд", "Создан бюджет": "Буҷет эҷод карда шуд",
      },
      riskDescriptionLabels: {
        "Превышение на 45 000 сомони": "Зиёдатӣ ба маблағи 45 000 сомонӣ",
        "Превышение на 15 000 сомони": "Зиёдатӣ ба маблағи 15 000 сомонӣ",
        "Ожидает подтверждения расходов на 85 000 сомони": "Дар интизори тасдиқи хароҷот ба маблағи 85 000 сомонӣ",
        "Бюджет в черновике": "Буҷет дар шакли лоиҳа",
      },
    },
    users: {
      pageTitle: "Корбарон", pageSubtitle: "Идоракунии ҳисобҳо ва ҳуқуқҳои дастрасӣ", searchPlaceholder: "Ҷустуҷӯ аз рӯи корбарон...",
      kpiTotal: "Ҳамаи корбарон", kpiTotalSuffix: "ҳисоб",
      kpiActive: "Фаъол", kpiActiveSuffix: "корбар",
      kpiInactive: "Ғайрифаъол", kpiInactiveSuffix: "корбар",
      kpiAdmins: "Маъмурон", kpiAdminsSuffix: "корбар",
      kpiRoles: "Нақшҳо", kpiRolesSuffix: "нақш дар система",
      addUser: "Илова кардани корбар", export: "Содирот",
      tabAll: "Ҳамаи корбарон", tabActive: "Фаъол", tabInactive: "Ғайрифаъол",
      colSelectAll: "Интихоби ҳама", colUser: "Корбар", colRole: "Нақш", colPhone: "Телефон", colEmail: "Email", colStatus: "Ҳолат", colRegisteredAt: "Санаи бақайдгирӣ", colActions: "Амалҳо",
      selectUser: (name) => `Интихоб кардани ${name}`,
      statusActive: "Фаъол", statusInactive: "Ғайрифаъол", statusBlocked: "Манъшуда",
      actionView: "Дидан", actionEdit: "Таҳрир кардан", actionChangeStatus: "Тағйири ҳолат", actionChangeStatusDisabled: "Ҳолати ҳисоби худро тағйир додан мумкин нест",
      paginationItemLabel: "корбарон",
      filtersTitle: "Филтрҳо", filterSearch: "Ҷустуҷӯ", filterSearchPlaceholder: "Ном, email ё телефон...",
      filterRole: "Нақш", filterAllRoles: "Ҳамаи нақшҳо",
      filterStatus: "Ҳолат", filterAllStatuses: "Ҳамаи ҳолатҳо", filterActiveStatus: "Фаъол", filterInactiveStatus: "Ғайрифаъол", filterBlockedStatus: "Манъшуда",
      filterRegisteredDate: "Санаи бақайдгирӣ", filterApply: "Татбиқ кардан", filterReset: "Бозсозӣ",
      roleDistributionTitle: "Корбарон аз рӯи нақшҳо",
      modalAddTitle: "Илова кардани корбар", modalEditTitle: "Таҳрири корбар", modalViewTitle: "Профили корбар", modalAddDescription: "Ҳисоби нав созед",
      fieldFullName: "Ному насаб", fieldFullNamePlaceholder: "Ном ва насаб",
      fieldLogin: "Логин", fieldLoginPlaceholder: "username",
      fieldEmail: "Email", fieldEmailPlaceholder: "name@binosoz.tj",
      fieldPhone: "Телефон", fieldPhonePlaceholder: "+992 00 000 00 00",
      fieldRole: "Нақш", fieldStatus: "Ҳолат",
      buttonClose: "Пӯшидан", buttonCancel: "Бекор кардан", buttonAdd: "Илова кардан", buttonSave: "Нигоҳ доштан",
      errorRequiredFields: "Ном, логин ва email-ро пур кунед", errorPhoneFormat: "Формати телефон: +992 XX XXX XX XX", errorLoginTaken: "Ин логин аллакай аз ҷониби корбари дигар истифода мешавад",
      csvUser: "Корбар", csvRole: "Нақш", csvPhone: "Телефон", csvEmail: "Email", csvStatus: "Ҳолат",
    },
    dashboard: {
      pageTitle: "Хулосаи ширкат", pageSubtitle: "Назорати объектҳо, молия ва иҷрои корҳо",
      kpiTotalBudget: "Буҷети умумӣ", kpiSpent: (v) => `Сарф шуд: ${v}`,
      kpiActiveObjects: "Объектҳои фаъол", kpiInProgress: (n) => `${n} дар кор`, kpiCompletedObjects: (n) => `${n} анҷомёфта`,
      kpiPayrollDebt: "Қарзи маош", kpiNextPayment: (d) => `Пардохти оянда: ${d}`, kpiNotScheduled: "ба нақша гирифта нашудааст",
      kpiCompletedWorks: "Корҳои иҷрошуда", kpiOverallProgress: "Пешрафти умумӣ аз рӯи ҳамаи объектҳо",
      periodWeek: "Ҳафта", periodMonth: "Моҳ", periodQuarter: "Семоҳа", periodYear: "Сол",
      objectsStateTitle: "Ҳолати объектҳо", viewAllObjects: "Ҳамаи объектҳо →",
      colObject: "Объект", colForeman: "Прораб", colProgress: "Пешрафт", colBudget: "Буҷет", colStatus: "Ҳолат",
      attentionTitle: "Корҳое, ки таваҷҷуҳ талаб мекунанд", attentionOpen: "Кушодан", overdueBy: (n) => `${n} рӯз таъхир кард`, stockDepleted: "Мондаи анбор тамом шуд", stockLow: "Мондаи анбор поёнтар аз ҳадди ақал",
      budgetChartTitle: "Буҷет ва хароҷоти воқеӣ",
      budgetTotal: "Буҷети умумӣ", budgetSpent: "Хароҷоти воқеӣ", budgetRemaining: "Монда", budgetOver: "Зиёдатии буҷет",
      payrollApprovedTitle: "Маош тасдиқ шуд", payrollPeriod: (p) => `Давра: ${p}`, payrollToPay: (v) => `Барои пардохт ${v}`,
      payrollToApproveTitle: "Маош барои тасдиқ", payrollPeriodLabel: "Давра:", payrollEmployeeCount: "Шумораи корбарон:", payrollAccrued: "Ҳисоб шуд:", payrollDeductions: "Тарҳҳо:", payrollTotalToPay: "Ҳамагӣ барои пардохт:", payrollPreparedBy: (n) => `Омода кард: ${n}`,
      payrollReturned: "Барои ислоҳ ба бухгалтер баргардонида шуд",
      payrollApprove: "Тасдиқи маош", payrollReturnToAccountant: "Баргардонидан ба бухгалтер",
      payrollApproveConfirmTitle: "Маош тасдиқ карда шавад?", payrollApproveConfirmDescription: (p, v) => `Давра: ${p}. Ҳамагӣ барои пардохт: ${v}.`, payrollApproveConfirmLabel: "Тасдиқ кардан",
      payrollReturnModalTitle: "Баргардонидан ба бухгалтер", payrollReturnModalDescription: "Тавсиф кунед, ки пеш аз санҷиши такрорӣ чӣ бояд ислоҳ шавад.",
      payrollReturnCancel: "Бекор кардан", payrollReturnConfirm: "Баргардонидан",
      payrollCommentLabel: "Шарҳ", payrollCommentPlaceholder: "Масалан: тарҳҳои бригадаи №3-ро аз нав ҳисоб кунед",
      toastApproved: "Маош тасдиқ шуд", toastReturned: "Ҳисобот ба бухгалтер баргардонида шуд",
    },
    settings: {
      pageTitle: "Танзимот", pageSubtitle: "Идоракунии система ва параметрҳои ширкат",
      searchPlaceholder: "Ҷустуҷӯ аз рӯйи танзимот...", searchResults: "Натиҷаҳои ҷустуҷӯ", noResultsFound: "Танзимот ёфт нашуд",
      openAction: "Кушодан →", save: "Нигоҳ доштан", savedAt: "Нигоҳ дошта шуд дар", support: "Дастгирӣ", documentation: "Ҳуҷҷатнигорӣ",
      footerCopyright: "© 2026 BINOSOZ. Ҳамаи ҳуқуқҳо ҳифз шудаанд.",
      tabs: { general: "Умумӣ", company: "Ширкат", finance: "Молия", notifications: "Огоҳиномаҳо", security: "Бехатарӣ", integrations: "Интегратсияҳо", backups: "Нусхаҳои эҳтиётӣ" },
      general: {
        generalCardTitle: "Танзимоти умумӣ",
        language: "Забони интерфейс", languageDescription: "Забони системаро интихоб кунед",
        timezone: "Минтақаи вақт", timezoneDescription: "Минтақаи вақтро танзим кунед",
        dateFormat: "Формати сана", dateFormatDescription: "Формати намоиши санаро интихоб кунед",
        timeFormat: "Формати вақт", timeFormatDescription: "Формати вақтро интихоб кунед",
        currency: "Асъори пешфарз", currencyDescription: "Асъори асосии система",
        measurement: "Воҳидҳои ченак", measurementDescription: "Системаи воҳидҳои ченак",
        displayCardTitle: "Танзимоти намоиш",
        theme: "Мавзӯи интерфейс", themeDescription: "Мавзӯи намоишро интихоб кунед",
        themeLight: "Равшан", themeDark: "Торик", themeSystem: "Системавӣ",
        accent: "Ранги асосӣ", accentDescription: "Мавзӯи рангии система",
        density: "Зичии интерфейс", densityDescription: "Андозаи унсурҳо ва фосилаҳо",
        densityCompact: "Фишурда", densityComfortable: "Мувофиқ", densitySpacious: "Васеъ",
        sidebarMode: "Намоиши менюи паҳлуӣ", sidebarModeDescription: "Реҷаи намоиши меню",
        sidebarCollapsed: "Фишурда", sidebarExpanded: "Кушода",
        animations: "Анимацияи интерфейс", animationsDescription: "Фаъол кардани анимацияҳои нарм",
        workCardTitle: "Танзимоти кор",
        automaticBackup: "Нусхабардории худкор", automaticBackupDescription: "Сохтани нусхаи эҳтиётии пойгоҳи додаҳо",
        confirmDelete: "Тасдиқи нест кардан", confirmDeleteDescription: "Ҳангоми нест кардан тасдиқ талаб карда шавад",
        activityLog: "Ҷурнали амалҳо", activityLogDescription: "Пайгирии ҳамаи амалҳо дар система",
        autoCloseTasks: "Хотимаи худкори вазифаҳо", autoCloseTasksDescription: "Хотима додани худкори вазифаҳои мӯҳлаташон гузашта",
        stockCheck: "Санҷиши мондаҳои анбор", stockCheckDescription: "Назорати мондаҳои ҳадди ақали маводҳо",
        documentsCardTitle: "Танзимоти ҳуҷҷатҳо",
        documentNumbering: "Рақамгузории ҳуҷҷатҳо", documentNumberingDescription: "Рақамгузории худкори ҳуҷҷатҳо",
        documentPrefix: "Пешванди ҳуҷҷатҳо", documentPrefixDescription: "Пешванд барои рақамҳои ҳуҷҷат",
        printForms: "Формаҳои чопӣ", printFormsDescription: "Истифодаи қолабҳои фирмавӣ",
        documentSignature: "Имзо дар ҳуҷҷатҳо", documentSignatureDescription: "Имзои худкор дар ҳуҷҷатҳо",
        watermark: "Нишони обӣ", watermarkDescription: "Илова кардани нишони обӣ ба ҳуҷҷатҳо",
        notImplemented: "Қисми сервериро талаб мекунад — ҳоло дастнорас",
      },
      company: {
        cardTitle: "Маълумоти ширкат", companyName: "Номи ширкат", companyPhone: "Телефон", companyEmail: "Email",
        companyAddress: "Суроға", taxId: "РМА",
        infoTitle: "Профили ширкат", infoText: "Ин маълумот дар формаҳои чопӣ, ҳисоботҳо ва ҳуҷҷатҳои содиршуда истифода мешавад.",
      },
      finance: {
        cardTitle: "Параметрҳои молиявӣ", currency: "Асъори асосӣ", vatRate: "Меъёри ААИ, %", fiscalYear: "Соли молиявӣ",
        fiscalYearCalendar: "Соли тақвимӣ", fiscalYearApril: "Апрел — март",
        infoTitle: "Форматҳои ҳисобот", infoText: "Параметрҳои молиявӣ ба сметаҳо, буҷетҳо, маош ва ҳисоботҳои нав татбиқ мешаванд.",
      },
      notifications: {
        cardTitle: "Каналҳои огоҳинома", email: "Огоҳиномаҳои Email", browser: "Огоҳиномаҳои браузер",
        deadlines: "Мӯҳлатҳо ва таъхирҳо", stock: "Мондаҳои интиқодӣ",
        infoTitle: "Маркази огоҳиномаҳо", infoText: "Рӯйдодҳои интихобшуда дар занг намоиш дода шуда, тавассути каналҳои иҷозатдодашуда фиристода мешаванд.",
      },
      security: {
        cardTitle: "Бехатарии дастрасӣ", sessionMinutes: "Муддати сессия", twoFactor: "Тасдиқи дуфактора",
        passwordExpiry: "Муҳлати амали рамз", loginAlerts: "Огоҳинома дар бораи воридшавӣ",
        infoTitle: "Сиёсати рамзҳо", infoText: "Рамзҳо дар танзимот нигоҳ дошта намешаванд. Дар production санҷиш аз ҷониби сервери аутентификатсия иҷро мешавад.",
      },
      integrations: {
        cardTitle: "API ва интегратсияҳо", apiEnabled: "Дастрасӣ ба API", apiUrl: "API URL", webhookUrl: "Webhook URL",
        oneC: "Интегратсия бо 1С", telegram: "Огоҳиномаҳои Telegram",
        infoTitle: "Ҳолати интегратсияҳо", infoText: "Интегратсияҳо танҳо пас аз нишон додани суроғаҳо ва калидҳои сервери воқеӣ фаъол мешаванд.",
      },
      backups: {
        cardTitle: "Нусхабардории эҳтиётӣ", automaticCopies: "Нусхаҳои худкор", frequency: "Даврия",
        frequencyDaily: "Ҳаррӯза", frequencyWeekly: "Ҳарҳафтагӣ", frequencyMonthly: "Ҳармоҳа",
        createBackup: "Сохтани нусха", restoreBackup: "Барқарор кардан",
        infoTitle: "Нусхаи маҳаллӣ", infoText: "Нусха танҳо маълумоти замимаро аз localStorage дар бар мегирад. Рамзҳо ва калидҳои махфӣ дохил намешаванд.",
      },
      systemInfo: {
        title: "Маълумот дар бораи система", version: "Версияи система", build: "Сборка", license: "Литсензия", licenseActive: "Фаъол",
        licenseType: "Навъи литсензия", licenseTypeValue: "Касбӣ", validUntil: "Эътибор то", usersLabel: "Корбарон",
        storageLabel: "Ҷои захира", storageOf: "аз",
      },
      systemActivity: {
        title: "Фаъолияти система", viewLog: "Дидани ҷурнал",
        login: "Воридшавӣ ба система", documentCreated: "Ҳуҷҷат сохта шуд", dataChanged: "Маълумот тағйир ёфт",
        userDeleted: "Корбар нест карда шуд", backupCreated: "Нусхабардории эҳтиётӣ",
      },
    },
  },
  en: {
    sidebar: {
      dashboard: "Overview", objects: "Objects", estimatesAndBudgets: "Estimates & Budgets", estimates: "Estimates", budgets: "Budgets",
      works: "Works", brigades: "Crews", brigadesList: "Crew list", brigadesComposition: "Crew composition",
      assignments: "Assignments", myBrigade: "My crew", assignedWorks: "Work assignment", employees: "Employees",
      attendance: "Attendance", warehouse: "Warehouse & Materials", materials: "Materials", receipts: "Receipts",
      writeOffs: "Write-offs", transfers: "Transfers", stock: "Stock", payroll: "Payroll", reports: "Reports",
      users: "Users", settings: "Settings", closeMenu: "Close menu", logout: "Log out",
    },
    header: {
      openMenu: "Open menu", searchPlaceholder: "Search...", notifications: "Notifications", profile: "Profile", settings: "Settings", logout: "Log out",
      demoNotificationOverdue: "Foundation pour is overdue", demoNotificationPayroll: "July payroll is ready for approval",
      criticalMaterialsNotification: (count) => `${count} material${count === 1 ? "" : "s"} at critical stock level`,
      justNow: "Just now",
      minutesAgo: (n) => `${n} minute${n === 1 ? "" : "s"} ago`,
      hoursAgo: (n) => `${n} hour${n === 1 ? "" : "s"} ago`,
    },
    common: {
      statusInProgress: "In progress", statusAtRisk: "At risk", statusAlmostDone: "Almost done", statusCompleted: "Completed",
      open: "Open",
      paginationShown: (from, to, total, itemLabel) => `Showing ${from}–${to} of ${total} ${itemLabel}`,
      showPerPage: "Show per page:", prevPage: "Previous page", nextPage: "Next page",
      confirmLabel: "Confirm", cancelLabel: "Cancel",
      selectPlaceholder: "Select...", selectEmpty: "Nothing found", selectSearch: "Search...", selectClear: "Clear",
      placeholderTitle: "Section under construction",
      placeholderNote: "This section will be available soon. We're working on bringing the same data and interactivity here as on the Overview and Objects pages.",
      roleLabels: { owner: "Owner", administrator: "Administrator", accountant: "Accountant", prorab: "Foreman", brigadir: "Crew lead", worker: "Worker", storekeeper: "Storekeeper" },
      profileTitle: "Profile", profileRole: "Role", profilePhone: "Phone", profileEmail: "Email", profileRegisteredAt: "Registered",
      save: "Save", delete: "Delete", edit: "Edit", view: "View",
      tableActions: "Actions", editUnavailableInDemo: "Editing isn't available in this demo yet",
      emptyStateHint: "Change your search terms or reset the filters", resetFiltersButton: "Reset filters",
      filtersButton: "Filters", resetButton: "Reset", applyButton: "Apply",
      colObject: "Object", colStatus: "Status", colDate: "Date", colAmountSomoni: "Amount, somoni",
      periodWeek: "Week", periodMonth: "Month", periodQuarter: "Quarter", periodYear: "Year",
      seriesPlanned: "Planned", seriesSpent: "Spent",
      responsibleLabel: "Responsible", spentLabel: "Spent", remainingBudgetLabel: "Remaining budget", budgetUsageLabel: "Budget usage",
      totalBudgetLabel: "Total budget", totalBudgetSomoniLabel: "Total budget, somoni", dateCreatedLabel: "Date created",
      errorBudgetPositive: "Enter a budget greater than zero",
      statusDraft: "Draft",
      riskBadgeLabels: { "Превышение": "Over budget", "Ожидает проверки": "Pending review", "Черновик": "Draft" },
      colBrigade: "Crew", colPhone: "Phone",
      duplicateLabel: "Duplicate", completeLabel: "Complete", progressLabel: "Progress", commentLabel: "Comment",
      exportButton: "Export", descriptionLabel: "Description",
      upcomingAssignmentsTitle: "Upcoming assignments", allAssignmentsLink: "All assignments →",
    },
    works: {
      pageTitle: "Works", pageSubtitle: "Plan, track, and monitor work progress", searchPlaceholder: "Search works...", addWork: "Add work",
      tabAll: "All works", tabInProgress: "In progress", tabCompleted: "Completed", tabOverdue: "Overdue",
      kpiTotal: "Total works", kpiTotalFooter: "Including subtasks", kpiCompleted: "Completed", kpiInProgress: "In progress", kpiOverdue: "Overdue",
      kpiPercentOfTotal: (n) => `${n}% of total volume`,
      filterObjectAriaLabel: "Object", allObjectsOption: "All objects",
      filterSectionAriaLabel: "Section", allSectionsOption: "All sections",
      filterStatusAriaLabel: "Status", statusAllLabel: "Status: All",
      statusCompleted: "Completed", statusInProgress: "In progress", statusOverdue: "Overdue", statusPlanned: "Planned",
      statusOnReview: "Under review", statusPaused: "Paused", statusCancelled: "Cancelled",
      selectedCount: (n) => `Selected: ${n} works`,
      colWork: "Work", colObjectSection: "Object / Section", colResponsible: "Responsible", colPlanFact: "Planned / Actual", colStatusProgress: "Status / Progress",
      selectAllAriaLabel: "Select all works on the page", selectRowAriaLabel: (title) => `Select work ${title}`,
      daysShort: "d.",
      emptyTitle: "No works found", paginationItemLabel: "works",
      dynamicsTitle: "Work progress dynamics", bySectionsTitle: "Works by section", colSection: "Section", colWorksCount: "Works",
      summaryTitle: "Works summary", donutSuffix: "works",
      periodLabel: "Period", filterResponsibleAriaLabel: "Responsible", allResponsibleOption: "All responsible", allBrigadesOption: "All crews",
      criticalTitle: "Critical works", criticalNone: "No critical works", overdueDaysLabel: (n) => `${n} day${n === 1 ? "" : "s"}`, allCriticalLink: "All critical works →",
      exportPdf: "Export PDF", exportExcel: "Export Excel", printReport: "Print report",
      exportingPdf: "Exporting to PDF", exportingExcel: "Exporting to Excel", preparingPrint: "Preparing report for print", exportDone: (label) => `${label}: done`,
      formAddTitle: "Add work", formEditTitle: "Edit work", formDescription: "Fill in the work's parameters, deadlines, and responsible parties",
      fieldTitle: "Work name", fieldTitlePlaceholder: "E.g., Foundation installation",
      fieldCode: "Work code", fieldCodePlaceholder: "1.1",
      fieldPriority: "Priority", fieldSection: "Section", fieldDescriptionPlaceholder: "Brief description of the work's content",
      fieldPlannedStart: "Planned start date", fieldPlannedEnd: "Planned end date", fieldPlannedDuration: "Planned duration",
      durationDaysValue: (n) => `${n} days`, noValue: "—",
      fieldInitialProgress: "Initial progress, %", fieldBudget: "Work budget, somoni",
      fieldParentWork: "Parent work", noneOption: "None",
      fieldDependencies: "Dependencies", noDependenciesAvailable: "No available works",
      fieldAttachments: "Attachments", attachButton: "Attach files", removeAttachmentAriaLabel: (name) => `Remove ${name}`,
      saveChanges: "Save changes", createWork: "Create work",
      errorTitleRequired: "Enter the work's name", errorCodeRequired: "Enter the work code", errorCodeTaken: "This code is already in use",
      errorPlannedStartRequired: "Enter a start date", errorPlannedEndRequired: "Enter an end date", errorPlannedEndBeforeStart: "The end can't be earlier than the start",
      errorProgressRange: "Progress from 0 to 100", errorBudgetPositive: "Budget must be greater than zero",
      priorityLow: "Low", priorityMedium: "Medium", priorityHigh: "High", priorityCritical: "Critical",
      sectionPrep: "Preparation works", sectionFoundation: "Foundations", sectionStructure: "Assembly works",
      sectionFinishing: "Finishing works", sectionEngineering: "Utility networks", sectionOther: "Other works",
      actionProgress: "Update progress", actionAssignResponsible: "Assign responsible", actionAssignBrigade: "Assign crew", actionPause: "Pause",
      progressModalTitle: "Update progress", progressPercentLabel: "Progress, %",
      commentUpdateLabel: "Update comment", commentPlaceholderExample: "E.g., poured 40 m³ of concrete",
      detailsDefaultTitle: "Work", updateProgressButton: "Update progress", completeWorkButton: "Complete work",
      changeStatusLabel: "Change status", plannedTermsLabel: "Planned dates", actualTermsLabel: "Actual dates", notStartedLabel: "Not started",
      actualDurationLabel: "Actual duration", budgetLabel: "Work budget", priorityLabel: "Priority", progressExecutionLabel: "Completion progress",
      dependenciesLabel: "Dependencies", noAttachments: "No attachments", progressHistoryLabel: "Progress history",
      commentsLabel: "Comments", noCommentsYet: "No comments yet", addCommentPlaceholder: "Add a comment...", addButton: "Add",
      historyNoteCompleted: "Work completed", historyNoteProgressUpdated: "Progress update", historyNoteCreated: "Work created", historyNoteDuplicated: "Work duplicated",
      toastCompleted: "Work completed", toastPaused: "Work paused", toastStatusUpdated: "Status updated", toastProgressUpdated: "Progress updated",
      toastDuplicated: "Work duplicated", toastUpdated: "Work updated", toastCreated: "Work added", toastDeleted: "Work deleted",
      toastBulkCompleted: (n) => `Works completed: ${n}`, toastBulkDeleted: (n) => `Works deleted: ${n}`,
      deleteConfirmTitle: "Delete work?", deleteConfirmDescription: (title, code) => `Work "${title}" (${code}) will be deleted.`,
      copyTitle: (title) => `${title} (copy)`,
    },
    brigades: {
      pageTitle: "Crews", pageSubtitle: "Manage crews and their composition", searchPlaceholder: "Search crews, foremen...", createBrigade: "Create crew",
      kpiTotalBrigades: "Total crews", kpiActiveBrigadesFooter: (n) => `Active: ${n}`,
      kpiTotalMembers: "Employees in crews", kpiWorkersFooter: (n) => `Of which workers: ${n}`,
      kpiAssignedWorks: "Assigned to works", kpiObjectsFooter: "Objects",
      kpiAverageEfficiency: "Average efficiency", kpiCurrentPeriodFooter: "For the current period",
      listTitle: "Crew list", emptyTitle: "No crews found", paginationItemLabel: "crews",
      distributionBySpecialtyTitle: "Distribution by specialty", peopleUnitLabel: "people",
      activityTitle: "Crew activity", distributionByRoleTitle: "Distribution by role",
      statusActive: "Active", statusPaused: "Paused", statusInactive: "Inactive", statusForming: "Forming", statusOverloaded: "Overloaded",
      employeeStatusOnShift: "On shift", employeeStatusOnSite: "On site", employeeStatusAvailable: "Available", employeeStatusOnTrip: "On assignment",
      employeeStatusAbsent: "Absent", employeeStatusOnLeave: "On leave", employeeStatusSickLeave: "On sick leave",
      shiftDay: "Day", shiftEvening: "Evening", shiftNight: "Night", shiftDayOff: "Day off",
      colComposition: "Composition", membersCountLabel: (n) => `${n} people`, workersHelpersLabel: (workers, helpers) => `Workers: ${workers}, Helpers: ${helpers}`,
      colObjectWorks: "Object / Works", remainingDaysLabel: (n) => `${n} day${n === 1 ? "" : "s"} left`,
      actionChangeComposition: "Change composition", actionAssignWork: "Assign to work", actionChangeForeman: "Change foreman", actionActivate: "Activate", actionPauseBrigade: "Pause",
      toastCreatedDraft: "Crew saved as draft", toastCreated: "Crew created", toastPaused: "Crew paused", toastActivated: "Crew activated", toastDuplicated: "Crew duplicated", toastDeleted: "Crew deleted",
      deleteConfirmTitle: "Delete crew?", deleteConfirmDescription: (name) => `"${name}" will be removed from the crew list.`,
      createModalTitle: "Create crew", createModalDescription: "Fill in the crew's parameters and build its composition", saveDraftButton: "Save as draft", defaultNamePrefix: (n) => `Crew #${n}`,
      fieldName: "Crew name", fieldSpecialization: "Specialization", fieldSpecializationPlaceholder: "E.g., Monolithic works",
      fieldForemanName: "Foreman", fieldForemanNamePlaceholder: "Foreman's full name",
      fieldDescriptionPlaceholderBrigade: "Brief description of the crew",
      fieldCurrentWork: "Current work", fieldCurrentWorkPlaceholder: "E.g., Excavation",
      fieldTargetEfficiency: "Target efficiency, %", fieldCreatedDate: "Created date",
      errorNameRequired: "Enter the crew's name", errorSpecializationRequired: "Enter a specialization", errorForemanRequired: "Enter a foreman",
      errorMembersRequired: "Add at least one member", errorForemanIsMember: "The foreman can't also be a regular member",
      errorPlannedEndBeforeStartBrigade: "The end can't be earlier than the start", errorEfficiencyRange: "Efficiency from 0 to 100",
      notDefined: "Not defined", notAssigned: "Not assigned",
      teamBuilderTitle: "Crew composition", searchEmployeePlaceholder: "Search employee...", allSpecialtiesOption: "All specialties", nobodyFound: "Nobody found",
      selectedCountLabel: (n) => `Selected: ${n}`, addMembersHint: "Add members from the left", removeMemberAriaLabel: (name) => `Remove ${name}`,
      detailsDefaultTitle: "Crew",
      compositionLabel: (count, workers, helpers) => `${count} people (${workers} workers / ${helpers} helpers)`,
      remainingDaysPlain: (n) => `${n} day${n === 1 ? "" : "s"} left`,
      efficiencyLabel: "Efficiency", hoursWorkedLabel: (n) => `${n} h.`, hoursWorkedTitle: "Hours worked",
      attendanceTitle: "Attendance", payrollFundTitle: "Payroll fund (30 days)", compositionCountTitle: (n) => `Crew composition (${n})`,
      foremanTag: "(foreman)", brigadirTag: "(crew lead)", documentsTitle: "Documents", noDocuments: "No attached documents",
      compositionPageTitle: "Crew composition", compositionPageSubtitle: "Manage crew members, roles, and distribution across objects", compositionSearchPlaceholder: "Search employees...",
      kpiTotalInBrigades: "Total employees in crews", kpiActiveOnShift: "Active on shift", kpiActiveOnShiftFooter: (pct) => `${pct}% of total composition`,
      kpiFreeSpecialists: "Available specialists", kpiReadyToAssign: "Ready for assignment", kpiAverageCompleteness: "Average staffing", kpiAllBrigadesFooter: "Across all crews",
      addEmployeeButton: "Add employee", compositionEmptyTitle: "No employees found", compositionPaginationItemLabel: "employees",
      upcomingChangesTitle: "Upcoming composition changes", allChangesLink: "All composition changes →",
      changeTypeTransfer: "Transfer", changeTypeAssignment: "Assignment", changeTypeReplacement: "Replacement",
      completenessTitle: "Crew staffing", completenessExcellent: "Excellent staffing", completenessGood: "Good staffing",
      completenessAverage: "Average staffing", completenessLow: "Low staffing",
      colEmployee: "Employee", gradeSuffix: (n) => `Grade ${n}`, colBrigadeRole: "Crew / Role", colObjectShift: "Object / Shift",
      roleFilterAriaLabel: "Role", roleAllLabel: "Role: All",
      actionTransfer: "Transfer", actionChangeRole: "Change role", actionChangeShift: "Change shift", actionChangeStatus: "Change status", actionRemoveFromBrigade: "Remove from crew",
      toastEmployeeAdded: "Employee added", toastShiftUpdated: "Shift updated", toastStatusUpdated: "Status updated", toastEmployeeTransferred: "Employee transferred", toastEmployeeRemoved: "Employee removed from crew",
      removeConfirmTitle: "Remove employee from crew?", removeConfirmDescription: (name, brigade) => `"${name}" will be removed from "${brigade}" and moved to available specialists.`,
      transferModalTitle: "Transfer employee", transferModalDescription: "Move the employee to another crew", confirmTransferButton: "Confirm transfer",
      currentBrigadeLabel: "Current crew", newBrigadeLabel: "New crew", newRoleLabel: "New role",
      roleWorker: "Worker", roleHelper: "Helper", roleBrigadir: "Crew lead", roleForeman: "Foreman",
      transferDateLabel: "Transfer date", reasonLabel: "Reason", reasonPlaceholder: "E.g., staff shortage",
      replaceEmployeeLabel: "Replace another employee", doNotReplaceOption: "Don't replace",
      warningOverCapacity: "The target crew is staffed at its full capacity.",
      warningActiveWork: "The employee has an active assignment — the transfer will end their participation in it.",
      errorNewBrigadeDifferent: "The new crew must be different from the current one", errorTransferDateRequired: "Enter the transfer date",
      toastChangeCompositionUnavailable: "Changing composition isn't available in this demo yet", toastAssignWorkUnavailable: "Assigning to work isn't available in this demo yet", toastChangeForemanUnavailable: "Changing the foreman isn't available in this demo yet",
      toastFullAssignmentsListUnavailable: "The full assignments list isn't available in this demo yet", toastFullChangesListUnavailable: "The full changes list isn't available in this demo yet",
      addEmployeeModalTitle: "Add employee", addEmployeeModalDescription: "Fill in the employee's details and assign them to a crew",
      photoLabel: "Employee photo", replacePhotoButton: "Replace", uploadPhotoButton: "Upload photo", removePhotoButton: "Remove", photoPreviewAlt: "Photo preview",
      errorPhotoType: "Select an image file (JPG, PNG)", errorPhotoSize: "File size must not exceed 5 MB",
      fieldFirstName: "First name", fieldLastName: "Last name",
      fieldSpecialty: "Specialty", fieldSpecialtyPlaceholder: "E.g., Concrete worker",
      fieldGrade: "Qualification grade", fieldMemberRole: "Role in crew", fieldShift: "Shift", fieldAssignedDate: "Assignment date",
      errorFirstNameRequired: "Enter a first name", errorLastNameRequired: "Enter a last name", errorPhoneFormat: "Format: +992 XX XXX XX XX", errorPhoneTaken: "This number is already in use",
      errorSpecialtyRequired: "Enter a specialty", errorBrigadeRequired: "Select a crew", errorGradeRange: "Grade from 1 to 6",
      detailsEmployeeDefaultTitle: "Employee", brigadeAndObjectTitle: "Crew and object",
      performanceLabel: "Performance score", accruedTitle: "Accrued (30 days)", qualificationLabel: "Qualification", noBrigadeAssigned: "Not assigned",
      weekdayMon: "Mon", weekdayTue: "Tue", weekdayWed: "Wed", weekdayThu: "Thu", weekdayFri: "Fri", weekdaySat: "Sat", weekdaySun: "Sun",
      calendarTitle: "Assignment calendar", prevMonthAriaLabel: "Previous month", nextMonthAriaLabel: "Next month", clearDateSelection: "Clear date selection ×",
      monthJan: "January", monthFeb: "February", monthMar: "March", monthApr: "April", monthMay: "May", monthJun: "June",
      monthJul: "July", monthAug: "August", monthSep: "September", monthOct: "October", monthNov: "November", monthDec: "December",
      assignmentStatusActive: "In progress", assignmentStatusCompleted: "Completed", assignmentStatusCancelled: "Cancelled", assignmentStatusOverdue: "Overdue",
    },
    employees: {
      pageTitle: "Employees", pageSubtitle: "Manage company employees", searchPlaceholder: "Search by name, position, phone...", searchPlaceholderShort: "Search by name, position...",
      statusAll: "All", statusActive: "Active", statusVacation: "On vacation", statusDismissed: "Dismissed",
      kpiTotal: "Total employees", kpiActiveFooterPrefix: "Active:",
      kpiWorkers: "Workers", kpiEngineers: "Engineers & technical staff", kpiAdmins: "Administration", kpiPercentOfTotal: (n) => `${n}% of total`,
      filterPositionAriaLabel: "Position", allPositionsOption: "Position: All", allBrigadesOption: "Crew: All", allStatusesOption: "Status: All",
      resetFiltersAriaLabel: "Reset filters",
      colEmployee: "Employee", idPrefixLabel: (id) => `ID: ${id}`,
      colPosition: "Position", colUnit: "Crew / Department", colHireDate: "Hire date",
      selectAllRowsAriaLabel: "Select all rows", selectRowAriaLabel: (name) => `Select ${name}`,
      viewEmployeeAriaLabel: "View employee", editEmployeeAriaLabel: "Edit employee",
      emptyTitle: "No employees found", paginationItemLabel: "employees", addEmployeeButton: "Add employee",
      csvId: "ID", csvFullName: "Full name", csvUnit: "Crew/Department", csvHireDate: "Hire date", csvPosition: "Position", csvPhone: "Phone", csvStatus: "Status",
      toastUpdated: "Employee data updated", toastCreated: "Employee added", toastTransferred: (name) => `${name} transferred to a new department`, toastDeleted: "Employee deleted", toastExported: "Employee list exported",
      deleteConfirmTitle: "Delete employee?", deleteConfirmDescription: (name) => `"${name}" will be removed from the employee list.`,
      contactInfoTitle: "Contact information", genderMale: "Male", workInfoTitle: "Work information", ageYearsLabel: (age) => `${age} year${age === 1 ? "" : "s"} old`,
      tenureYearsMonths: (years, months) => `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`,
      tenureYearsOnly: (years) => `${years} year${years === 1 ? "" : "s"}`,
      tenureMonthsOnly: (months) => `${months} month${months === 1 ? "" : "s"}`,
      fieldEmploymentType: "Employment type", fieldTenure: "Tenure", fieldSalary: "Salary",
      documentsTitle: "Documents", fieldPassport: "Passport", fieldInn: "Tax ID",
      laborContractLabel: "Employment contract", downloadButton: "Download", contractDownloadedToast: (name) => `${name}'s contract downloaded`,
      filterCategoryTitle: "Staff category", categoryWorkers: "Workers", categoryEngineers: "Engineers & technical staff", categoryAdmin: "Administration",
      hireDateFromLabel: "Hire date from", hireDateToLabel: "Hire date to",
      transferModalTitle: "Transfer employee", transferModalDescription: (name, unit) => `${name} — current department: ${unit}`, transferButton: "Transfer",
      unitTypeLabel: "Department type", unitTypeBrigade: "Crew", unitTypeDepartment: "Department", newDepartmentLabel: "New department",
      formAddTitle: "Add employee", formEditTitle: "Edit employee", formDescription: "Fill in the employee's main details",
      fieldFullName: "Full name", fieldFullNamePlaceholder: "E.g., Mirzoev Shakhrom",
      fieldPositionInput: "Position", fieldPositionPlaceholder: "E.g., Foreman",
      fieldCategory: "Category", categoryWorker: "Worker", categoryEngineer: "Engineer / technical staff", categoryAdminOpt: "Administration",
      fieldDepartment: "Department", fieldPhonePlaceholder: "+992 90 000 00 00",
      fieldEmail: "Email", fieldEmailPlaceholder: "name@example.com", fieldBirthDate: "Date of birth",
      fieldAddress: "Address", fieldAddressPlaceholder: "Dushanbe, Rudaki St. 123", fieldSalaryForm: "Salary, somoni",
      errorFullNameRequired: "Enter the full name", errorPositionRequired: "Enter a position", errorPhoneRequired: "Enter a phone number",
      errorHireDateRequired: "Enter a hire date", errorEmailRequired: "Enter an email", errorBirthDateRequired: "Enter a date of birth", errorSalaryPositive: "Enter a salary greater than zero",
    },
    assignments: {
      pageTitle: "Assignments", pageSubtitle: "Assign crews and foremen to objects and works", searchPlaceholder: "Search assignments...", createAssignment: "Create assignment",
      kpiTotal: "Total assignments", kpiTotalFooter: "For the selected period", kpiActive: "Active assignments", kpiCompleted: "Completed", kpiCancelledOrOverdue: "Cancelled / overdue",
      kpiPercentOfTotal: (n) => `${n}% of all assignments`,
      listTitle: "Assignments list",
      statusAllLabel: "Status: All", objectAllLabel: "Object: All", brigadeAllLabel: "Crew: All", foremanAllLabel: "Foreman: All", allForemenOption: "All foremen",
      emptyTitle: "No assignments found", paginationItemLabel: "assignments",
      colNumber: "No.", colObjectWork: "Object / Work", colBrigadeForeman: "Crew / Foreman", colAmountShort: "Amount",
      actionView: "View", actionCancel: "Cancel",
      toastCompleted: "Assignment completed", toastCancelled: "Assignment cancelled", toastUpdated: "Assignment updated", toastCreated: "Assignment created", toastDeleted: "Assignment deleted",
      deleteConfirmTitle: "Delete assignment?", deleteConfirmDescription: (number, objectName) => `Assignment #${number} (${objectName}) will be deleted.`,
      defaultTitle: "Assignment", numberTitle: (n) => `Assignment #${n}`, periodWorksLabel: "Work period", amountLabel: "Amount",
      completeButton: "Complete assignment", cancelButton: "Cancel assignment",
      editModalTitle: "Edit assignment", formDescription: "Assign a crew and foreman to an object and work",
      fieldWorkTitle: "Work", fieldPeriodStart: "Period start", fieldPeriodEnd: "Period end", fieldAmountSomoni: "Amount, somoni", fieldProgressPercent: "Progress, %",
      errorAmountPositive: "Enter an amount greater than zero", errorPeriodStartRequired: "Enter the period start", errorPeriodEndRequired: "Enter the period end",
      noUpcomingAssignments: "No upcoming assignments",
    },
    brigadirDashboard: {
      pageTitle: "Foreman dashboard", pageSubtitle: "Crew, attendance, and work progress overview",
      brigadeNotFoundTitle: "Crew not found", brigadeNotFoundDescription: "Your account isn't linked to any crew. Contact an administrator.",
      crewCompositionLabel: "Crew composition", crewCountValue: (n) => `${n} people`, crewNote: (onSite, absent) => `${onSite} on site · ${absent} absent`,
      assignedWorksLabel: "Assigned works", assignedWorksNote: (inProgress, overdue) => `${inProgress} in progress · ${overdue} overdue`,
      attendanceLabel: "Attendance", attendanceNote: (n) => `${n} records for the period`, noDataLabel: "No data",
      efficiencyLabel: "Crew efficiency", statusNote: (label) => `Status: ${label}`,
      myCrewTitle: "My crew", allCrewLink: "All crew →", colSpecialty: "Specialty", noCrewYet: "No employees in the crew yet",
      crewWorksTitle: "Crew works", allWorksLink: "All works →", noActiveWorks: "The crew has no active works",
      worksSummaryTitle: "Crew works summary",
      criticalMaterialsTitle: "Critical materials", noCriticalMaterials: "No critical materials", goToMaterialsButton: "Go to materials",
      briefSummaryTitle: "Brief summary", summaryRemainingDaysLabel: "Days remaining", callForemanButton: "Call foreman",
    },
    brigadirWorks: {
      pageTitle: "My works", pageSubtitle: "Works assigned to your crew",
      tabAllShort: "All",
      kpiTotalAssigned: "Total assigned", kpiPercentOfAssigned: (n) => `${n}% of assigned`,
      emptyDescription: "No works assigned for this tab",
      thisWeekTitle: "This week", noWeekWorks: "No works planned for this week",
    },
    brigadirTeam: {
      pageSubtitle: "Crew composition, roles, attendance, and performance",
      kpiTotalEmployees: "Total employees", kpiOnSiteNow: "On site now", onSiteFooter: "On shift / on site",
      kpiAbsentEmployees: "Absent", absentFooter: "Vacation / sick leave / no-show",
      crewCompositionTitle: (n) => `Crew composition (${n})`, fullEmployeeListLink: "Full employee list →",
      specialtiesInCrewTitle: "Specialties in the crew",
      upcomingWorksTitle: "Crew's upcoming works",
      attendancePeriodTitle: "Attendance for the period", presentLabel: "Present", lateLabel: "Late", absentLabel: "Absent",
      noAttendanceRecords: "No attendance records for the period", openAttendanceButton: "Open attendance",
      briefInfoTitle: "Brief info", brigadirLabel: "Crew lead:", foremanLabel: "Foreman:", objectLabel: "Object:", brigadeStatusLabel: "Crew status:",
      callForemanWithPhone: (phone) => `Call foreman (${phone})`,
    },
    brigadirMaterials: {
      pageTitle: "Materials", pageSubtitle: "Warehouse stock, requests, and material movement",
      kpiTotalMaterials: "Total materials", kpiTotalMaterialsFooter: "items",
      kpiTotalStock: "Total stock", kpiTotalStockFooter: "units",
      kpiInTransit: "In transit", kpiInTransitFooter: "items",
      kpiLowStock: "Low stock", kpiLowStockFooter: "items",
      kpiRequestsPeriod: "Requests this period", kpiRequestsPeriodFooter: "total requests",
      tabStock: "Warehouse stock", tabRequests: "Material requests", tabTransit: "In transit", tabHistory: "Movement history", tabCategories: "Categories",
      searchMaterialPlaceholder: "Search material...", searchRequestPlaceholder: "Search request...",
      allCategoriesOption: "All categories", filterButton: "Filter", exportButton: "Export", exportedToast: "Materials exported",
      filterStatusLabel: "Stock status", allStatusesOption: "All statuses", applyFilterButton: "Apply",
      lowStockOnlyChip: "Low stock only",
      colMaterial: "Material", colCategory: "Category", colUnit: "Unit", colStock: "Stock", colMinStock: "Min. stock", colStatus: "Status", colAction: "Action",
      detailsButton: "Details",
      emptyMaterialsTitle: "No materials found", emptyMaterialsDescription: "Change your search or reset the filters",
      paginationMaterialsLabel: "materials", paginationRequestsLabel: "requests", paginationHistoryLabel: "records",
      statusNormal: "Normal", statusLow: "Low stock", statusCritical: "Critical", statusOutOfStock: "Out of stock",
      warehouseStatusTitle: "Warehouse status", totalLabel: "total",
      attentionBanner: (n) => `${n} material${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} attention`,
      attentionBannerHint: "Review the low-stock list",
      recentRequestsTitle: "Recent requests", allRequestsLink: "All requests →", noRequestsYet: "No requests yet", createRequestButton: "Create request",
      colRequestNumber: "Request #", colRequestMaterial: "Material", colRequestQuantity: "Qty", colRequestDate: "Date", colRequestStatus: "Status",
      requestStatusNew: "New", requestStatusApproved: "Approved", requestStatusInTransit: "In transit", requestStatusIssued: "Issued", requestStatusRejected: "Rejected",
      emptyRequestsTitle: "No requests found", emptyRequestsDescription: "Create a new material request",
      colTransitDocument: "Document", colTransitMaterials: "Materials", colTransitRoute: "Route", colTransitDate: "Date", colTransitStatus: "Status",
      emptyTransitTitle: "No materials in transit", emptyTransitDescription: "All material transfers are complete",
      unitsShortLabel: "units",
      emptyHistoryTitle: "No movements yet",
      receivedLabel: (name) => `Received: ${name}`, writtenOffLabel: (name) => `Written off: ${name}`, movedLabel: (from, to) => `Transfer: ${from} → ${to}`,
      categoryItemsLabel: (n) => `${n} item${n === 1 ? "" : "s"}`, somoniLabel: "somoni",
      createModalTitle: "New material request", createModalDescription: "The request will be sent to the site foreman for approval",
      fieldMaterial: "Material", fieldQuantity: "Quantity", fieldNote: "Comment", fieldNotePlaceholder: "E.g. urgently needed for the foundation pour", fieldNoteOptionalSuffix: "optional",
      cancelButton: "Cancel", submitRequestButton: "Submit request",
      errorSelectMaterial: "Select a material", errorQuantityInvalid: "Enter a valid quantity",
      requestCreatedToast: "Request sent for approval",
      drawerTitle: "Material", warehouseLabel: "Warehouse", unitLabel: "Unit of measure", currentStockLabel: "Current stock", minStockLabel: "Minimum stock",
      priceLabel: "Unit price", totalValueLabel: "Total value", noteLabel: "Note",
      recentReceiptsTitle: "Recent receipts", recentWriteOffsTitle: "Recent write-offs", transferHistoryTitle: "Transfer history", noDataLabel: "No data",
    },
    brigadirReports: {
      pageTitle: "Reports", pageSubtitle: "Analytics on works, materials, crew, and finances",
      tabOverview: "Overview", tabWorks: "Works", tabMaterials: "Materials", tabFinance: "Finance", tabBrigade: "Crew", tabAttendance: "Attendance",
      kpiTotalWorks: "Total works", kpiCompletedWorks: "Completed works", kpiCompletedWorksFooter: (percent) => `${percent}% of total`,
      kpiOverdueWorks: "Overdue works", kpiAverageProgress: "Average progress", kpiTotalExpenses: "Total expenses", expensesFooter: "materials this period",
      allObjectsOption: "All objects", allBrigadesOption: "All crews", filterButton: "Filter", exportButton: "Export",
      dynamicsTitle: "Work Completion Dynamics", seriesPlanned: "Plan", seriesActual: "Actual", seriesRate: "Completion %",
      statusDistributionTitle: "Works by status", priorityTitle: "Works by priority",
      topObjectsTitle: "Top objects by progress", colObject: "Object", colTotalWorks: "Total works", colCompleted: "Completed", colProgress: "Progress", colChange: "Change", allObjectsLink: "All objects →",
      expensesByCategoryTitle: "Expenses by category", colCategory: "Category", colAmount: "Amount", expenseMaterials: "Materials", expenseLabor: "Labor",
      periodSummaryTitle: "Period summary", summaryPeriod: "Period", summaryObjects: "Objects", summaryBrigades: "Crews", summaryWorkers: "Workers", summaryWorkDays: "Work days",
      exportPanelTitle: "Export reports", exportPanelHint: "Download reports in the format you need", exportPdf: "PDF", exportExcel: "Excel", exportCsv: "CSV", configureReportButton: "Configure report",
      noBrigadeTitle: "Crew not found", noBrigadeDescription: "Your account isn't linked to a crew",
      emptyChartData: "No data for the selected period", emptyTableData: "No data",
      csvExportedToast: "Report exported", printPreparedToast: "Report prepared for printing",
      workStatusCompleted: "Completed", workStatusInProgress: "In progress", workStatusOnReview: "In review", workStatusOverdue: "Overdue", workStatusOther: "Other",
      priorityHigh: "High", priorityMedium: "Medium", priorityLow: "Low",
      worksTabColWork: "Work", worksTabColObject: "Object", worksTabColProgress: "Progress", worksTabColStatus: "Status",
      materialsTabTotal: "Total materials", materialsTabLowStock: "Low stock", materialsTabRequests: "Requests this period", materialsTabOpenButton: "Open materials",
      financeTabBudgetTitle: "Object budget", financeTabPlanLabel: "Plan", financeTabActualLabel: "Actual", financeTabVarianceLabel: "Variance", financeTabNoBudget: "No budget found for this object",
      brigadeTabTitle: "Crew composition", brigadeTabMembers: "Members", brigadeTabEfficiency: "Efficiency", brigadeTabForeman: "Foreman", brigadeTabObject: "Object",
      attendanceTabPresent: "Present", attendanceTabLate: "Late", attendanceTabAbsent: "Absent",
      vsPreviousPeriod: "vs. previous period", allObjectsLinkGeneric: "All objects →", expensesDetailsLink: "More about expenses →", specialtiesTitle: "Specialties",
    },
    worker: {
      sidebarDashboard: "Home", sidebarTasks: "My tasks", sidebarAttendance: "Attendance", sidebarSchedule: "Schedule", sidebarMaterials: "Materials",
      sidebarPhotoReports: "Photo report", sidebarNotifications: "Notifications", sidebarProfile: "Profile", sidebarReportProblem: "Report a problem",
      greetingMorning: "Good morning", greetingDay: "Good afternoon", greetingEvening: "Good evening", dashboardSubtitle: "Here's what's happening on site today",
      kpiTasksTitle: "My tasks", kpiTasksFooter: "Total assigned", kpiInProgressTitle: "In progress", kpiInProgressFooter: "Active tasks",
      kpiCompletedTitle: "Completed", kpiCompletedFooter: "This month", kpiHoursTitle: "Hours worked", kpiHoursFooter: "This month",
      tasksTitle: "My tasks", tasksTabAll: (n) => `All (${n})`, tasksTabInProgress: (n) => `In progress (${n})`,
      tasksTabReview: (n) => `In review (${n})`, tasksTabCompleted: (n) => `Completed (${n})`, sortByPriority: "By priority", viewAllTasks: "View all tasks →",
      statusAssigned: "Assigned", statusInProgress: "In progress", statusReview: "In review", statusCompleted: "Completed", statusOverdue: "Overdue", statusPlanned: "Planned", statusPaused: "Paused", statusCancelled: "Cancelled",
      priorityLow: "Low", priorityMedium: "Medium", priorityHigh: "High", priorityCritical: "Critical",
      emptyTasks: "No assigned tasks", emptySchedule: "No tasks planned for today", emptyNotifications: "No new notifications", emptyDocuments: "No documents available",
      colTotalWorks: "Total tasks", colCompleted: "Completed",
      taskDetailTitle: "Task", taskDetailObject: "Object", taskDetailDates: "Dates", taskDetailProgress: "Progress",
      taskDetailStatus: "Status", taskDetailPriority: "Priority", taskDetailAssignedBy: "Assigned by", taskDetailComments: "Comments",
      actionStart: "Start task", actionSubmitReview: "Submit for review", actionUploadPhoto: "Upload photo", actionReportProblemLong: "Report a problem", actionUpdateProgress: "Update progress", actionSaveProgress: "Save progress",
      scheduleTitle: (date) => `Today, ${date}`, scheduleBreak: "Break", scheduleMeeting: "Meeting with foreman", viewFullSchedule: "Full schedule →",
      notificationsTitle: "Notifications", notificationsAllLink: "All",
      statsTitle: "My statistics", statsHours: "Hours worked", statsCompleted: "Tasks completed", statsRating: "Rating", statsViolations: "Violations",
      ratingHigh: "High level", ratingMedium: "Average level", ratingLow: "Needs attention", violationsGood: "Excellent!", violationsPresent: "Some issues",
      documentsTitle: "My documents", allDocumentsLink: "All documents →",
      quickActionsTitle: "Quick actions", actionPhotoReport: "Photo report", actionRequestMaterial: "Request material", actionReportProblemShort: "Report a problem",
      actionMessageProrab: "Message foreman", actionCall: "Call", actionViewSchedule: "View schedule",
      photoModalTitle: "Photo report", photoModalTask: "Task", photoModalTaskPlaceholder: "Select a task", photoModalImage: "Photo", photoModalComment: "Comment", photoModalCommentPlaceholder: "Describe what was done...", photoModalSubmit: "Submit report",
      materialModalTitle: "Request material", materialModalName: "Material", materialModalQty: "Quantity", materialModalUnit: "Unit", materialModalNote: "Comment", materialModalSubmit: "Submit request",
      problemModalTitle: "Report a problem", problemModalCategory: "Category", problemModalTask: "Related task", problemModalNoTask: "Not selected", problemModalDescription: "Problem description", problemModalPriority: "Priority", problemModalSubmit: "Submit",
      problemCategorySafety: "Safety", problemCategoryMaterials: "Materials", problemCategoryEquipment: "Equipment", problemCategoryOther: "Other",
      messageModalTitle: "Message foreman", messageModalText: "Message", messageModalPlaceholder: "Write a message to the foreman...", messageModalSubmit: "Send",
      toastPhotoSubmitted: "Photo report submitted", toastMaterialRequested: "Material request submitted", toastProblemReported: "Problem report submitted", toastMessageSent: "Message sent to foreman", toastMarkedRead: "Marked as read",
      attendancePageTitle: "Attendance", attendancePageSubtitle: "Your attendance, lateness and hours worked", attendanceColDate: "Date", attendanceColArrival: "Arrival", attendanceColDeparture: "Departure", attendanceColStatus: "Status", attendanceColHours: "Hours",
      attendanceColObject: "Object", attendanceColNote: "Note",
      kpiAttendanceTotalTitle: "Total records", kpiAttendanceTotalFooter: "for the selected period", kpiPresentTitle: "Present", kpiPresentFooter: "workdays", kpiLateTitle: "Late", kpiLateFooter: "for the selected period", kpiAbsentTitle: "Absent", kpiAbsentFooter: "for the selected period",
      attendanceHistoryTitle: "My attendance", attendanceTabAll: "All", attendanceTabPresent: "Present", attendanceTabLate: "Late", attendanceTabAbsent: "Absent",
      statusDayOff: "Day off", noteDayOff: "Day off", attendanceStatusPresent: "Present", attendanceStatusLate: "Late", attendanceStatusAbsent: "Absent", statusNoData: "No data",
      weeklyAnalyticsTitle: "Weekly attendance", normLabel: "Target", factLabel: "Actual", latesLabel: "Late days", absencesLabel: "Absences",
      tooltipStatusLabel: "Status", tooltipCheckIn: "Check-in", tooltipCheckOut: "Check-out", tooltipLate: "Late by", tooltipWorked: "Worked",
      todayTimelineArrival: "Morning check-in", todayTimelineLunchStart: "Lunch break", todayTimelineLunchEnd: "Back from break", todayTimelineDeparture: "Shift end", emptyTimeline: "No data for today",
      dailySummaryTitle: "Today's summary", dailySummaryPresence: "Presence", dailySummaryLate: "Late by", dailySummaryOvertime: "Overtime", dailySummaryAttendance: "Attendance", dailySummaryYes: "Yes", dailySummaryNo: "No",
      remindersTitle: "Reminders", emptyReminders: "No reminders",
      shortSummaryTitle: "Short summary", shortSummaryObject: "Object", shortSummaryProrab: "Site manager", shortSummaryNextCheck: "Next workday", shortSummaryActiveTasks: "Active tasks", contactProrabButton: "Contact site manager",
      emptyAttendance: "No records for the selected period", thisMonth: "This month", lastSevenDays: "Last 7 days", lastThirtyDays: "Last 30 days",
      schedulePageTitle: "Schedule", schedulePageSubtitle: "My shifts, hours and weekly plan",
      kpiWorkdaysTitle: "Workdays", kpiWorkdaysFooter: "this month", kpiTodayShiftTitle: "Today", kpiTodayShiftFooter: "current shift",
      kpiNextDayOffTitle: "Next day off", kpiNextDayOffFooter: (days) => (days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`), kpiWorkedHoursTitle: "Worked", kpiWorkedHoursFooter: "this month",
      calendarShiftsTitle: "Shift calendar", legendWorkday: "Workday", legendDayOff: "Day off", legendOvertime: "Overtime", legendBriefing: "Briefing",
      weekScheduleTitle: "Weekly schedule", weekScheduleColDay: "Day", weekScheduleColDate: "Date", weekScheduleColTime: "Time", weekScheduleColStatus: "Status", weekScheduleColObject: "Object",
      statusFullShift: "Full shift", statusShortShift: "Short day",
      upcomingEventsTitle: "Upcoming events", hoursWorkedTitle: "Hours worked", planHoursLabel: "Plan", overtimeHoursLabel: "Overtime",
      monthSummaryTitle: "Monthly summary", summaryWorkdays: "Workdays", summaryDaysOff: "Days off", summaryOvertime: "Overtime", summaryAvgAttendance: "Average attendance",
      materialsPageTitle: "Materials", materialsPageSubtitle: "Site materials and your requests", materialsRequestButton: "Request material", materialsColMaterial: "Material", materialsColQty: "Quantity", materialsColStatus: "Status", materialsColDate: "Date", emptyMaterialRequests: "No material requests",
      materialsTabAvailable: "Available materials", materialsTabMyRequests: "My requests", materialsTabHistory: "History",
      materialsKpiTotalTitle: "Total in stock", materialsKpiAvailableTitle: "Available", materialsKpiReservedTitle: "Reserved", materialsKpiExpectedTitle: "Expected", materialsKpiFooter: (amount) => `worth ${amount} som.`, materialsUnitsSuffix: "units", materialsCurrencySuffix: "som.",
      materialsSearchPlaceholder: "Search material...", materialsAllCategories: "All categories", materialsUnitFilterPlaceholder: "Unit", materialsAvailabilityFilterLabel: "In stock", materialsAllAvailability: "All materials", materialsResetFilters: "Reset",
      materialsColCategory: "Category", materialsColUnit: "Unit", materialsColInStock: "In stock", materialsColReserved: "Reserved", materialsColAvailable: "Available", materialsColPrice: "Price",
      materialsResultsSummary: (from, to, total) => `Showing ${from}–${to} of ${total} materials`,
      emptyMaterialsSearch: "No materials found", emptyMaterialsSearchDescription: "Try changing the search or resetting the filters", emptyMaterialRequestsHistory: "Request history is empty",
      materialsRequestCardTitle: "Request material", materialsRequestMaterialPlaceholder: "Select material", materialsRequestQtyPlaceholder: "Quantity", materialsRequestUnitPlaceholder: "Unit", materialsRequestCommentPlaceholder: "Comment (optional)",
      materialsErrorMaterialRequired: "Select a material", materialsErrorQtyRequired: "Enter a quantity greater than zero",
      categoryStockTitle: "Stock by category", categoryStockCollapseAction: "Collapse",
      recentRequestsTitle: "Recent requests", recentRequestsAllAction: "All requests",
      photoReportsPageTitle: "Photo report", photoReportsPageSubtitle: "Photos of completed work, stages and remarks", photoReportsNewButton: "New photo report", emptyPhotoReports: "No photo reports yet", photoReportsCardTitle: "My photo reports",
      photoKpiUploadedTitle: "Photos uploaded", photoKpiUploadedFooter: "this month", photoKpiTodayTitle: "Today", photoKpiTodayFooter: "new photos",
      photoKpiPendingTitle: "Pending", photoKpiPendingFooter: "awaiting approval", photoKpiApprovedTitle: "Approved", photoKpiApprovedFooter: "confirmed by foreman",
      photoStatusPending: "Pending", photoStatusApproved: "Approved", photoStatusRejected: "Rejected",
      photoFilterAll: "All", photoFilterToday: "Today", photoFilterAllWorks: "All works", photoUploadButton: "Upload photo",
      photoResultsSummary: (from, to, total) => `Showing ${from}–${to} of ${total} photo reports`, photoViewAction: "View",
      emptyPhotoReportsFiltered: "No photo reports found", emptyPhotoReportsFilteredDescription: "Change the filters or upload a new photo report", photoReviewerCommentLabel: "Foreman's comment",
      photoUploadCardTitle: "Upload report", photoDropzoneTitle: "Drag photos here", photoDropzoneSubtitle: "or click to choose",
      photoUploadWorkLabel: "Work", photoUploadWorkPlaceholder: "Select a work", photoUploadObjectLabel: "Object", photoUploadObjectPlaceholder: "Determined by the work",
      photoErrorMaxImages: "You can attach up to 10 photos", photoErrorFileType: "Only JPG, PNG and WEBP are supported", photoErrorFileSize: "File size must not exceed 10 MB", photoErrorWorkRequired: "Select a work", photoErrorImagesRequired: "Add at least one photo",
      photoActivityTitle: "Photo report activity", photoActivityUploaded: "Uploaded", photoActivityApproved: "Approved",
      photoCommentsTitle: "Recent comments", photoCommentsToday: "Today", photoCommentsYesterday: "Yesterday",
      photoSummaryTitle: "Short summary", photoSummaryTotalTasks: "Total tasks", photoSummaryPendingPhotos: "Photos due", photoSummaryNextCheck: "Next check", photoSummaryRemarks: "Remarks", photoSummaryGoToTasks: "Go to tasks",
      photoQuickActionsTitle: "Quick actions", photoActionTakePhoto: "Take a photo", photoActionChooseGallery: "Choose from gallery", photoActionMyTasks: "My tasks", photoActionContactProrab: "Contact foreman",
      notificationsPageTitle: "Notifications", notificationsPageSubtitle: "All important notifications and messages", markAllRead: "Mark all as read",
      notificationTabAll: "All", notificationTabUnread: "Unread", notificationTabImportant: "Important", notificationTabSystem: "System",
      emptyNotificationsFiltered: "No notifications found", emptyNotificationsFilteredDescription: "Change the filters or check other categories", notificationUnreadLabel: "unread",
      notificationPriorityImportant: "Important", notificationPriorityNormal: "Normal", notificationPrioritySystem: "System",
      notificationsResultsSummary: (count) => `Showing 1–${count} of ${count} notifications`,
      notificationFiltersTitle: "Filters", notificationFilterTypeLabel: "Notification type", notificationAllTypes: "All types",
      notificationTypeTask: "Tasks", notificationTypeMaterials: "Materials", notificationTypeSchedule: "Schedule", notificationTypePhotoReport: "Photo reports", notificationTypeReminder: "Reminders", notificationTypeSystem: "System",
      notificationFilterDateLabel: "Date", notificationFilterPriorityLabel: "Priority", notificationAllPriorities: "All priorities", notificationResetFilters: "Reset filters",
      notificationSummaryTitle: "Summary", notificationSummaryTotal: "Total notifications", notificationSummaryUnread: "Unread", notificationSummaryImportant: "Important", notificationSummarySystem: "System",
      notificationPushTitle: "Don't miss what matters!", notificationPushDescription: "Enable push notifications to get instant alerts about new tasks and changes.",
      notificationPushEnabled: "Notifications enabled", notificationPushDenied: "Notifications blocked in browser", notificationPushUnsupported: "Browser doesn't support push notifications", notificationPushEnableButton: "Enable notifications",
      documentsPageTitle: "My documents", documentsPageSubtitle: "Documents for your object",
      profilePageTitle: "Profile", profilePageSubtitle: "Personal details, settings and worker information", profileBrigade: "Brigade", profileObject: "Object", profileSpecialty: "Specialty", profileGrade: "Grade", profilePhone: "Phone",
      profileStatusActive: "Active", profileStatusInactive: "Inactive", profileEditButton: "Edit profile", profileChangePhotoButton: "Change photo", profileSaveButton: "Save changes",
      profileErrorFirstNameRequired: "Enter a first name", profileErrorLastNameRequired: "Enter a last name", profileErrorPhoneInvalid: "Enter a valid phone number", profileErrorEmailInvalid: "Enter a valid email",
      profileToastUpdated: "Profile updated", profileToastPhotoUpdated: "Profile photo updated",
      profileFieldFirstName: "First name", profileFieldLastName: "Last name", profileFieldEmail: "Email", profileFieldAddress: "Address", profileFieldEmergencyContact: "Emergency contact",
      profileFieldBirthDate: "Date of birth", profileFieldPassport: "Passport/ID", profileFieldHiredAt: "Hire date", profileFieldSection: "Current section", profileFieldExperience: "Construction experience", profileFieldForeman: "Foreman",
      profileProfessionalInfoTitle: "Professional information", profilePersonalInfoTitle: "Personal information", profileSkillsTitle: "Skills",
      profileGradeValue: (grade) => `Grade ${grade}`, profileYearsValue: (years) => `${years} ${years === 1 ? "year" : "years"}`,
      profileStatsTitle: "Profile statistics", profileStatsTotalLabel: "total", profileStatCompletedTasks: "Completed tasks", profileStatPhotoReports: "Photo reports", profileStatRemarks: "Remarks", profileStatAttendance: "Average attendance",
      profileActivityTitle: "Recent activity", profileActivityAttendance: "Attendance marked", profileActivityPhoto: "Photo report uploaded", profileActivityMaterials: "Materials requested", profileActivityTask: "Task completed",
      profileSettingsTitle: "Settings", profileSettingPush: "Push notifications", profileSettingSms: "SMS notifications", profileSettingTelegram: "Telegram notifications", profileSettingVisibility: "Profile visibility", profileSettingLanguage: "Interface language",
      profileDocumentsTitle: "Documents and access", profileDocumentValidUntil: (date) => `Valid until ${date}`, profileDocumentUploaded: "Uploaded", profileDocumentOpenButton: "Open", profileDocumentOpened: "Document opened", profileDocumentMissing: "Document not uploaded",
      profileKpiExperienceTitle: "Experience", profileKpiTasksTitle: "My tasks", profileKpiTasksFooter: "Active tasks", profileKpiHoursTitle: "Hours worked", profileKpiHoursFooter: "This month", profileKpiAttendanceTitle: "Average attendance", profileKpiAttendanceFooter: "Last month",
      materialStatusNew: "New", materialStatusApproved: "Approved", materialStatusInTransit: "In transit", materialStatusIssued: "Issued", materialStatusRejected: "Rejected",
      kpiTotalTasksTitle: "Total tasks", kpiReviewTitle: "In review", kpiReviewFooter: "Awaiting review", kpiOverdueTitle: "Overdue", kpiOverdueFooter: "Overdue tasks",
      filterButton: "Filter", sortByPriorityOption: "By priority", sortByDueDate: "By due date", sortByProgress: "By progress", sortNewest: "Newest first", sortOldest: "Oldest first",
      filterPriorityLabel: "Priority", filterObjectLabel: "Object", filterOverdueOnly: "Overdue only", filterAllObjects: "All objects", filterApply: "Apply", filterReset: "Reset",
      tasksResultsSummary: (from, to, total) => `Showing ${from}–${to} of ${total} tasks`, paginationPrev: "Previous", paginationNext: "Next",
      monthlyStatsTitle: "Monthly statistics", monthlyStatsCompletedTasks: "Tasks completed", monthlyStatsCompletedWorks: "Works completed", monthlyStatsHours: "Hours worked", monthlyStatsAvgProgress: "Average progress",
      upcomingTasksTitle: "Upcoming tasks", upcomingTasksAll: "All", upcomingTasksEmpty: "No upcoming tasks",
      tasksQuickActionsTitle: "Quick actions",
    },
    objects: {
      pageTitle: "Objects", pageSubtitle: "Manage construction objects and their statuses", searchPlaceholder: "Search objects, locations, foreman...",
      tabAll: "All", tabActive: "Active", tabAtRisk: "At risk", tabCompleted: "Completed",
      kpiTotal: "Total objects", kpiTotalFooter: "All company projects",
      kpiInWork: "In progress", kpiCompleted: "Completed", kpiAtRisk: "At risk", kpiPercentOfTotal: (n) => `${n}% of the total`,
      listTitle: "Object list", addObject: "Add object",
      colCity: "Location", colForeman: "Foreman", colProgress: "Progress", colBudget: "Budget", colDeadline: "Deadline",
      actionViewObject: "View object",
      emptyTitle: "No objects found",
      chartTitle: "Object dynamics", chartModeProgress: "Progress", chartModeBudget: "Budget", chartPeriodAriaLabel: "Period",
      chartSeriesPlanned: "Planned progress", chartSeriesActual: "Actual progress",
      summaryTitle: "Summary of the selected object", summaryDeadlineChip: (date) => `Deadline: ${date}`,
      summaryStartDate: "Start date", summaryDeadline: "Deadline", summaryBudget: "Budget", summarySpent: "Spent", summaryRemaining: "Remaining budget",
      summaryProgress: "Completion progress", summaryOpenDetail: "Open detail page",
      taskListTitle: "Upcoming tasks", taskOverdue: "Overdue", taskToday: "Today", taskPlanned: "Planned", taskListAllLink: "All object tasks →",
      addModalTitle: "Add object", addModalDescription: "Fill in the main details of the construction object", saveObjectButton: "Save object",
      fieldName: "Object name", fieldNamePlaceholder: "E.g., Residential complex \"Zarya\"",
      fieldType: "Object type",
      fieldCity: "City", fieldCityPlaceholder: "E.g., Dushanbe",
      fieldAddress: "Address", fieldAddressPlaceholder: "Street, building",
      fieldForeman: "Foreman", fieldForemanPlaceholder: "Foreman's full name",
      fieldStatus: "Status",
      fieldStartDate: "Start date", fieldDeadline: "Deadline",
      fieldBudget: "Total budget, somoni", fieldProgress: "Initial progress, %",
      fieldImage: "Object image", fieldImageUploadHint: "Click to upload an image", fieldImagePreviewAlt: "Object preview",
      fieldDescription: "Description", fieldDescriptionPlaceholder: "Brief description of the object and scope of work",
      errorNameRequired: "Enter the object's name", errorCityRequired: "Enter a city", errorAddressRequired: "Enter an address", errorForemanRequired: "Enter a foreman",
      errorStartDateRequired: "Enter a start date", errorDeadlineRequired: "Enter a deadline", errorDeadlineBeforeStart: "The deadline can't be earlier than the start date",
      errorProgressRange: "Progress must be between 0 and 100",
      objectTypeOptions: {
        residential: "Residential complex", business: "Business center", cottage: "Cottage", warehouse: "Warehouse complex",
        school: "School / education", clinic: "Medical clinic", mall: "Shopping mall", service: "Auto service",
        hotel: "Hotel", sport: "Sports complex", factory: "Production facility",
      },
      filterDrawerTitle: "Filters", filterCity: "City", filterForeman: "Foreman",
      filterMinProgress: "Min progress, %", filterMaxProgress: "Max progress, %", filterMinBudget: "Min budget", filterMaxBudget: "Max budget",
      deleteConfirmTitle: "Delete object?", deleteConfirmDescription: (name) => `"${name}" will be removed from the object list.`,
      toastCreated: "Object added successfully", toastDeleted: "Object deleted",
    },
    estimates: {
      pageTitle: "Estimates", pageSubtitle: "Manage estimates by object", searchPlaceholder: "Search estimates...", newEstimateButton: "New estimate",
      kpiTotal: "Total estimates", kpiTotalOfPrefix: "Totaling",
      kpiApproved: "Approved", kpiPendingReview: "Pending review", kpiDraft: "Drafts",
      colNumber: "Estimate #", colVersion: "Version", colAmount: "Amount, somoni", colResponsible: "Responsible",
      filterObjectAriaLabel: "Object", filterStatusAriaLabel: "Status",
      statusAllLabel: "Status: All", allObjectsOption: "All objects",
      statusDraft: "Draft", statusPendingReview: "Pending review", statusApproved: "Approved",
      emptyTitle: "No estimates found", paginationItemLabel: "estimates",
      budgetChartTitle: "Budget vs actual spend",
      categorySpendTitle: "Spend by category", categorySpendCenterLabel: "Total spend",
      summaryTitle: "Summary of the selected estimate", summaryNumberLabel: "Estimate #", summaryDateCreated: "Date created", summaryDateUpdated: "Date updated",
      summaryTotalBudget: "Total budget",
      openEstimateButton: "Open estimate", downloadPdfButton: "Download PDF",
      riskCardTitle: "Estimates needing attention", riskAllLink: "All at-risk estimates →",
      filterResponsiblePlaceholder: "Foreman's name", filterMinAmount: "Min amount", filterMaxAmount: "Max amount",
      deleteConfirmTitle: "Delete estimate?", deleteConfirmDescription: (number) => `Estimate "${number}" will be deleted.`,
      toastCreated: "Estimate created", toastDeleted: "Estimate deleted", toastOpenUnavailable: "Opening the estimate's detail page isn't available in this demo yet",
      toastRiskOpened: (title) => `Opened estimate: ${title}`,
      addModalTitle: "New estimate", addModalDescription: (number) => `The estimate number will be assigned automatically: ${number}`,
      fieldVersion: "Version", fieldAmount: "Amount, somoni", fieldDate: "Date",
      fieldResponsiblePlaceholder: "Foreman's full name",
      errorAmountPositive: "Enter an amount greater than zero", errorDateRequired: "Enter the estimate date", errorResponsibleRequired: "Enter who's responsible",
      categoryLabels: {
        "Строительные материалы": "Construction materials", "Оплата труда": "Labor", "Техника и оборудование": "Machinery and equipment",
        "Транспорт и логистика": "Transport and logistics", "Электромонтаж": "Electrical work", "Прочие расходы": "Other expenses",
      },
      riskDescriptionLabels: {
        "Превышение на 450 000 сомони": "Over budget by 450,000 somoni",
        "Превышение на 120 000 сомони": "Over budget by 120,000 somoni",
        "Не подтверждены затраты на 310 000 сомони": "Expenses of 310,000 somoni not yet confirmed",
        "Смета не утверждена": "Estimate not yet approved",
      },
    },
    budgets: {
      pageTitle: "Budgets", pageSubtitle: "Plan, track, and analyze budgets by object", searchPlaceholder: "Search budgets, objects...",
      tabAll: "All", tabActive: "Active", tabCompleted: "Completed", tabOverBudget: "Over budget",
      kpiTotalBudget: "Total budget", kpiTotalBudgetFooter: "Across all active objects",
      kpiApprovedBudget: "Approved budgets", kpiApprovedFooter: (pct) => `${pct}% of the total budget`,
      kpiActualSpent: "Actual spend", kpiActualSpentFooter: (pct) => `${pct}% of budget used`,
      kpiOverBudget: "Over budget", kpiOverBudgetFooter: (n) => `${n} objects over budget`,
      listTitle: "Budgets by object", addBudget: "Add budget", paginationItemLabel: "budgets",
      colSpent: "Spent", colRemaining: "Remaining", colUsage: "Usage", colOverspend: "Over budget",
      actionViewBudget: "View budget",
      emptyTitle: "No budgets found",
      chartTitle: "Budget dynamics", distributionTitle: "Budget distribution", centerLabel: "Total budget",
      seriesTotalBudget: "Total budget", seriesRemaining: "Remaining budget",
      operationsTitle: "Recent budget operations", opColAction: "Action", allOperationsLink: "All operations →",
      riskCardTitle: "Over-budget objects", riskAllLink: "All at-risk budgets →",
      summaryTitle: "Summary of the selected budget", summaryPeriodLabel: "Budget period", summaryUpdatedDate: "Last updated",
      editBudgetButton: "Edit budget", exportPdfButton: "Export PDF",
      addModalTitle: "Add budget", addModalDescription: "Fill in the main parameters of the object's budget",
      fieldPeriodStart: "Period start", fieldPeriodEnd: "Period end",
      statusPendingApproval: "Pending approval", statusOverBudget: "Over budget",
      errorPeriodStartRequired: "Enter a start date", errorPeriodEndRequired: "Enter an end date", errorPeriodEndBeforeStart: "The end can't be earlier than the start",
      deleteConfirmTitle: "Delete budget?", deleteConfirmDescription: (name) => `The budget for "${name}" will be deleted.`,
      toastCreated: "Budget added", toastDeleted: "Budget deleted", toastEditUnavailable: "Editing isn't available in this demo yet",
      toastRiskOpened: (title) => `Opened budget: ${title}`,
      categoryLabels: {
        "Строительные работы": "Construction work", "Материалы": "Materials", "Оборудование": "Equipment",
        "Непредвиденные расходы": "Unforeseen expenses", "Прочие расходы": "Other expenses",
      },
      operationActionLabels: {
        "Добавлены расходы": "Expenses added", "Утверждён бюджет": "Budget approved", "Обновлён бюджет": "Budget updated", "Создан бюджет": "Budget created",
      },
      riskDescriptionLabels: {
        "Превышение на 45 000 сомони": "Over budget by 45,000 somoni",
        "Превышение на 15 000 сомони": "Over budget by 15,000 somoni",
        "Ожидает подтверждения расходов на 85 000 сомони": "Pending confirmation of 85,000 somoni in expenses",
        "Бюджет в черновике": "Budget is a draft",
      },
    },
    users: {
      pageTitle: "Users", pageSubtitle: "Manage accounts and access rights", searchPlaceholder: "Search users...",
      kpiTotal: "Total users", kpiTotalSuffix: "accounts",
      kpiActive: "Active", kpiActiveSuffix: "users",
      kpiInactive: "Inactive", kpiInactiveSuffix: "users",
      kpiAdmins: "Administrators", kpiAdminsSuffix: "users",
      kpiRoles: "Roles", kpiRolesSuffix: "roles in the system",
      addUser: "Add user", export: "Export",
      tabAll: "All users", tabActive: "Active", tabInactive: "Inactive",
      colSelectAll: "Select all", colUser: "User", colRole: "Role", colPhone: "Phone", colEmail: "Email", colStatus: "Status", colRegisteredAt: "Registered", colActions: "Actions",
      selectUser: (name) => `Select ${name}`,
      statusActive: "Active", statusInactive: "Inactive", statusBlocked: "Blocked",
      actionView: "View", actionEdit: "Edit", actionChangeStatus: "Change status", actionChangeStatusDisabled: "You can't change your own account's status",
      paginationItemLabel: "users",
      filtersTitle: "Filters", filterSearch: "Search", filterSearchPlaceholder: "Name, email, or phone...",
      filterRole: "Role", filterAllRoles: "All roles",
      filterStatus: "Status", filterAllStatuses: "All statuses", filterActiveStatus: "Active", filterInactiveStatus: "Inactive", filterBlockedStatus: "Blocked",
      filterRegisteredDate: "Registration date", filterApply: "Apply", filterReset: "Reset",
      roleDistributionTitle: "Users by role",
      modalAddTitle: "Add user", modalEditTitle: "Edit user", modalViewTitle: "User profile", modalAddDescription: "Create a new account",
      fieldFullName: "Full name", fieldFullNamePlaceholder: "First and last name",
      fieldLogin: "Login", fieldLoginPlaceholder: "username",
      fieldEmail: "Email", fieldEmailPlaceholder: "name@binosoz.tj",
      fieldPhone: "Phone", fieldPhonePlaceholder: "+992 00 000 00 00",
      fieldRole: "Role", fieldStatus: "Status",
      buttonClose: "Close", buttonCancel: "Cancel", buttonAdd: "Add", buttonSave: "Save",
      errorRequiredFields: "Fill in name, login, and email", errorPhoneFormat: "Phone format: +992 XX XXX XX XX", errorLoginTaken: "This login is already taken by another user",
      csvUser: "User", csvRole: "Role", csvPhone: "Phone", csvEmail: "Email", csvStatus: "Status",
    },
    dashboard: {
      pageTitle: "Company overview", pageSubtitle: "Track objects, finances, and work progress",
      kpiTotalBudget: "Total budget", kpiSpent: (v) => `Spent: ${v}`,
      kpiActiveObjects: "Active objects", kpiInProgress: (n) => `${n} in progress`, kpiCompletedObjects: (n) => `${n} completed`,
      kpiPayrollDebt: "Payroll debt", kpiNextPayment: (d) => `Next payment: ${d}`, kpiNotScheduled: "not scheduled",
      kpiCompletedWorks: "Completed works", kpiOverallProgress: "Overall progress across all objects",
      periodWeek: "Week", periodMonth: "Month", periodQuarter: "Quarter", periodYear: "Year",
      objectsStateTitle: "Object status", viewAllObjects: "All objects →",
      colObject: "Object", colForeman: "Foreman", colProgress: "Progress", colBudget: "Budget", colStatus: "Status",
      attentionTitle: "Works needing attention", attentionOpen: "Open", overdueBy: (n) => `Overdue by ${n} days`, stockDepleted: "Stock depleted", stockLow: "Stock below minimum",
      budgetChartTitle: "Budget vs actual spend",
      budgetTotal: "Total budget", budgetSpent: "Actual spend", budgetRemaining: "Remaining", budgetOver: "Over budget",
      payrollApprovedTitle: "Payroll approved", payrollPeriod: (p) => `Period: ${p}`, payrollToPay: (v) => `To pay ${v}`,
      payrollToApproveTitle: "Payroll pending approval", payrollPeriodLabel: "Period:", payrollEmployeeCount: "Employee count:", payrollAccrued: "Accrued:", payrollDeductions: "Deductions:", payrollTotalToPay: "Total to pay:", payrollPreparedBy: (n) => `Prepared by: ${n}`,
      payrollReturned: "Returned to the accountant for revision",
      payrollApprove: "Approve payroll", payrollReturnToAccountant: "Return to accountant",
      payrollApproveConfirmTitle: "Approve payroll?", payrollApproveConfirmDescription: (p, v) => `Period: ${p}. Total to pay: ${v}.`, payrollApproveConfirmLabel: "Approve",
      payrollReturnModalTitle: "Return to accountant", payrollReturnModalDescription: "Describe what needs to be fixed before the next review.",
      payrollReturnCancel: "Cancel", payrollReturnConfirm: "Return",
      payrollCommentLabel: "Comment", payrollCommentPlaceholder: "E.g.: recalculate deductions for crew #3",
      toastApproved: "Payroll approved", toastReturned: "Payroll returned to the accountant",
    },
    settings: {
      pageTitle: "Settings", pageSubtitle: "Manage the system and company parameters",
      searchPlaceholder: "Search settings...", searchResults: "Search results", noResultsFound: "No settings found",
      openAction: "Open →", save: "Save", savedAt: "Saved at", support: "Support", documentation: "Documentation",
      footerCopyright: "© 2026 BINOSOZ. All rights reserved.",
      tabs: { general: "General", company: "Company", finance: "Finance", notifications: "Notifications", security: "Security", integrations: "Integrations", backups: "Backups" },
      general: {
        generalCardTitle: "General settings",
        language: "Interface language", languageDescription: "Choose the system language",
        timezone: "Time zone", timezoneDescription: "Set the time zone",
        dateFormat: "Date format", dateFormatDescription: "Choose how dates are displayed",
        timeFormat: "Time format", timeFormatDescription: "Choose the time format",
        currency: "Default currency", currencyDescription: "The system's main currency",
        measurement: "Units", measurementDescription: "Measurement unit system",
        displayCardTitle: "Display settings",
        theme: "Interface theme", themeDescription: "Choose the appearance theme",
        themeLight: "Light", themeDark: "Dark", themeSystem: "System",
        accent: "Accent color", accentDescription: "The system's color theme",
        density: "Interface density", densityDescription: "Element size and spacing",
        densityCompact: "Compact", densityComfortable: "Comfortable", densitySpacious: "Spacious",
        sidebarMode: "Sidebar display", sidebarModeDescription: "Sidebar display mode",
        sidebarCollapsed: "Collapsed", sidebarExpanded: "Expanded",
        animations: "Interface animations", animationsDescription: "Enable smooth animations",
        workCardTitle: "Operations settings",
        automaticBackup: "Automatic backups", automaticBackupDescription: "Create database backups",
        confirmDelete: "Confirm deletion", confirmDeleteDescription: "Ask for confirmation before deleting",
        activityLog: "Activity log", activityLogDescription: "Log every action in the system",
        autoCloseTasks: "Auto-close tasks", autoCloseTasksDescription: "Automatically close overdue tasks",
        stockCheck: "Warehouse stock checks", stockCheckDescription: "Monitor minimum material stock levels",
        documentsCardTitle: "Document settings",
        documentNumbering: "Document numbering", documentNumberingDescription: "Automatic document numbering",
        documentPrefix: "Document prefix", documentPrefixDescription: "Prefix for document numbers",
        printForms: "Print forms", printFormsDescription: "Use branded templates",
        documentSignature: "Document signature", documentSignatureDescription: "Automatic signature on documents",
        watermark: "Watermark", watermarkDescription: "Add a watermark to documents",
        notImplemented: "Requires a backend — not available yet",
      },
      company: {
        cardTitle: "Company details", companyName: "Company name", companyPhone: "Phone", companyEmail: "Email",
        companyAddress: "Address", taxId: "Tax ID",
        infoTitle: "Company profile", infoText: "This data is used in print forms, reports, and exported documents.",
      },
      finance: {
        cardTitle: "Financial parameters", currency: "Main currency", vatRate: "VAT rate, %", fiscalYear: "Fiscal year",
        fiscalYearCalendar: "Calendar year", fiscalYearApril: "April – March",
        infoTitle: "Calculation formats", infoText: "Financial parameters apply to new estimates, budgets, payroll, and reports.",
      },
      notifications: {
        cardTitle: "Notification channels", email: "Email notifications", browser: "Browser notifications",
        deadlines: "Deadlines & overdue items", stock: "Critical stock levels",
        infoTitle: "Notification center", infoText: "Selected events show up in the bell icon and are sent through the allowed channels.",
      },
      security: {
        cardTitle: "Access security", sessionMinutes: "Session timeout", twoFactor: "Two-factor authentication",
        passwordExpiry: "Password expiry", loginAlerts: "Login alerts",
        infoTitle: "Password policy", infoText: "Passwords are never stored in settings. In production, verification runs on the auth server.",
      },
      integrations: {
        cardTitle: "API & integrations", apiEnabled: "API access", apiUrl: "API URL", webhookUrl: "Webhook URL",
        oneC: "1C integration", telegram: "Telegram notifications",
        infoTitle: "Integration status", infoText: "Integrations only turn on once real endpoints and server keys are provided.",
      },
      backups: {
        cardTitle: "Backups", automaticCopies: "Automatic backups", frequency: "Frequency",
        frequencyDaily: "Daily", frequencyWeekly: "Weekly", frequencyMonthly: "Monthly",
        createBackup: "Create backup", restoreBackup: "Restore",
        infoTitle: "Local backup", infoText: "The backup only contains the app's localStorage data. Passwords and secret keys are never included.",
      },
      systemInfo: {
        title: "System information", version: "System version", build: "Build", license: "License", licenseActive: "Active",
        licenseType: "License type", licenseTypeValue: "Professional", validUntil: "Valid until", usersLabel: "Users",
        storageLabel: "Storage used", storageOf: "of",
      },
      systemActivity: {
        title: "System activity", viewLog: "View log",
        login: "Signed in", documentCreated: "Document created", dataChanged: "Data changed",
        userDeleted: "User deleted", backupCreated: "Backup created",
      },
    },
  },
};
