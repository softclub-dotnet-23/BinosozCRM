using Application.Common;
using Application.Common.Interfaces;
using Application.Common.Options;
using Application.Payroll;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Application.Seed;

// Development-only demo dataset so the API/UI has something realistic to
// show. Gated by Seed:DemoDataEnabled (default off, see SeedOptions) and,
// per Program.cs, never invoked outside Development regardless of that flag.
// Idempotent like SeedDataService: one coarse "already there?" check
// (Brigades, which only this service ever creates) before writing anything,
// so a restart is a silent no-op. Never touches the Company or Owner
// accounts SeedDataService created — this only adds alongside them, under
// the same CompanyId.
//
// Everything below is built as an in-memory object graph and written once at
// the end. This deliberately avoids re-querying anything it just created:
// ApplicationDbContext's CompanyId query filter fails closed outside an HTTP
// request (see ApplicationDbContext.CurrentCompanyId's own comment), so a
// query without .IgnoreQueryFilters() would silently see nothing — the same
// trap SeedDataService's own Owner-existence check already works around.
// Reusing the Application-layer payroll calculators/handlers
// (CreatePayrollEntryCommand, WorkOrderAutoCloser, ...) isn't safe here for
// the same reason — they query IApplicationDbContext without
// IgnoreQueryFilters(). Instead, the same documented formulas (MASTER
// §8.0/§8.1/§8.8, and ApproveWorkOrderPayoutSharesCommand's payout-share
// amount) are applied directly against the Timesheets/WorkOrderPayoutShares/
// PayrollAdvances this service already holds in memory — same math, no
// invented formula, no unsafe re-query.
public sealed class DemoSeedDataService(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    IBusinessTimeProvider businessTime,
    IOptions<SeedOptions> seedOptions)
{
    // Dev-only demo accounts. Never reached in Production: Program.cs never
    // calls this service outside Development, regardless of DemoDataEnabled.
    private const string DemoPassword = "Demo12345!";

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        var options = seedOptions.Value;
        if (!options.DemoDataEnabled)
            return;

        var company = await context.Companies.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == options.Company.Id, cancellationToken);
        if (company is null)
            return;

        var ownerUserId = await context.Users.IgnoreQueryFilters()
            .Where(u => u.CompanyId == company.Id && !u.IsDeleted && u.Role == Role.Owner)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (ownerUserId == Guid.Empty)
            return;

        var alreadySeeded = await context.Brigades.IgnoreQueryFilters()
            .AnyAsync(b => b.CompanyId == company.Id, cancellationToken);
        if (alreadySeeded)
            return;

        var companyId = company.Id;
        var today = businessTime.Today;

        static void Ensure(Result result)
        {
            if (result.IsFailure)
                throw new InvalidOperationException($"Demo seed hit an invalid state transition: {result.Error.Code}");
        }

        void LogWorkOrderTransition(WorkOrder order, WorkOrderStatus fromStatus, Guid actorUserId, string? comment = null) =>
            TaskLogWriter.Append(context, companyId, TaskLogEntityType.WorkOrder, order.Id,
                fromStatus.ToString(), order.Status.ToString(), actorUserId, comment);

        void Transition(WorkOrder order, Func<Result> transition, Guid actorUserId, string? comment = null)
        {
            var fromStatus = order.Status;
            Ensure(transition());
            LogWorkOrderTransition(order, fromStatus, actorUserId, comment);
        }

        // ---- Staff users: 2 Prorab, 3 Brigadir, 1 Accountant ------------------
        var prorab1 = User.Create(companyId, "Азизов Фаррух Джамолович", "+992900000002", passwordHasher.Hash(DemoPassword), Role.Prorab);
        var prorab2 = User.Create(companyId, "Каримов Далер Салимович", "+992700100102", passwordHasher.Hash(DemoPassword), Role.Prorab);
        var brigadir1 = User.Create(companyId, "Рахимов Шариф Абдуллоевич", "+992900000003", passwordHasher.Hash(DemoPassword), Role.Brigadir);
        var brigadir2 = User.Create(companyId, "Юсупов Бахтиёр Насимович", "+992700100202", passwordHasher.Hash(DemoPassword), Role.Brigadir);
        var brigadir3 = User.Create(companyId, "Назаров Комрон Раджабович", "+992700100203", passwordHasher.Hash(DemoPassword), Role.Brigadir);
        var accountant = User.Create(companyId, "Абдуллоева Мадина Хакимовна", "+992900000004", passwordHasher.Hash(DemoPassword), Role.Accountant);
        context.Users.AddRange(prorab1, prorab2, brigadir1, brigadir2, brigadir3, accountant);

        // ---- Customers ----------------------------------------------------
        var customerConstruction = Customer.Create(companyId, "ООО «Сохтмони Шарк»", "Рахмонов Илхом Назарович", "+992937100001");
        var customerCity = Customer.Create(companyId, "Городской отдел капитального строительства", "Собирова Нигина Файзуллоевна", "+992937100002");
        context.Customers.AddRange(customerConstruction, customerCity);

        // ---- Construction objects (the six named in the task) -------------
        var objClinic = ConstructionObject.Create(companyId, "Медицинская клиника «Шифо»", customerConstruction.Id,
            address: "г. Душанбе, ул. Рудаки, 45", startDate: today.AddMonths(-6), plannedEndDate: today.AddMonths(3), budget: 4_500_000m);
        objClinic.ChangeStatus(ConstructionObjectStatus.InProgress);

        var objBusinessCenter = ConstructionObject.Create(companyId, "Бизнес-центр «Ватан»", customerConstruction.Id,
            address: "г. Душанбе, пр. Исмоили Сомони, 12", startDate: today.AddMonths(-9), plannedEndDate: today.AddMonths(6), budget: 8_200_000m);
        objBusinessCenter.ChangeStatus(ConstructionObjectStatus.InProgress);

        var objResidential = ConstructionObject.Create(companyId, "Жилой комплекс «Сомони»", customerCity.Id,
            address: "г. Душанбе, ул. Айни, 78", startDate: today.AddMonths(-2), plannedEndDate: today.AddMonths(10), budget: 12_000_000m);

        var objRoad = ConstructionObject.Create(companyId, "Дорога Истиклол", customerCity.Id,
            address: "трасса Душанбе — Турсунзаде, участок 1", startDate: today.AddMonths(-4), plannedEndDate: today.AddMonths(2), budget: 3_100_000m);
        objRoad.ChangeStatus(ConstructionObjectStatus.InProgress);

        var objSchool = ConstructionObject.Create(companyId, "Школа №15", customerCity.Id,
            address: "г. Душанбе, ул. Фирдавси, 21", startDate: today.AddMonths(-14), plannedEndDate: today.AddMonths(-1), budget: 2_800_000m);
        objSchool.Complete(today.AddMonths(-1));

        var objWarehouse = ConstructionObject.Create(companyId, "Складской комплекс", customerConstruction.Id,
            address: "г. Душанбе, промзона Шохмансур", startDate: today.AddMonths(-1), plannedEndDate: today.AddMonths(5), budget: 1_900_000m);

        context.ConstructionObjects.AddRange(objClinic, objBusinessCenter, objResidential, objRoad, objSchool, objWarehouse);

        var prorabIdByObjectId = new Dictionary<Guid, Guid>
        {
            [objClinic.Id] = prorab1.Id,
            [objBusinessCenter.Id] = prorab1.Id,
            [objResidential.Id] = prorab1.Id,
            [objRoad.Id] = prorab2.Id,
            [objSchool.Id] = prorab2.Id,
            [objWarehouse.Id] = prorab2.Id
        };

        var assignedAt = businessTime.GetBusinessDateTimeUtc(today.AddMonths(-1), new TimeOnly(9, 0));
        foreach (var (objectId, prorabId) in prorabIdByObjectId)
            context.ProrabObjectAssignments.Add(ProrabObjectAssignment.Create(companyId, prorabId, objectId, assignedAt, ownerUserId));

        // ---- Brigades -------------------------------------------------------
        var brigadeMasons = Brigade.Create(companyId, "Бригада каменщиков");
        brigadeMasons.AssignBrigadir(brigadir1.Id);
        var brigadeElectric = Brigade.Create(companyId, "Бригада электромонтажников");
        brigadeElectric.AssignBrigadir(brigadir2.Id);
        var brigadeFinishers = Brigade.Create(companyId, "Бригада отделочников");
        brigadeFinishers.AssignBrigadir(brigadir3.Id);
        context.Brigades.AddRange(brigadeMasons, brigadeElectric, brigadeFinishers);

        var brigadirIdByBrigade = new Dictionary<Guid, Guid>
        {
            [brigadeMasons.Id] = brigadir1.Id,
            [brigadeElectric.Id] = brigadir2.Id,
            [brigadeFinishers.Id] = brigadir3.Id
        };

        // ---- Workers (18: 15+ required, mixed specialty/pay type) ----------
        var workersByBrigade = new Dictionary<Guid, List<Worker>>
        {
            [brigadeMasons.Id] = [],
            [brigadeElectric.Id] = [],
            [brigadeFinishers.Id] = []
        };
        var allWorkers = new List<Worker>();
        var workerPhoneSeq = 200;

        Worker AddWorker(Brigade brigade, string fullName, string specialty, PayRateType payRateType, decimal payRate, int ageYears, int hireMonthsAgo)
        {
            var phone = $"+992701{workerPhoneSeq++:D6}";
            var birthDate = today.AddYears(-ageYears);
            var hireDate = today.AddMonths(-hireMonthsAgo);
            var worker = Worker.Create(
                companyId, brigade.Id, fullName, phone, birthDate, payRateType, payRate, hireDate,
                specialty: specialty, shiftStartTime: new TimeOnly(8, 0));
            context.Workers.Add(worker);
            context.WorkerPayRateHistories.Add(WorkerPayRateHistory.Create(companyId, worker.Id, payRateType, payRate, hireDate));
            workersByBrigade[brigade.Id].Add(worker);
            allWorkers.Add(worker);
            return worker;
        }

        AddWorker(brigadeMasons, "Олимов Шерали Каримович", "Каменщик", PayRateType.Hourly, 45m, 34, 14);
        AddWorker(brigadeMasons, "Раджабов Сухроб Толибович", "Каменщик", PayRateType.Hourly, 45m, 28, 9);
        AddWorker(brigadeMasons, "Турсунов Файзулло Умарович", "Бетонщик", PayRateType.Hourly, 42m, 39, 20);
        AddWorker(brigadeMasons, "Содиков Умед Носирович", "Разнорабочий", PayRateType.Hourly, 30m, 23, 4);
        AddWorker(brigadeMasons, "Холов Джасур Абдугафорович", "Крановщик", PayRateType.Hourly, 55m, 41, 18);
        var wMasonPiecework = AddWorker(brigadeMasons, "Файзуллоев Акмал Саидович", "Сварщик", PayRateType.Piecework, 0m, 31, 11);

        AddWorker(brigadeElectric, "Назриев Аслиддин Мухторович", "Электрик", PayRateType.Hourly, 50m, 29, 8);
        AddWorker(brigadeElectric, "Сафаров Ориф Джураевич", "Электрик", PayRateType.Hourly, 48m, 36, 16);
        AddWorker(brigadeElectric, "Эргашев Ниёз Файзиевич", "Сантехник", PayRateType.Hourly, 46m, 26, 6);
        AddWorker(brigadeElectric, "Тагоев Фаридун Исмоилович", "Электрик", PayRateType.Hourly, 49m, 44, 22);
        var wElecPiecework1 = AddWorker(brigadeElectric, "Юлдашев Хуршед Рустамович", "Электрик", PayRateType.Piecework, 0m, 27, 7);
        var wElecPiecework2 = AddWorker(brigadeElectric, "Расулов Диловар Абдумаликович", "Монтажник", PayRateType.Piecework, 0m, 33, 13);

        AddWorker(brigadeFinishers, "Норов Джума Абдуллоевич", "Штукатур", PayRateType.Hourly, 38m, 30, 10);
        AddWorker(brigadeFinishers, "Каюмов Бахром Саидович", "Кровельщик", PayRateType.Hourly, 44m, 37, 17);
        AddWorker(brigadeFinishers, "Шарипов Умарали Ниёзович", "Плотник", PayRateType.Hourly, 40m, 24, 5);
        var wFinPiecework1 = AddWorker(brigadeFinishers, "Комилов Фаридун Хабибович", "Штукатур", PayRateType.Piecework, 0m, 32, 12);
        var wFinPiecework2 = AddWorker(brigadeFinishers, "Исмоилов Далер Валиевич", "Маляр", PayRateType.Piecework, 0m, 25, 3);
        var wFinPiecework3 = AddWorker(brigadeFinishers, "Собиров Хикмат Джалолович", "Плиточник", PayRateType.Piecework, 0m, 40, 19);

        bool BrigadeHasPiecework(Brigade brigade) => workersByBrigade[brigade.Id].Any(w => w.PayRateType == PayRateType.Piecework);

        // ---- Work orders (14: 12+ required, spread across statuses) --------
        var workOrders = new List<WorkOrder>();
        var payoutShares = new List<WorkOrderPayoutShare>();

        WorkOrder AddOrder(ConstructionObject obj, Brigade brigade, string title, string unit, decimal plannedQty, decimal unitPrice, DateOnly? dueDate)
        {
            var code = company.ReserveNextCode();
            var order = WorkOrder.Create(companyId, code, obj.Id, brigade.Id, title, unit, plannedQty, unitPrice, ownerUserId, dueDate: dueDate);
            context.WorkOrders.Add(order);
            workOrders.Add(order);
            return order;
        }

        // Mirrors SubmitWorkOrderForReviewCommand's own prerequisites
        // (>=1 progress report; payout shares summing to 100% if the brigade
        // has a Piecework worker) and ApproveWorkOrderPayoutSharesCommand's
        // amount formula, applied directly since every input is already known.
        void SubmitOrderForReview(WorkOrder order, Brigade brigade, decimal reportedQty, DateOnly reportedDate, IReadOnlyList<(Worker Worker, decimal Percent)> shareSplits)
        {
            var brigadirId = brigadirIdByBrigade[brigade.Id];
            var prorabId = prorabIdByObjectId[order.ObjectId];

            context.WorkOrderProgresses.Add(WorkOrderProgress.Create(
                companyId, order.Id, brigadirId, reportedQty, businessTime.GetBusinessDateTimeUtc(reportedDate, new TimeOnly(17, 0))));

            var newShares = shareSplits
                .Select(s => WorkOrderPayoutShare.Create(companyId, order.Id, s.Worker.Id, s.Percent, brigadirId))
                .ToList();
            context.WorkOrderPayoutShares.AddRange(newShares);
            payoutShares.AddRange(newShares);

            var payoutShareComplete = !BrigadeHasPiecework(brigade) || shareSplits.Sum(s => s.Percent) == 100m;
            Transition(order, () => order.SubmitForReview(true, payoutShareComplete), brigadirId);

            if (newShares.Count == 0)
                return;

            var orderTotal = reportedQty * order.UnitPrice;
            foreach (var share in newShares)
                share.Approve(prorabId, Math.Round(orderTotal * share.SharePercent / 100m, 2, MidpointRounding.AwayFromZero));
        }

        // New
        AddOrder(objClinic, brigadeMasons, "Кладка стен 1 этажа", "м3", 120m, 850m, today.AddDays(20));
        AddOrder(objBusinessCenter, brigadeElectric, "Прокладка электропроводки", "м", 500m, 120m, today.AddDays(25));

        // Assigned
        var orderAssigned = AddOrder(objClinic, brigadeMasons, "Штукатурка фасада", "м2", 300m, 95m, today.AddDays(15));
        Transition(orderAssigned, () => orderAssigned.Assign(today.AddDays(-2)), prorab1.Id);

        var orderAssignedOverdue = AddOrder(objRoad, brigadeMasons, "Устройство бордюров", "м", 800m, 60m, today.AddDays(-5));
        Transition(orderAssignedOverdue, () => orderAssignedOverdue.Assign(today.AddDays(-10)), prorab2.Id);

        // InProgress
        var orderInProgress = AddOrder(objBusinessCenter, brigadeElectric, "Монтаж силового щита", "шт", 4m, 15000m, today.AddDays(10));
        Transition(orderInProgress, () => orderInProgress.Assign(today.AddDays(-6)), prorab1.Id);
        Transition(orderInProgress, () => orderInProgress.Start(), brigadir2.Id);

        var orderInProgressOverdue1 = AddOrder(objWarehouse, brigadeElectric, "Освещение склада", "точка", 60m, 250m, today.AddDays(-3));
        Transition(orderInProgressOverdue1, () => orderInProgressOverdue1.Assign(today.AddDays(-12)), prorab2.Id);
        Transition(orderInProgressOverdue1, () => orderInProgressOverdue1.Start(), brigadir2.Id);

        var orderInProgressOverdue2 = AddOrder(objWarehouse, brigadeMasons, "Устройство фундамента склада", "м3", 200m, 780m, today.AddDays(-1));
        Transition(orderInProgressOverdue2, () => orderInProgressOverdue2.Assign(today.AddDays(-15)), prorab2.Id);
        Transition(orderInProgressOverdue2, () => orderInProgressOverdue2.Start(), brigadir1.Id);

        // OnReview
        var orderOnReview = AddOrder(objClinic, brigadeFinishers, "Отделка палат 2 этажа", "м2", 450m, 180m, today.AddDays(8));
        Transition(orderOnReview, () => orderOnReview.Assign(today.AddDays(-9)), prorab1.Id);
        Transition(orderOnReview, () => orderOnReview.Start(), brigadir3.Id);
        SubmitOrderForReview(orderOnReview, brigadeFinishers, 450m, today.AddDays(-1),
            [(wFinPiecework1, 50m), (wFinPiecework2, 30m), (wFinPiecework3, 20m)]);

        var (currentPeriodStart, currentPeriodEnd) = PayrollPeriodCalculator.GetPeriodContaining(today, company.PayrollPeriodType);
        var (previousPeriodStart, previousPeriodEnd) = PayrollDraftGenerator.GetMostRecentlyEndedPeriod(today, company.PayrollPeriodType);

        // Accepted, completed in the current (still open) payroll period
        var orderAcceptedCurrent1 = AddOrder(objBusinessCenter, brigadeElectric, "Пусконаладка электрощитовой", "шт", 2m, 25000m, today.AddDays(5));
        Transition(orderAcceptedCurrent1, () => orderAcceptedCurrent1.Assign(today.AddDays(-7)), prorab1.Id);
        Transition(orderAcceptedCurrent1, () => orderAcceptedCurrent1.Start(), brigadir2.Id);
        SubmitOrderForReview(orderAcceptedCurrent1, brigadeElectric, 2m, today.AddDays(-1),
            [(wElecPiecework1, 60m), (wElecPiecework2, 40m)]);
        Transition(orderAcceptedCurrent1, () => orderAcceptedCurrent1.Accept(today), prorab1.Id);

        var orderAcceptedCurrent2 = AddOrder(objBusinessCenter, brigadeMasons, "Кладка перегородок 2 этажа", "м3", 80m, 820m, today.AddDays(-8));
        Transition(orderAcceptedCurrent2, () => orderAcceptedCurrent2.Assign(today.AddDays(-11)), prorab1.Id);
        Transition(orderAcceptedCurrent2, () => orderAcceptedCurrent2.Start(), brigadir1.Id);
        SubmitOrderForReview(orderAcceptedCurrent2, brigadeMasons, 80m, today.AddDays(-2), [(wMasonPiecework, 100m)]);
        Transition(orderAcceptedCurrent2, () => orderAcceptedCurrent2.Accept(today), prorab1.Id);

        // Accepted then manually Closed, completed in the previous (closed) period
        var orderClosedPrevious = AddOrder(objRoad, brigadeMasons, "Асфальтирование участка №1", "м2", 1000m, 45m, previousPeriodStart.AddDays(10));
        Transition(orderClosedPrevious, () => orderClosedPrevious.Assign(previousPeriodStart.AddDays(-3)), prorab2.Id);
        Transition(orderClosedPrevious, () => orderClosedPrevious.Start(), brigadir1.Id);
        SubmitOrderForReview(orderClosedPrevious, brigadeMasons, 1000m, previousPeriodStart.AddDays(3), [(wMasonPiecework, 100m)]);
        Transition(orderClosedPrevious, () => orderClosedPrevious.Accept(previousPeriodStart.AddDays(5)), prorab2.Id);
        Transition(orderClosedPrevious, () => orderClosedPrevious.Close(), prorab2.Id);

        // Accepted, completed in the previous (closed) period
        var orderAcceptedPrevious = AddOrder(objSchool, brigadeFinishers, "Покраска фасада школы", "м2", 600m, 55m, previousPeriodEnd.AddDays(-5));
        Transition(orderAcceptedPrevious, () => orderAcceptedPrevious.Assign(previousPeriodStart.AddDays(-2)), prorab2.Id);
        Transition(orderAcceptedPrevious, () => orderAcceptedPrevious.Start(), brigadir3.Id);
        SubmitOrderForReview(orderAcceptedPrevious, brigadeFinishers, 600m, previousPeriodEnd.AddDays(-8), [(wFinPiecework3, 100m)]);
        Transition(orderAcceptedPrevious, () => orderAcceptedPrevious.Accept(previousPeriodEnd.AddDays(-2)), prorab2.Id);

        // Rejected
        var orderRejected = AddOrder(objWarehouse, brigadeElectric, "Монтаж вентиляции склада", "точка", 30m, 300m, today.AddDays(-10));
        Transition(orderRejected, () => orderRejected.Assign(today.AddDays(-16)), prorab2.Id);
        Transition(orderRejected, () => orderRejected.Start(), brigadir2.Id);
        SubmitOrderForReview(orderRejected, brigadeElectric, 30m, today.AddDays(-11), [(wElecPiecework1, 100m)]);
        Transition(orderRejected, () => orderRejected.Reject(), prorab2.Id, "Не выполнены нормы по вентканалам, требуется переделка.");

        // Rejected -> Rework -> back to InProgress
        var orderReworked = AddOrder(objClinic, brigadeElectric, "Слаботочные системы", "точка", 40m, 400m, today.AddDays(12));
        Transition(orderReworked, () => orderReworked.Assign(today.AddDays(-5)), prorab1.Id);
        Transition(orderReworked, () => orderReworked.Start(), brigadir2.Id);
        SubmitOrderForReview(orderReworked, brigadeElectric, 40m, today.AddDays(-2), [(wElecPiecework2, 100m)]);
        Transition(orderReworked, () => orderReworked.Reject(), prorab1.Id, "Неполный комплект исполнительной документации.");
        Transition(orderReworked, () => orderReworked.Rework(), brigadir2.Id);

        // ---- Timesheets: several recent days, some late, most approved -----
        var homeObjectByBrigade = new Dictionary<Guid, ConstructionObject>
        {
            [brigadeMasons.Id] = objClinic,
            [brigadeElectric.Id] = objBusinessCenter,
            [brigadeFinishers.Id] = objSchool
        };
        var timesheetsByWorker = new Dictionary<Guid, List<Timesheet>>();

        for (var wi = 0; wi < allWorkers.Count; wi++)
        {
            var worker = allWorkers[wi];
            var homeObject = homeObjectByBrigade[worker.BrigadeId];
            var list = new List<Timesheet>();
            timesheetsByWorker[worker.Id] = list;

            for (var di = 1; di <= 5; di++)
            {
                var date = today.AddDays(-di);
                var plannedStart = businessTime.GetBusinessDateTimeUtc(date, worker.ShiftStartTime!.Value);
                var isLate = (wi + di) % 5 == 0;
                var checkInAt = isLate
                    ? plannedStart.AddMinutes(15 + (wi + di) % 3 * 10)
                    : plannedStart.AddMinutes(-((wi + di) % 3));
                var hoursWorked = 8 + (wi + di) % 2 * 0.5;

                var timesheet = Timesheet.Create(companyId, worker.Id, homeObject.Id, date, worker.ShiftStartTime, enteredManually: true);
                timesheet.CheckIn(checkInAt, company.LatenessGraceMinutes, plannedStart);
                timesheet.CheckOut(checkInAt.AddHours(hoursWorked));

                // Leave the most recent day unreviewed — realistic "Prorab
                // hasn't gotten to today's attendance yet".
                if (di != 1)
                    timesheet.Approve(prorabIdByObjectId[homeObject.Id], checkInAt.AddHours(hoursWorked).AddHours(1));

                context.Timesheets.Add(timesheet);
                list.Add(timesheet);
            }
        }

        // ---- Materials: requests across every status, deliveries, usage ---
        MaterialRequest AddMaterialRequest(ConstructionObject obj, Brigade brigade, string materialName, string unit, decimal qty, DateTimeOffset requestedAt)
        {
            var request = MaterialRequest.Create(companyId, obj.Id, brigade.Id, brigadirIdByBrigade[brigade.Id], materialName, unit, qty, requestedAt);
            context.MaterialRequests.Add(request);
            return request;
        }

        AddMaterialRequest(objResidential, brigadeFinishers, "Плитка керамическая", "м2", 200m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-1), new TimeOnly(9, 30)));

        var mrApproved = AddMaterialRequest(objBusinessCenter, brigadeElectric, "Кабель ВВГ 3х2.5", "м", 1500m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-4), new TimeOnly(11, 0)));
        Ensure(mrApproved.Approve(prorab1.Id, businessTime.GetBusinessDateTimeUtc(today.AddDays(-3), new TimeOnly(14, 0))));

        var mrOrdered = AddMaterialRequest(objRoad, brigadeMasons, "Щебень фракции 20-40", "м3", 300m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-5), new TimeOnly(8, 30)));
        Ensure(mrOrdered.Approve(prorab2.Id, businessTime.GetBusinessDateTimeUtc(today.AddDays(-4), new TimeOnly(10, 0))));
        Ensure(mrOrdered.MarkOrdered());

        var mrPartial = AddMaterialRequest(objWarehouse, brigadeElectric, "Кабель-канал 40х25", "м", 600m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-7), new TimeOnly(9, 0)));
        Ensure(mrPartial.Approve(prorab2.Id, businessTime.GetBusinessDateTimeUtc(today.AddDays(-6), new TimeOnly(9, 0))));
        Ensure(mrPartial.MarkOrdered());
        var partialDeliveredAt = businessTime.GetBusinessDateTimeUtc(today.AddDays(-2), new TimeOnly(13, 0));
        Ensure(mrPartial.RecordDelivery(350m, partialDeliveredAt));
        context.MaterialDeliveries.Add(MaterialDelivery.Create(
            companyId, objWarehouse.Id, "Кабель-канал 40х25", "м", 350m, 18m, partialDeliveredAt, mrPartial.Id, "ООО «ЭлектроСнаб»"));

        var mrDelivered = AddMaterialRequest(objClinic, brigadeFinishers, "Краска водоэмульсионная", "л", 400m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-9), new TimeOnly(10, 30)));
        Ensure(mrDelivered.Approve(prorab1.Id, businessTime.GetBusinessDateTimeUtc(today.AddDays(-8), new TimeOnly(11, 0))));
        Ensure(mrDelivered.MarkOrdered());
        var deliveredAt = businessTime.GetBusinessDateTimeUtc(today.AddDays(-3), new TimeOnly(15, 0));
        Ensure(mrDelivered.RecordDelivery(400m, deliveredAt));
        context.MaterialDeliveries.Add(MaterialDelivery.Create(
            companyId, objClinic.Id, "Краска водоэмульсионная", "л", 400m, 12m, deliveredAt, mrDelivered.Id, "ООО «СтройМатериалы»"));

        var mrRejected = AddMaterialRequest(objBusinessCenter, brigadeMasons, "Кирпич облицовочный", "шт", 5000m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-10), new TimeOnly(9, 0)));
        Ensure(mrRejected.Reject());

        var mrForceClosed = AddMaterialRequest(objSchool, brigadeFinishers, "Гипсокартон 12.5мм", "лист", 300m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-12), new TimeOnly(9, 0)));
        Ensure(mrForceClosed.Approve(prorab2.Id, businessTime.GetBusinessDateTimeUtc(today.AddDays(-11), new TimeOnly(10, 0))));
        Ensure(mrForceClosed.MarkOrdered());
        var forceDeliveredAt = businessTime.GetBusinessDateTimeUtc(today.AddDays(-5), new TimeOnly(12, 0));
        Ensure(mrForceClosed.RecordDelivery(220m, forceDeliveredAt));
        context.MaterialDeliveries.Add(MaterialDelivery.Create(
            companyId, objSchool.Id, "Гипсокартон 12.5мм", "лист", 220m, 45m, forceDeliveredAt, mrForceClosed.Id, "ООО «СтройМатериалы»"));
        Ensure(mrForceClosed.ForceDeliver("Остаток снят с заявки — поставщик прекратил поставку партии, закрыто вручную Прорабом."));

        context.MaterialDeliveries.Add(MaterialDelivery.Create(
            companyId, objWarehouse.Id, "Цемент М400", "мешок", 200m, 55m,
            businessTime.GetBusinessDateTimeUtc(today.AddDays(-6), new TimeOnly(8, 0)), supplierName: "ООО «БетонСнаб»"));

        context.MaterialConsumptionReports.Add(MaterialConsumptionReport.Create(
            companyId, objClinic.Id, brigadeFinishers.Id, brigadir3.Id, today.AddDays(-3), "Краска водоэмульсионная", "л", 180m, 0m));
        context.MaterialConsumptionReports.Add(MaterialConsumptionReport.Create(
            companyId, objRoad.Id, brigadeMasons.Id, brigadir1.Id, today.AddDays(-4), "Щебень фракции 20-40", "м3", 210m, 15m,
            "Недостача при доставке, зафиксирована актом."));
        context.MaterialConsumptionReports.Add(MaterialConsumptionReport.Create(
            companyId, objWarehouse.Id, brigadeElectric.Id, brigadir2.Id, today.AddDays(-2), "Кабель-канал 40х25", "м", 300m, 0m));
        context.MaterialConsumptionReports.Add(MaterialConsumptionReport.Create(
            companyId, objWarehouse.Id, brigadeMasons.Id, brigadir1.Id, today.AddDays(-1), "Цемент М400", "мешок", 150m, 0m));

        // ---- Payroll: previous (closed) period Paid, current period mixed --
        var advancesByWorker = new Dictionary<Guid, List<PayrollAdvance>>();

        PayrollAdvance AddAdvance(Worker worker, decimal amount, DateTimeOffset issuedAt, string? note)
        {
            var advance = PayrollAdvance.Create(companyId, worker.Id, amount, issuedAt, accountant.Id, note);
            context.PayrollAdvances.Add(advance);
            if (!advancesByWorker.TryGetValue(worker.Id, out var list))
                advancesByWorker[worker.Id] = list = [];
            list.Add(advance);
            return advance;
        }

        AddAdvance(allWorkers[0], 500m, businessTime.GetBusinessDateTimeUtc(previousPeriodStart.AddDays(6), new TimeOnly(12, 0)), "Аванс на личные нужды");
        AddAdvance(allWorkers[7], 400m, businessTime.GetBusinessDateTimeUtc(previousPeriodStart.AddDays(9), new TimeOnly(12, 0)), "Аванс на личные нужды");
        AddAdvance(allWorkers[12], 350m, businessTime.GetBusinessDateTimeUtc(previousPeriodStart.AddDays(12), new TimeOnly(12, 0)), null);
        AddAdvance(allWorkers[2], 600m, businessTime.GetBusinessDateTimeUtc(previousPeriodEnd.AddDays(-3), new TimeOnly(12, 0)), "Аванс перед праздником");

        // MASTER §8.0: Hourly = approved Timesheet.HoursWorked x PayRate.
        decimal HourlyAmountFor(Worker worker, DateOnly periodStart, DateOnly periodEnd) =>
            timesheetsByWorker.TryGetValue(worker.Id, out var list)
                ? list.Where(t => t.Date >= periodStart && t.Date <= periodEnd && t.ApprovedAt is not null && t.HoursWorked is not null)
                      .Sum(t => t.HoursWorked!.Value * worker.PayRate)
                : 0m;

        // MASTER §8.0: Piecework = approved WorkOrderPayoutShare.Amount for
        // orders Accepted/Closed with CompletedDate inside the period.
        decimal PieceworkAmountFor(Worker worker, DateOnly periodStart, DateOnly periodEnd) =>
            payoutShares
                .Where(s => s.WorkerId == worker.Id && s.Amount is not null)
                .Join(workOrders, s => s.WorkOrderId, o => o.Id, (s, o) => (Share: s, Order: o))
                .Where(x => x.Order.Status is WorkOrderStatus.Accepted or WorkOrderStatus.Closed
                            && x.Order.CompletedDate is { } completedDate
                            && completedDate >= periodStart && completedDate <= periodEnd)
                .Sum(x => x.Share.Amount!.Value);

        // MASTER §8.1: Σ LateMinutes (approved) x (PayRate / 60).
        decimal LatenessAmountFor(Worker worker, DateOnly periodStart, DateOnly periodEnd)
        {
            var lateMinutes = timesheetsByWorker.TryGetValue(worker.Id, out var list)
                ? list.Where(t => t.Date >= periodStart && t.Date <= periodEnd && t.ApprovedAt is not null && t.LateMinutes is not null)
                      .Sum(t => t.LateMinutes!.Value)
                : 0;
            return Math.Round(lateMinutes * (worker.PayRate / 60m), 2, MidpointRounding.AwayFromZero);
        }

        // MASTER §8.8: Σ unsettled PayrollAdvance.Amount issued on/before PeriodEnd.
        decimal AdvanceAmountFor(Worker worker, DateOnly periodEnd)
        {
            var boundary = new DateTimeOffset(periodEnd, TimeOnly.MaxValue, TimeSpan.Zero);
            return advancesByWorker.TryGetValue(worker.Id, out var list)
                ? list.Where(a => a.SettledInPayrollEntryId is null && a.IssuedAt <= boundary).Sum(a => a.Amount)
                : 0m;
        }

        PayrollEntry CreateDraftEntry(Worker worker, DateOnly periodStart, DateOnly periodEnd)
        {
            var calculatedAmount = HourlyAmountFor(worker, periodStart, periodEnd) + PieceworkAmountFor(worker, periodStart, periodEnd);
            var latenessAmount = LatenessAmountFor(worker, periodStart, periodEnd);
            var advanceAmount = AdvanceAmountFor(worker, periodEnd);

            var entry = PayrollEntry.Create(companyId, worker.Id, periodStart, periodEnd);
            Ensure(entry.UpdateDraft(calculatedAmount, latenessAmount, 0m, advanceAmount));
            context.PayrollEntries.Add(entry);
            return entry;
        }

        // Same bookkeeping as ApprovePayrollEntryCommandHandler: every
        // advance counted in AdvanceDeductedAmount gets stamped as settled.
        void SettleAdvances(Worker worker, PayrollEntry entry, DateOnly periodEnd)
        {
            if (!advancesByWorker.TryGetValue(worker.Id, out var list))
                return;
            var boundary = new DateTimeOffset(periodEnd, TimeOnly.MaxValue, TimeSpan.Zero);
            foreach (var advance in list.Where(a => a.SettledInPayrollEntryId is null && a.IssuedAt <= boundary))
                advance.Settle(entry.Id);
        }

        // Previous (closed) period: Approved for everyone, Paid for most —
        // same audit write PayPayrollEntryCommandHandler makes.
        var paidAt = businessTime.GetBusinessDateTimeUtc(previousPeriodEnd.AddDays(3), new TimeOnly(15, 0));
        for (var i = 0; i < allWorkers.Count; i++)
        {
            var worker = allWorkers[i];
            var entry = CreateDraftEntry(worker, previousPeriodStart, previousPeriodEnd);
            Ensure(entry.Approve());
            SettleAdvances(worker, entry, previousPeriodEnd);

            if (i % 6 != 5)
            {
                Ensure(entry.Pay(paidAt));
                context.AdminAuditLogs.Add(AdminAuditLog.Create(
                    companyId, accountant.Id, AdminAuditAction.PayrollPaid, nameof(PayrollEntry), entry.Id, paidAt,
                    newValueJson: $"{{\"value\":\"{entry.FinalAmount}\"}}"));
            }
        }

        // Current (open) period: Draft / Draft+Adjusted / Approved mix.
        for (var i = 0; i < allWorkers.Count; i++)
        {
            var worker = allWorkers[i];
            var entry = CreateDraftEntry(worker, currentPeriodStart, currentPeriodEnd);

            switch (i % 3)
            {
                case 1:
                    Ensure(entry.Adjust(50m, "Премия за качественную работу по итогам месяца."));
                    break;
                case 2:
                    Ensure(entry.Approve());
                    SettleAdvances(worker, entry, currentPeriodEnd);
                    break;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }
}
